import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { UpdateDriverStatusSchema } from "../utils/validators.js";
import { previewBusAndPlate, generateBusAndPlate } from "../utils/vehicleIds.js";
import { z } from "zod";
import crypto from "crypto"; // <-- added

const r = Router();

/* -------------------- SCHEMA -------------------- */
const CreateDriverSchema = z.object({
  fullName: z.string(),
  phone: z.string(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  route: z.string().nullable().optional(),
  driverLicense: z.string().nullable().optional(),
  birthdate: z.coerce.date().nullable().optional(),
  vehicleType: z.enum(["AIRCON", "NON_AIRCON"]),
  // client may send these but we IGNORE and generate on server
  busNumber: z.string().nullable().optional(),
  plateNumber: z.string().nullable().optional(),
});

/* -------------------- LIST ALL DRIVERS -------------------- */
r.get("/", requireAuth, requireAdmin, async (_req, res) => {
  const drivers = await prisma.driver.findMany({
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          address: true,
          profileUrl: true,
          birthdate: true,
          createdAt: true,
        },
      },
    },
    orderBy: { id: "desc" },
  });
  res.json(drivers);
});

/* -------------------- REGISTER NEW DRIVER -------------------- */
r.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const body = CreateDriverSchema.parse(req.body);

    // Generate authoritative IDs
    const ids = await generateBusAndPlate(body.vehicleType);
    const busNumber = ids.busNumber;
    const plateNumber = ids.plateNumber.toUpperCase();

    // Create associated user first (password is required by Prisma)
    const tempPassword = crypto.randomBytes(16).toString("hex"); // <-- added
    const user = await prisma.user.create({
      data: {
        fullName: body.fullName,
        phone: body.phone,
        email: body.email ?? undefined,
        address: body.address ?? undefined,
        role: "DRIVER",
        birthdate: body.birthdate ?? undefined,
        password: tempPassword, // <-- added
      },
    });

    // Create driver record
    const driver = await prisma.driver.create({
      data: {
        userId: user.id,
        route: body.route ?? undefined,
        driverLicense: body.driverLicense ?? undefined,
        vehicleType: body.vehicleType,
        busNumber,
        plateNumber,
        status: "ACTIVE",
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            address: true,
          },
        },
      },
    });

    res.json(driver);
  } catch (e) {
    if (e?.name === "ZodError") return res.status(400).json({ error: e.errors });
    if (e?.code === "P2002")
      return res.status(409).json({ error: "Bus/Plate already in use. Please retry." });
    console.error("POST /drivers error:", e);
    res.status(500).json({ error: "Failed to register driver" });
  }
});

/* -------------------- PREVIEW NEXT BUS & PLATE -------------------- */
// NOTE: path changed to /preview-identifiers to match the frontend
r.get("/preview-identifiers", requireAuth, requireAdmin, async (req, res) => {
  try {
    const vehicleType = z.enum(["AIRCON", "NON_AIRCON"]).parse(req.query.vehicleType);
    const data = await previewBusAndPlate(vehicleType);
    res.json(data); // { busNumber, plateNumber }
  } catch {
    res.status(400).json({ error: "Invalid vehicleType" });
  }
});

/* -------------------- UPDATE DRIVER STATUS -------------------- */
r.patch("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = UpdateDriverStatusSchema.parse(req.body);
    const driver = await prisma.driver.update({
      where: { id: Number(req.params.id) },
      data: { status },
      include: { user: true },
    });
    res.json(driver);
  } catch (e) {
    if (e?.name === "ZodError") return res.status(400).json({ error: e.errors });
    return res.status(500).json({ error: "Failed to update status" });
  }
});

/* -------------------- EDIT DRIVER DETAILS -------------------- */
r.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const UserShape = z.object({
      fullName: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      email: z.string().email().optional().nullable(),
      address: z.string().optional().nullable(),
      birthdate: z.coerce.date().optional().nullable(),
    });

    const Body = z.object({
      route: z.string().optional().nullable(),
      vehicleType: z.enum(["AIRCON", "NON_AIRCON"]).optional(),
      busNumber: z.string().optional().nullable(),
      plateNumber: z.string().optional().nullable(),
      driverLicense: z.string().optional().nullable(),
      user: UserShape.optional(),
      fullName: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      email: z.string().email().optional().nullable(),
      address: z.string().optional().nullable(),
      birthdate: z.coerce.date().optional().nullable(),
    });

    const data = Body.parse(req.body);
    const userData = data.user ?? {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      address: data.address,
      birthdate: data.birthdate,
    };

    const clean = (obj) =>
      Object.fromEntries(
        Object.entries(obj || {}).filter(([, v]) => v !== undefined && v !== null)
      );

    const driverUpdate = clean({
      route: data.route,
      vehicleType: data.vehicleType,
      busNumber: data.busNumber ?? undefined,
      plateNumber: data.plateNumber ? String(data.plateNumber).toUpperCase() : undefined,
      driverLicense: data.driverLicense,
    });

    const userUpdate = clean({
      fullName: userData?.fullName,
      phone: userData?.phone,
      email: userData?.email,
      address: userData?.address,
      birthdate: userData?.birthdate,
    });

    const updated = await prisma.driver.update({
      where: { id: Number(req.params.id) },
      data: {
        ...driverUpdate,
        ...(Object.keys(userUpdate).length > 0
          ? { user: { update: userUpdate } }
          : {}),
      },
      include: { user: true },
    });

    res.json(updated);
  } catch (e) {
    if (e?.name === "ZodError") return res.status(400).json({ error: e.errors });
    if (e?.code === "P2002")
      return res.status(409).json({ error: "Bus number or plate number already in use" });
    return res.status(500).json({ error: "Failed to update driver" });
  }
});

export default r;
