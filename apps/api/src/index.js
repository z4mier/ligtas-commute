import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

if (typeof globalThis.fetch !== "function") {
  const { default: nodeFetch } = await import("node-fetch");
  globalThis.fetch = nodeFetch;
}

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import mapsRouter from "../routes/maps.js";
import adminDriversRouter from "../routes/admin.drivers.js";
import driversRouter from "../routes/drivers.js";
import usersRouter from "../routes/users.js";

const app = express();
const prisma = new PrismaClient();

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

// Helpers
const sign = (u) =>
  jwt.sign({ sub: u.id, role: u.role, email: u.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

function cryptoRandom() {
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
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

// OTP
const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function setOtp(email) {
  const code = generateOtp();
  const now = Date.now();
  otpStore.set(email, { code, expiresAt: now + OTP_TTL_MS, lastSentAt: now });
  return code;
}

async function nextSequence(tx, name) {
  const seq = await tx.sequence.upsert({
    where: { name },
    update: { current: { increment: 1 } },
    create: { name, current: 1 },
    select: { current: true },
  });
  return seq.current;
}
function formatDriverIdNo(n) {
  const y = new Date().getFullYear();
  return `DRV-${y}-${String(n).padStart(6, "0")}`;
}

// Health
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

app.use("/maps", mapsRouter);
app.use("/admin", adminDriversRouter);
app.use("/drivers", driversRouter);
app.use("/users", usersRouter);

// Auth
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

// User register
app.post("/auth/register", async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      phone: z.string().min(6),
      password: z.string().min(6),
      role: z.enum(["COMMUTER", "DRIVER"]).optional(),
      fullName: z.string().min(1, "Full name required"),
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

// Buses

app.get("/buses", requireAuth, requireAdmin, async (req, res) => {
  const { type, active } = req.query;
  const where = {
    ...(type ? { busType: String(type).toUpperCase() } : {}),
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

app.get(
  "/buses/by-number/:number",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    // number is not unique in the schema; use findFirst
    const bus = await prisma.bus.findFirst({
      where: { number: req.params.number },
    });
    if (!bus) return res.status(404).json({ message: "Bus not found" });
    res.json(bus);
  }
);

app.post("/buses", requireAuth, requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      number: z.string().min(1),
      plate: z.string().min(1),
      type: z.enum(["AIRCON", "NON_AIRCON"]),
      isActive: z.boolean().optional(),
    });
    const input = schema.parse(req.body);
    const bus = await prisma.bus.create({
      data: {
        number: input.number,
        plate: input.plate,
        busType: input.type,
        isActive: input.isActive ?? true,
      },
    });
    res.status(201).json(bus);
  } catch (e) {
    if (e?.code === "P2002")
      return res
        .status(409)
        .json({ message: "Bus number or plate already exists" });
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
      type: z.enum(["AIRCON", "NON_AIRCON"]).optional(),
      isActive: z.boolean().optional(),
    });
    const input = schema.parse(req.body);

    const updateData = {
      ...(input.number !== undefined ? { number: input.number } : {}),
      ...(input.plate !== undefined ? { plate: input.plate } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.type !== undefined ? { busType: input.type } : {}),
    };

    const bus = await prisma.bus.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(bus);
  } catch (e) {
    if (e?.code === "P2025")
      return res.status(404).json({ message: "Bus not found" });
    if (e?.code === "P2002")
      return res
        .status(409)
        .json({ message: "Bus number or plate already exists" });
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

// Admin - Create Driver

app.post("/admin/create-driver", requireAuth, requireAdmin, async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    phone: z.string().min(6),
    password: z.string().min(6).optional(),
    fullName: z.string().min(1),
    licenseNo: z.string().min(1),
    birthDate: z.string().min(1),
    address: z.string().min(1),
    busId: z.string().optional(),
    busNo: z.string().optional(),
    plateNumber: z.string().optional(),
    vehicleType: z.enum(["AIRCON", "NON_AIRCON"]).optional(),
    route: z.string().optional(), // ignored (not in schema)
  });

  try {
    const input = schema.parse(req.body);
    const key = input.email.toLowerCase().trim();
    const birthDate = new Date(input.birthDate);
    const passwordHash = await bcrypt.hash(input.password || "driver123", 12);

    let bus = null;

    if (input.busId) {
      bus = await prisma.bus.findUnique({ where: { id: input.busId } });
    } else if (input.busNo) {
      bus = await prisma.bus.findFirst({ where: { number: input.busNo } });
    }

    if (!bus) {
      const normalizedPlate = (input.plateNumber || "")
        .replace(/\s+/g, "")
        .toUpperCase();

      if (!normalizedPlate && !input.busNo) {
        return res.status(400).json({
          message:
            "Provide busId or busNo, or plateNumber (+ vehicleType) to create a bus.",
        });
      }
      if (!bus && normalizedPlate) {
        if (!input.vehicleType) {
          return res
            .status(400)
            .json({ message: "vehicleType is required when creating a new bus." });
        }
        const newNumber = input.busNo || normalizedPlate; // ensure not null (schema requires String)
        bus = await prisma.bus.create({
          data: {
            number: newNumber,
            plate: normalizedPlate,
            busType: input.vehicleType,
            isActive: true,
          },
        });
      }
    }

    if (!bus)
      return res.status(400).json({ message: "Invalid bus selection." });
    if (!bus.isActive)
      return res.status(400).json({ message: "Selected bus is inactive." });

    const result = await prisma.$transaction(async (tx) => {
      // sequence kept, but not written to schema (safe to keep for now)
      await nextSequence(tx, "DRIVER");

      const user = await tx.user.create({
        data: {
          email: key,
          phone: input.phone,
          role: "DRIVER",
          password: passwordHash,
          mustChangePassword: true,
          status: "ACTIVE",
          driverProfile: {
            create: {
              fullName: input.fullName,
              licenseNo: input.licenseNo,
              birthDate,
              address: input.address,
              phone: input.phone ?? null,
              bus: { connect: { id: bus.id } },
              busType: bus.busType, // mirror current assigned bus type
              isActive: true,
              // createdAt auto
            },
          },
        },
        include: { driverProfile: { include: { bus: true } } },
      });

      return { user };
    });

    return res.json({
      message: "Driver created",
      defaultPassword: input.password ? undefined : "driver123",
      user: result.user,
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(400).json({ message: "Invalid input" });
    if (e?.code === "P2002")
      return res
        .status(409)
        .json({
          message: "Duplicate entry (email/phone/plate and/or other unique field)",
        });
    console.error("CREATE DRIVER ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

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

    res.json({
      id: me.id,
      email: me.email,
      phone: me.phone,
      role: me.role,
      status: me.status,

      fullName:
        me.driverProfile?.fullName ??
        me.commuterProfile?.fullName ??
        null,

      address:
        me.driverProfile?.address ??
        me.commuterProfile?.address ??
        null,

      language: me.commuterProfile?.language ?? null,
      points: me.commuterProfile?.points ?? 0,

      driver: me.driverProfile
        ? {
            isActive: me.driverProfile.isActive,
            busType: me.driverProfile.busType,
            bus: me.driverProfile.bus
              ? {
                  id: me.driverProfile.bus.id,
                  number: me.driverProfile.bus.number,
                  plate: me.driverProfile.bus.plate,
                  type: me.driverProfile.bus.busType, // keep API field name 'type'
                  isActive: me.driverProfile.bus.isActive,
                }
              : null,
          }
        : null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Server
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
