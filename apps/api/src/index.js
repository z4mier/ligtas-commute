// apps/api/src/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

dotenv.config();

// --- init ---
const app = express();
const prisma = new PrismaClient();

app.use(cors({ origin: true, credentials: true })); // friendlier for mobile dev
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// --- helpers ---
const sign = (u) =>
  jwt.sign({ sub: u.id, role: u.role, email: u.email }, JWT_SECRET, { expiresIn: "7d" });

function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

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

// --- routes ---
app.get("/health", (_, res) => res.json({ ok: true }));

// Login for any role (ADMIN / DRIVER / COMMUTER)
app.post("/auth/login", async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });
    const { email, password } = schema.parse(req.body);

    // use findUnique (email should be unique in your schema)
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      token: sign(user),
      role: user.role,
      mustChangePassword: user.mustChangePassword || false,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// Public: Register (defaults to COMMUTER)
app.post("/auth/register", async (req, res) => {
  try {
    const schema = z.object({
      fullName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(6),
      password: z.string().min(6),
      role: z.enum(["COMMUTER", "DRIVER"]).optional(), // driver only if you allow
    });
    const { fullName, email, phone, password, role } = schema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ message: "Email already registered" });

    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        password: hash,
        role: role ?? "COMMUTER",
        mustChangePassword: false,
      },
      select: { id: true, fullName: true, email: true, role: true },
    });

    return res.status(201).json({ message: "Account created", user });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    if (e?.code === "P2002") return res.status(409).json({ message: "Email already registered" });
    console.error("register error:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// ADMIN: Create driver (default password = driver123)
app.post("/admin/create-driver", requireAuth, requireAdmin, async (req, res) => {
  const schema = z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(6),
    licenseNo: z.string().min(1),
    birthDate: z.string().min(1),
    address: z.string().min(1),
    vehicleType: z.enum(["AIRCON", "NON_AIRCON"]),
    busNo: z.string().min(1),
    vehiclePlate: z.string().min(1),
    driverIdNo: z.string().min(1),
    route: z.string().min(1),
  });

  try {
    const input = schema.parse(req.body);

    const birthDate = new Date(input.birthDate);
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({ message: "Invalid birth date" });
    }

    const passwordHash = await bcrypt.hash("driver123", 12);
    const qrToken = cryptoRandom();

    const user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        role: "DRIVER",
        password: passwordHash,
        mustChangePassword: true,
        driverProfile: {
          create: {
            licenseNo: input.licenseNo,
            birthDate,
            address: input.address,
            vehicleType: input.vehicleType,
            busNo: input.busNo,
            vehiclePlate: input.vehiclePlate,
            driverIdNo: input.driverIdNo,
            route: input.route,
            qrToken,
          },
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        driverProfile: {
          select: {
            licenseNo: true,
            birthDate: true,
            address: true,
            vehicleType: true,
            busNo: true,
            vehiclePlate: true,
            driverIdNo: true,
            route: true,
            qrToken: true,
            status: true,
          },
        },
      },
    });

    return res.json({ message: "Driver account created (default password: driver123)", user });
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(400).json({ message: e.errors.map((x) => x.message).join(", ") });
    if (e?.code === "P2002") {
      const fields = Array.isArray(e?.meta?.target) ? e.meta.target.join(", ") : "field";
      return res.status(409).json({ message: `Duplicate ${fields}` });
    }
    console.error("create-driver error:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// Convenience: who am I
app.get("/me", requireAuth, async (req, res) => {
  const me = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: { id: true, fullName: true, email: true, role: true, mustChangePassword: true },
  });
  res.json(me);
});

// --- start ---
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";   // <— important
app.listen(PORT, HOST, () => console.log(`API running on http://${HOST}:${PORT}`));

