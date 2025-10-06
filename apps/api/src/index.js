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
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2)
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

// ---------- routes ----------
app.get("/", (_, res) => res.redirect("/health"));

// health check
app.get("/health", async (_, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      ok: true,
      env: { port: process.env.PORT || 4000, database: true },
    });
  } catch {
    res.json({
      ok: false,
      env: { port: process.env.PORT || 4000, database: false },
    });
  }
});

// ---------- AUTH ----------
app.post("/auth/login", async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });
    const { email, password } = schema.parse(req.body);

    // Prefer findUnique if email is unique in schema
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password)
      return res.status(401).json({ message: "Invalid credentials" });

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
      role: z.enum(["COMMUTER", "DRIVER"]).optional(), // allow DRIVER only if you want
    });
    const { fullName, email, phone, password, role } = schema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists)
      return res.status(409).json({ message: "Email already registered" });

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
    if (e instanceof z.ZodError)
      return res.status(400).json({ message: "Invalid input" });
    if (e && e.code === "P2002")
      return res.status(409).json({ message: "Email already registered" });
    console.error("register error:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// ---------- ADMIN: Create Driver (default password: driver123) ----------
app.post("/admin/create-driver", requireAuth, requireAdmin, async (req, res) => {
  const schema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(6, "Phone is too short"),
    licenseNo: z.string().min(1, "License No is required"),
    birthDate: z.string().min(1, "Birth date is required"),
    address: z.string().min(1, "Address is required"),
    vehicleType: z.enum(["AIRCON", "NON_AIRCON"]),
    busNo: z.string().min(1, "Bus number is required"),
    vehiclePlate: z.string().min(1, "Plate number is required"),
    driverIdNo: z.string().min(1, "Driver ID No is required"),
    route: z.string().min(1, "Route is required"),
  });

  try {
    const input = schema.parse(req.body);
    const birthDate = new Date(input.birthDate);
    if (isNaN(birthDate.getTime()))
      return res.status(400).json({ message: "Invalid birth date" });

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
      include: { driverProfile: true },
    });

    return res.json({
      message: "Driver account created (default password: driver123)",
      user,
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return res
        .status(400)
        .json({ message: e.errors.map((x) => x.message).join(", ") });
    if (e && e.code === "P2002") {
      const fields = Array.isArray(e?.meta?.target)
        ? e.meta.target.join(", ")
        : "field";
      return res.status(409).json({ message: `Duplicate ${fields}` });
    }
    console.error("create-driver error:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// ---------- ADMIN: Get All Drivers ----------
app.get("/admin/drivers", requireAuth, requireAdmin, async (req, res) => {
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
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    await prisma.driverProfile.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    res.json({ message: "Driver deleted successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to delete driver" });
  }
});

// ---------- ADMIN: Update Driver Status (PATCH) ----------
app.patch("/admin/drivers/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    if (!["active", "inactive"].includes(String(status)))
      return res.status(400).json({ message: "Invalid status" });

    const updated = await prisma.driverProfile.update({
      where: { userId: id },
      data: { status },
      include: { user: true },
    });

    return res.json({ message: "Status updated", status: updated.status });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to update status" });
  }
});

// ---------- ADMIN: Activate / Deactivate (POST shortcuts) ----------
app.post("/admin/drivers/:id/activate", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const updated = await prisma.driverProfile.update({
      where: { userId: id },
      data: { status: "active" },
    });

    return res.json({ message: "Driver activated", status: updated.status });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to activate" });
  }
});

app.post("/admin/drivers/:id/deactivate", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const updated = await prisma.driverProfile.update({
      where: { userId: id },
      data: { status: "inactive" },
    });

    return res.json({ message: "Driver deactivated", status: updated.status });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to deactivate" });
  }
});

// ---------- ADMIN: Get QR token for a driver ----------
app.get("/admin/drivers/:id/qr-token", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const profile = await prisma.driverProfile.findUnique({
      where: { userId: id },
      select: { qrToken: true },
    });
    if (!profile) return res.status(404).json({ message: "Driver not found" });

    res.json({ qrToken: profile.qrToken });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch QR token" });
  }
});

// ---------- PUBLIC: Verify driver by QR token ----------
app.get("/verify/driver/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const profile = await prisma.driverProfile.findFirst({
      where: { qrToken: token },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
    });
    if (!profile) return res.status(404).json({ ok: false, message: "Invalid token" });

    res.json({
      ok: true,
      driverId: profile.userId,
      driverIdNo: profile.driverIdNo,
      fullName: profile.user.fullName,
      busNo: profile.busNo,
      plate: profile.vehiclePlate,
      vehicleType: profile.vehicleType,
      route: profile.route,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Convenience: who am I
app.get("/me", requireAuth, async (req, res) => {
  const me = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      mustChangePassword: true,
    },
  });
  res.json(me);
});

// ---------- start ----------
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0"; // bind to LAN for mobile testing
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
