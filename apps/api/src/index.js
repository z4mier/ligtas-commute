// apps/api/src/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
dotenv.config();

if (typeof globalThis.fetch !== "function") {
  const { default: nodeFetch } = await import("node-fetch");
  globalThis.fetch = nodeFetch;
}

/* ---------- utils ---------- */
function abs(req, rel) {
  if (!rel) return null;
  if (/^https?:\/\//i.test(rel)) return rel;
  const base = `${req.protocol}://${req.get("host")}`;
  return `${base}${rel.startsWith("/") ? "" : "/"}${rel}`;
}

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

/* ✅ FIXED: routes are one level up from /src */
import mapsRouter from "../routes/maps.js";
import adminDriversRouter from "../routes/admin.drivers.js";
import driversRouter from "../routes/drivers.js";
import driverProfileRouter from "../routes/driver.profile.js";
import feedbackRoutes from "../routes/feedback.js";

const app = express();
const prisma = new PrismaClient();

/* ---------- app setup ---------- */
app.set("trust proxy", 1);
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const GOOGLE_PLACES_KEY =
  process.env.GOOGLE_PLACES_KEY || process.env.GOOGLE_DIRECTIONS_KEY || "";

/* ---------- auth helpers ---------- */
const sign = (u) =>
  jwt.sign({ sub: u.id, role: u.role, email: u.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

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

/* ---------- simple OTP store (dev) ---------- */
const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
function setOtp(email) {
  const code = generateOtp();
  const now = Date.now();
  otpStore.set(email, { code, expiresAt: now + OTP_TTL_MS, lastSentAt: now });
  return code;
}

/* ---------- health ---------- */
app.get("/health", async (_req, res) => {
  try {
    await prisma.user.count();
    res.json({
      ok: true,
      version: "build-v6",
      env: { port: PORT, database: true, googleKeyPresent: !!GOOGLE_PLACES_KEY },
    });
  } catch {
    res.json({
      ok: false,
      version: "build-v6",
      env: { port: PORT, database: false, googleKeyPresent: !!GOOGLE_PLACES_KEY },
    });
  }
});

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/* ---------- routers ---------- */
app.use("/maps", mapsRouter);
app.use("/drivers", requireAuth, driversRouter);
app.use("/driver", requireAuth, driverProfileRouter);
app.use("/admin", requireAuth, requireAdmin, adminDriversRouter);

/* ✅ Protect feedback so req.user is present */
app.use("/feedback", requireAuth, feedbackRoutes);

/* ---------- auth endpoints ---------- */
app.post("/auth/login", async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });
    const { email, password } = schema.parse(req.body);
    const key = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email: key } });
    if (!user || !user.password)
      return res.status(401).json({ message: "Invalid credentials" });

    if (String(user.status || "").toUpperCase() !== "ACTIVE") {
      return res.status(403).json({
        message: "Account not verified. Please complete OTP verification.",
        code: "NOT_ACTIVE",
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      token: sign(user),
      role: user.role,
      mustChangePassword: user.mustChangePassword || false,
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(400).json({ message: "Invalid input" });
    console.error("LOGIN ERROR:", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/auth/register", async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      phone: z.string().min(6),
      password: z.string().min(6),
      role: z.enum(["COMMUTER", "DRIVER"]).optional(),
      fullName: z.string().min(1),
      address: z.string().optional(),
      language: z.string().optional(),
    });
    const { email, phone, password, role, fullName, address, language } =
      schema.parse(req.body);
    const key = email.toLowerCase().trim();

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: key }, { phone }] },
      include: { commuterProfile: true },
    });

    if (existing) {
      const isActive = String(existing.status || "").toUpperCase() === "ACTIVE";
      if (isActive)
        return res
          .status(409)
          .json({ message: "Email or phone already registered" });

      const hash = await bcrypt.hash(password, 12);
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          email: key,
          phone,
          password: hash,
          role: role ?? existing.role ?? "COMMUTER",
          mustChangePassword: false,
          status: "PENDING_VERIFICATION",
          ...(role === "COMMUTER" || !role
            ? existing.commuterProfile
              ? {
                  commuterProfile: {
                    update: {
                      fullName,
                      address: address ?? existing.commuterProfile.address ?? null,
                      language:
                        language ?? existing.commuterProfile.language ?? "en",
                    },
                  },
                }
              : {
                  commuterProfile: {
                    create: {
                      fullName,
                      address: address || null,
                      language: language || "en",
                    },
                  },
                }
            : {}),
        },
      });

      const code = setOtp(key);
      console.log(`OTP (unverified existing) for ${key}: ${code}`);
      return res.status(200).json({
        code: "UNVERIFIED",
        message: "Account exists but unverified. OTP resent.",
        user: updated,
      });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: key,
        phone,
        password: hash,
        role: role ?? "COMMUTER",
        mustChangePassword: false,
        status: "PENDING_VERIFICATION",
        ...(role === "COMMUTER" || !role
          ? {
              commuterProfile: {
                create: {
                  fullName,
                  address: address || null,
                  language: language || "en",
                },
              },
            }
          : {}),
      },
      include: { commuterProfile: true },
    });

    const code = setOtp(key);
    console.log(`OTP for ${key}: ${code}`);
    res.status(201).json({ message: "Registered. OTP sent.", user });
  } catch (e) {
    if (e instanceof z.ZodError)
      return res
        .status(400)
        .json({ message: e.errors[0]?.message || "Invalid input" });
    if (e?.code === "P2002")
      return res
        .status(409)
        .json({ message: "Email or phone already registered" });
    console.error("REGISTER ERROR:", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/auth/request-otp", async (req, res) => {
  try {
    const schema = z.object({ email: z.string().email() });
    const { email } = schema.parse(req.body);
    const key = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: key },
      select: { id: true, status: true },
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const existing = otpStore.get(key);
    const now = Date.now();
    if (existing && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
      const secs = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000
      );
      return res
        .status(429)
        .json({ message: `Please wait ${secs}s before requesting again` });
    }

    const code = setOtp(key);
    console.log(`[request-otp] Resent OTP for ${key}: ${code}`);
    return res.json({
      message: "OTP sent",
      otp: process.env.NODE_ENV !== "production" ? code : undefined,
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(400).json({ message: "Invalid email" });
    console.error("REQUEST OTP ERROR:", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/auth/verify-otp", async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      code: z.string().length(6),
    });
    const { email, code } = schema.parse(req.body);
    const key = email.toLowerCase().trim();

    const record = otpStore.get(key);
    if (!record)
      return res.status(400).json({ message: "No OTP found. Please request again." });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ message: "OTP expired. Request again." });
    }
    if (record.code !== code.trim())
      return res.status(400).json({ message: "Invalid code" });

    otpStore.delete(key);
    const user = await prisma.user.update({
      where: { email: key },
      data: { status: "ACTIVE" },
    });

    const token = sign(user);
    console.log(`OTP verified for ${key}`);
    res.json({ token, user });
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(400).json({ message: "Invalid input" });
    console.error("VERIFY OTP ERROR:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------- buses (admin) ---------- */
app.get("/buses", requireAuth, requireAdmin, async (req, res) => {
  const { busType, active } = req.query;
  const where = {
    ...(busType ? { busType: String(busType).toUpperCase() } : {}),
    ...(active != null ? { isActive: String(active) === "true" } : {}),
  };
  const buses = await prisma.bus.findMany({
    where,
    orderBy: [{ busType: "asc" }, { number: "asc" }],
  });
  res.json(buses);
});

app.get("/buses/:id", requireAuth, requireAdmin, async (req, res) => {
  const bus = await prisma.bus.findUnique({ where: { id: req.params.id } });
  if (!bus) return res.status(404).json({ message: "Bus not found" });
  res.json(bus);
});

app.get("/buses/by-number/:number", requireAuth, requireAdmin, async (req, res) => {
  const bus = await prisma.bus.findFirst({
    where: { number: req.params.number },
  });
  if (!bus) return res.status(404).json({ message: "Bus not found" });
  res.json(bus);
});

app.post("/buses", requireAuth, requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      number: z.string().min(1),
      plate: z.string().min(1),
      busType: z.enum(["AIRCON", "NON_AIRCON"]),
      isActive: z.boolean().optional(),
    });
    const input = schema.parse(req.body);
    const bus = await prisma.bus.create({ data: input });
    res.status(201).json(bus);
  } catch (e) {
    if (e?.code === "P2002")
      return res.status(409).json({ message: "Bus number or plate already exists" });
    if (e instanceof z.ZodError)
      return res.status(400).json({ message: "Invalid input" });
    console.error("CREATE BUS ERROR:", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/buses/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      number: z.string().min(1).optional(),
      plate: z.string().min(1).optional(),
      busType: z.enum(["AIRCON", "NON_AIRCON"]).optional(),
      isActive: z.boolean().optional(),
    });
    const input = schema.parse(req.body);
    const bus = await prisma.bus.update({
      where: { id: req.params.id },
      data: input,
    });
    res.json(bus);
  } catch (e) {
    if (e?.code === "P2025")
      return res.status(404).json({ message: "Bus not found" });
    if (e?.code === "P2002")
      return res.status(409).json({ message: "Bus number or plate already exists" });
    if (e instanceof z.ZodError)
      return res.status(400).json({ message: "Invalid input" });
    console.error("UPDATE BUS ERROR:", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/buses/:id", requireAuth, requireAdmin, async (req, res) => {
  const soft = String(req.query.soft || "true") === "true";
  try {
    if (soft) {
      const bus = await prisma.bus.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });
      return res.json({ message: "Bus deactivated", bus });
    }
    await prisma.bus.delete({ where: { id: req.params.id } });
    res.json({ message: "Bus deleted" });
  } catch (e) {
    if (e?.code === "P2025")
      return res.status(404).json({ message: "Bus not found" });
    console.error("DELETE BUS ERROR:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------- user profile ---------- */
app.get("/users/me", requireAuth, async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: {
        commuterProfile: true,
        driverProfile: { include: { bus: true } },
      },
    });
    if (!me) return res.status(404).json({ message: "User not found" });

    const contacts = await prisma.emergencyContact.findMany({
      where: { userId: me.id },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: { name: true, phone: true, relation: true, priority: true },
    });

    const commuter = me.commuterProfile;
    res.json({
      id: me.id,
      email: me.email,
      phone: me.phone,
      role: me.role,
      status: me.status,
      fullName: me.driverProfile?.fullName ?? commuter?.fullName ?? null,
      address: me.driverProfile?.address ?? commuter?.address ?? null,
      language: commuter?.language ?? "en",
      profileUrl: commuter?.profileUrl ? abs(req, commuter.profileUrl) : null,
      emergencyContacts: contacts,
      driver: me.driverProfile
        ? {
            bus: me.driverProfile.bus
              ? {
                  id: me.driverProfile.bus.id,
                  number: me.driverProfile.bus.number,
                  plate: me.driverProfile.bus.plate,
                  type: me.driverProfile.bus.busType,
                  isActive: me.driverProfile.bus.isActive,
                }
              : null,
          }
        : null,
    });
  } catch (e) {
    console.error("GET /users/me ERROR:", e);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

app.patch("/users/me", requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      fullName: z.string().min(1).optional(),
      phone: z.string().min(6).optional(),
      address: z.string().optional(),
      language: z.string().optional(),
      profileUrl: z.string().optional(),
      emergencyContacts: z
        .array(
          z.object({
            name: z.string().min(1),
            phone: z.string().min(6),
            relation: z.string().optional().nullable(),
            priority: z.number().int().min(0).max(2).optional(),
          })
        )
        .max(3)
        .optional(),
    });

    const input = schema.parse(req.body);
    const userId = req.user.sub;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { commuterProfile: true, driverProfile: true },
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (input.phone) {
      await prisma.user.update({
        where: { id: userId },
        data: { phone: input.phone },
      });
    }

    const commuter =
      user.commuterProfile ??
      (await prisma.commuterProfile.create({
        data: {
          userId,
          fullName:
            input.fullName ?? user.driverProfile?.fullName ?? "Commuter",
          address: input.address ?? null,
          language: input.language ?? "en",
          profileUrl: input.profileUrl ?? null,
        },
      }));

    if (user.commuterProfile) {
      await prisma.commuterProfile.update({
        where: { id: commuter.id },
        data: {
          ...(input.fullName ? { fullName: input.fullName } : {}),
          ...(input.address !== undefined ? { address: input.address ?? null } : {}),
          ...(input.language ? { language: input.language } : {}),
          ...(input.profileUrl !== undefined ? { profileUrl: input.profileUrl ?? null } : {}),
        },
      });
    }

    if (input.emergencyContacts) {
      const payload = input.emergencyContacts
        .slice(0, 3)
        .map((c, i) => ({
          userId,
          name: c.name,
          phone: c.phone,
          relation: c.relation ?? null,
          priority: c.priority ?? i,
        }));

      await prisma.$transaction([
        prisma.emergencyContact.deleteMany({ where: { userId } }),
        prisma.emergencyContact.createMany({ data: payload }),
      ]);
    }

    const contacts = await prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: { name: true, phone: true, relation: true, priority: true },
    });

    return res.json({
      message: "Profile updated successfully",
      emergencyContacts: contacts,
    });
  } catch (e) {
    console.error("PATCH /users/me ERROR:", e);
    if (e instanceof z.ZodError)
      return res
        .status(400)
        .json({ message: e.errors[0]?.message || "Invalid input" });
    if (e?.code === "P2002")
      return res
        .status(409)
        .json({ message: "Duplicate entry (phone/priority per user)" });
    res.status(500).json({ message: "Server error" });
  }
});

app.patch("/users/change-password", requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(6),
      newPassword: z.string().min(6),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user || !user.password)
      return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, mustChangePassword: false },
    });
    res.json({ message: "Password updated" });
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(400).json({ message: "Invalid input" });
    console.error("CHANGE PASSWORD ERROR:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------- start/shutdown ---------- */
const server = app.listen(PORT, HOST, () =>
  console.log(`API running on http://${HOST}:${PORT}`)
);

function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
