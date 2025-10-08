import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// ---------- helpers ----------
const sign = (u) =>
  jwt.sign({ sub: u.id, role: u.role, email: u.email || null }, JWT_SECRET, {
    expiresIn: "7d",
  });

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
  if (req.user?.role !== "ADMIN")
    return res.status(403).json({ message: "Admins only" });
  next();
}

// ---------- simple in-memory OTP store ----------
/** otpStore[email] = { code, expiresAt, lastSentAt } */
const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;          // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;  // 30 seconds

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function setOtp(email) {
  const code = generateOtp();
  const now = Date.now();
  otpStore.set(email, { code, expiresAt: now + OTP_TTL_MS, lastSentAt: now });
  return code;
}

// ---------- routes ----------
app.get("/", (_, res) => res.redirect("/health"));

app.get("/health", async (_, res) => {
  try {
    await prisma.user.count();
    res.json({ ok: true, env: { port: process.env.PORT || 4000, database: true } });
  } catch {
    res.json({ ok: false, env: { port: process.env.PORT || 4000, database: false } });
  }
});

// ---------- AUTH: Login ----------
app.post("/auth/login", async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });
    const { email, password } = schema.parse(req.body);

    const key = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: key } });
    if (!user || !user.password) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    res.json({ token: sign(user), role: user.role, mustChangePassword: user.mustChangePassword || false });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    console.error("LOGIN ERROR:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- AUTH: Register (public commuter signup) ----------
app.post("/auth/register", async (req, res) => {
  try {
    const schema = z.object({
      fullName: z.string().min(1, "Full name required"),
      email: z.string().email("Valid email required"),
      phone: z.string().min(6, "Phone required"),
      password: z.string().min(6, "Password must be at least 6 chars"),
      role: z.enum(["COMMUTER", "DRIVER"]).optional(),
    });

    const { fullName, email, phone, password, role } = schema.parse(req.body);
    const key = email.toLowerCase().trim();

    // prevent duplicates
    const dupe = await prisma.user.findFirst({
      where: { OR: [{ email: key }, { phone }] },
      select: { id: true },
    });
    if (dupe) return res.status(409).json({ message: "Email or phone already registered" });

    const hash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        fullName,
        email: key,
        phone,
        password: hash,
        role: role ?? "COMMUTER",
        mustChangePassword: false,
        status: "active",
      },
      select: { id: true, fullName: true, email: true, role: true },
    });

    // ✅ Only show OTP (no registered log)
    const code = setOtp(key);
    console.log(`🔢 OTP for ${key}: ${code}`);

    return res.status(201).json({ message: "Account created", user });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: e.errors[0]?.message || "Invalid input" });
    }
    if (e?.code === "P2002") {
      return res.status(409).json({ message: "Email already registered" });
    }
    console.error("REGISTER ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// ---------- OTP: request (resend) ----------
app.post("/auth/request-otp", async (req, res) => {
  try {
    const schema = z.object({ email: z.string().email() });
    const { email } = schema.parse(req.body);
    const key = email.toLowerCase().trim();

    // cooldown
    const existing = otpStore.get(key);
    const now = Date.now();
    if (existing && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
      const secs = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
      return res.status(429).json({ message: `Please wait ${secs}s before requesting again` });
    }

    const code = setOtp(key);
    console.log(`🔁 Resent OTP for ${key}: ${code}`);
    return res.json({ message: "OTP sent" });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid email" });
    console.error("REQUEST OTP ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// ---------- OTP: verify ----------
app.post("/auth/verify-otp", (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      code: z.string().min(4).max(6),
    });
    const { email, code } = schema.parse(req.body);
    const key = email.toLowerCase().trim();

    const record = otpStore.get(key);
    if (!record) return res.status(400).json({ message: "No OTP found. Please request again." });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ message: "OTP expired. Request a new one." });
    }
    if (record.code !== code.trim()) {
      return res.status(400).json({ message: "Invalid code" });
    }

    otpStore.delete(key);
    console.log(`✅ Verified OTP for ${key}`);
    return res.json({ message: "Verified successfully" });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    console.error("VERIFY OTP ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// ---------- ADMIN: Create Driver ----------
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
    if (isNaN(birthDate.getTime())) return res.status(400).json({ message: "Invalid birth date" });

    const passwordHash = await bcrypt.hash("driver123", 12);
    const qrToken = cryptoRandom();
    const key = input.email.toLowerCase().trim();

    const user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: key,
        phone: input.phone,
        role: "DRIVER",
        password: passwordHash,
        mustChangePassword: true,
        status: "active",
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
      include: { driverProfile: true },
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

// ---------- ADMIN: Get All Drivers ----------
app.get("/admin/drivers", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const drivers = await prisma.user.findMany({
      where: { role: "DRIVER" },
      include: { driverProfile: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(drivers);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch drivers" });
  }
});

// ---------- ADMIN: Delete Driver ----------
app.delete("/admin/drivers/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    try {
      await prisma.driverProfile.deleteMany({ where: { userId: id } });
    } catch {}
    await prisma.user.delete({ where: { id } });
    res.json({ message: "Driver deleted successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to delete driver" });
  }
});

// ---------- Convenience: Who am I ----------
app.get("/me", requireAuth, async (req, res) => {
  const me = await prisma.user.findUnique({
    where: { id: req.user.sub },
    include: { commuterProfile: true },
  });
  if (!me) return res.status(404).json({ message: "Not found" });

  res.json({
    id: me.id,
    fullName: me.fullName,
    email: me.email,
    phone: me.phone ?? null,
    role: me.role,
    mustChangePassword: me.mustChangePassword || false,
    createdAt: me.createdAt,
    points: me.commuterProfile?.points ?? 0,
    language: me.language ?? "en",
  });
});

// ---------- User self-update ----------
app.patch("/users/me", requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      fullName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(6).optional(),
      points: z.number().int().min(0).optional(),
    });
    const input = schema.parse(req.body);

    if (input.email) input.email = input.email.toLowerCase().trim();

    const user = await prisma.user.update({
      where: { id: req.user.sub },
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        ...(typeof input.points === "number" ? { points: input.points } : {}),
      },
      select: { id: true, fullName: true, email: true, phone: true },
    });

    res.json(user);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    if (e?.code === "P2002") return res.status(409).json({ message: "Email already in use" });
    console.error("UPDATE ME ERROR:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- USERS: Self Profile ----------
app.get("/users/me", requireAuth, async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { commuterProfile: true },
    });
    if (!me) return res.status(404).json({ message: "User not found" });

    res.json({
      id: me.id,
      fullName: me.fullName,
      email: me.email,
      phone: me.phone ?? "",
      address: me.address ?? "",
      createdAt: me.createdAt,
      points: me.commuterProfile?.points ?? 0,
      language: me.language ?? "en",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});


// ---------- start ----------
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";
const server = app.listen(PORT, HOST, () =>
  console.log(`✅ API running on http://${HOST}:${PORT}`)
);

// graceful shutdown
function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
