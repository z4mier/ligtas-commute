// apps/api/src/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";          // bcryptjs for ESM ease
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

dotenv.config();

// --- init ---
const app = express();
const prisma = new PrismaClient();

app.use(cors());
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
    const schema = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
      });

    const { email, password } = schema.parse(req.body);

    const user = await prisma.user.findFirst({ where: { email } });
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

// ADMIN: Create driver (default password = driver123)
// Matches your Prisma schema exactly.
app.post("/admin/create-driver", requireAuth, requireAdmin, async (req, res) => {
  const schema = z.object({
    // User table fields
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(6, "Phone is too short"),

    // DriverProfile fields
    licenseNo: z.string().min(1, "License No is required"),
    birthDate: z.string().min(1, "Birth date is required"), // yyyy-mm-dd from <input type="date">
    address: z.string().min(1, "Address is required"),
    vehicleType: z.enum(["AIRCON", "NON_AIRCON"], {
      errorMap: () => ({ message: "Vehicle Type must be AIRCON or NON_AIRCON" }),
    }),
    busNo: z.string().min(1, "Bus number is required"),
    vehiclePlate: z.string().min(1, "Plate number is required"),
    driverIdNo: z.string().min(1, "Driver ID No is required"),
    route: z.string().min(1, "Route is required"),
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

    return res.json({
      message: "Driver account created (default password: driver123)",
      user,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: e.errors.map(x => x.message).join(", ") });
    }
    if (e?.code === "P2002") {
      const fields = Array.isArray(e?.meta?.target) ? e.meta.target.join(", ") : "field";
      return res.status(409).json({ message: `Duplicate ${fields}` });
    }
    console.error("create-driver error:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// --- start ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
