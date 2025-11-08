import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  LoginSchema,
  RegisterAdminSchema,
  RegisterDriverSchema,
} from "../utils/validators.js";
import { generateBusAndPlate } from "../utils/vehicleIds.js";

const r = Router();

/** Admin registration */
r.post("/register-admin", async (req, res) => {
  try {
    const data = RegisterAdminSchema.parse(req.body);
    const hashed = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        role: "ADMIN",
        fullName: data.fullName,
        email: data.email,
        phone: data.phone ?? null,
        address: data.address ?? null,
        profileUrl: data.profileUrl ?? null,
        birthdate: data.birthdate ? new Date(data.birthdate) : null,
        password: hashed,
        admin: { create: {} },
      },
      include: { admin: true },
    });

    const token = jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET);
    res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (e) {
    console.error(e);
    if (e?.name === "ZodError")
      return res.status(400).json({ error: e.errors });
    if (e?.code === "P2002")
      return res.status(409).json({ error: "Email/Phone already used" });
    res.status(500).json({ error: "Failed to register admin" });
  }
});

/** Driver registration (default password + server-generated bus/plate) */
r.post("/register-driver", async (req, res) => {
  try {
    // NOTE: RegisterDriverSchema must NOT require password / busNumber / plateNumber
    // Must include: fullName, phone, optional address/route/driverLicense/birthdate, vehicleType
    const data = RegisterDriverSchema.parse(req.body);

    const defaultPw = env.DEFAULT_DRIVER_PASSWORD || "driver123";
    const hashed = await bcrypt.hash(defaultPw, 10);

    const vt = data.vehicleType || "NON_AIRCON";

    // Authoritatively generate unique identifiers
    const { busNumber, plateNumber } = await generateBusAndPlate(vt);

    const user = await prisma.user.create({
      data: {
        role: "DRIVER",
        fullName: data.fullName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        profileUrl: data.profileUrl ?? null,
        birthdate: data.birthdate ? new Date(data.birthdate) : null,
        password: hashed, // apply default password
        driver: {
          create: {
            driverLicense: data.driverLicense ?? null,
            route: data.route ?? null,
            vehicleType: vt,
            busNumber,
            plateNumber,
          },
        },
      },
      include: { driver: true },
    });

    // Return enough info for your QR modal / UI
    return res.status(201).json({
      message: "Driver registered",
      user: {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      },
      driver: {
        id: user.driver?.id,
        route: user.driver?.route,
        driverLicense: user.driver?.driverLicense,
        vehicleType: user.driver?.vehicleType,
        busNumber: user.driver?.busNumber,
        plateNumber: user.driver?.plateNumber,
        status: user.driver?.status,
        createdAt: user.driver?.createdAt,
      },
    });
  } catch (e) {
    console.error(e);
    if (e?.name === "ZodError")
      return res.status(400).json({ error: e.errors });
    if (e?.code === "P2002")
      return res.status(409).json({ error: "Duplicate bus/plate detected. Please retry." });
    res.status(500).json({ error: "Failed to register driver" });
  }
});

/** Login with email OR phone */
r.post("/login", async (req, res) => {
  try {
    const { emailOrPhone, password } = LoginSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: emailOrPhone }, { phone: emailOrPhone }] },
      include: { driver: true, admin: true },
    });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET);
    res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        phone: user.phone,
        driverId: user.driver?.id ?? null,
      },
    });
  } catch (e) {
    if (e?.name === "ZodError")
      return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: "Login failed" });
  }
});

export default r;
