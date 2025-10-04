import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";                   // ✅ use bcryptjs (matches package.json)
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors());                                 // (optionally add origin: "http://localhost:3000")
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const sign = (u) =>
  jwt.sign({ sub: u.id, role: u.role, email: u.email || null }, JWT_SECRET, { expiresIn: "7d" });

// ---------- Auth middleware ----------
function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") return res.status(403).json({ message: "Admins only" });
  next();
}

// ---------- Helpers ----------
function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
function handlePrismaError(e, res) {
  if (e?.code === "P2002") {
    const fields = Array.isArray(e?.meta?.target) ? e.meta.target.join(", ") : "field";
    return res.status(409).json({ message: `Duplicate ${fields}` });
  }
  console.error(e);
  return res.status(500).json({ message: "Server error" });
}

// ---------- Routes ----------
app.get("/health", (_, res) => res.json({ ok: true }));

// Commuter self-signup
app.post("/auth/signup", async (req, res) => {
  try {
    const schema = z.object({
      fullName: z.string().min(1, "Full name is required"),
      email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
      phone: z.string().min(6).optional().or(z.literal("").transform(() => undefined)),
      password: z.string().min(6, "Password must be at least 6 chars"),
    });
    const { fullName, email, phone, password } = schema.parse(req.body);

    const hash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        fullName,
        email: email ? email.toLowerCase() : null,         // ✅ lowercase
        phone: phone || null,
        password: hash,
        role: "COMMUTER",
        commuterProfile: { create: {} },
      },
    });

    res.json({ token: sign(user), role: user.role, mustChangePassword: !!user.mustChangePassword });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: e.flatten().fieldErrors });
    return handlePrismaError(e, res);
  }
});

// Login (any role with password)
app.post("/auth/login", async (req, res) => {
  try {
    const schema = z
      .object({
        email: z.string().email().optional(),
        phone: z.string().min(6).optional(),
        password: z.string().min(1),                       // allow temp passwords like "driver123"
      })
      .refine((v) => v.email || v.phone, { message: "Email or phone is required" });

    const { email, phone, password } = schema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email ? email.toLowerCase() : undefined },  // ✅ lowercase
          { phone: phone || undefined },
        ],
      },
    });

    if (!user || !user.password) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    // ✅ Do not block on mustChangePassword; return it so client can handle flow
    res.json({ token: sign(user), role: user.role, mustChangePassword: !!user.mustChangePassword });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: e.flatten().fieldErrors });
    return res.status(500).json({ message: "Server error" });
  }
});

// Change password (for first login or later)
app.post("/auth/change-password", requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user || !user.password) return res.status(401).json({ message: "Unauthorized" });

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(401).json({ message: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, mustChangePassword: false },
    });

    res.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: e.flatten().fieldErrors });
    return res.status(500).json({ message: "Server error" });
  }
});

// Admin-only: create driver with default password "driver123"
app.post("/admin/create-driver", requireAuth, requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      fullName: z.string().min(1),
      email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
      phone: z.string().min(6).optional().or(z.literal("").transform(() => undefined)),
      licenseNo: z.string().min(3),
    });
    const { fullName, email, phone, licenseNo } = schema.parse(req.body);

    const defaultPasswordHash = await bcrypt.hash("driver123", 12);
    const qrToken = cryptoRandom();

    const user = await prisma.user.create({
      data: {
        fullName,
        email: email ? email.toLowerCase() : null,          // ✅ lowercase
        phone: phone || null,
        role: "DRIVER",
        password: defaultPasswordHash,
        mustChangePassword: true,
        driverProfile: { create: { licenseNo, qrToken } },  // (add more fields if your schema requires)
      },
    });

    res.json({
      message: "Driver account created with default password 'driver123'",
      user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role },
      qrToken,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: e.flatten().fieldErrors });
    return handlePrismaError(e, res);
  }
});

// Admin list drivers
app.get("/admin/drivers", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const drivers = await prisma.user.findMany({
      where: { role: "DRIVER" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        mustChangePassword: true,
        driverProfile: { select: { licenseNo: true, qrToken: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ drivers });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
});

// ---------- Start ----------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
