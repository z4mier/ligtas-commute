import express from "express";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * POST /drivers/register
 * Body:
 *  {
 *    fullName, email, phone, licenseNo, address, birthDate,
 *    plateNumber, busNumber, busType   // "AIRCON" | "NON_AIRCON"
 *  }
 */
router.post("/register", async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      licenseNo,
      address,
      birthDate,
      plateNumber,
      busNumber,
      busType,
    } = req.body;

    // Basic validation
    if (!fullName || !email || !licenseNo || !plateNumber || !busNumber) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Normalize values
    const normalizedPlate = String(plateNumber).replace(/\s+/g, "").toUpperCase();
    const type =
      String(busType || "")
        .trim()
        .toUpperCase()
        .replace("-", "_") || "AIRCON"; // default

    if (!["AIRCON", "NON_AIRCON"].includes(type)) {
      return res.status(400).json({ message: "busType must be AIRCON or NON_AIRCON" });
    }

    // Create user (default password)
    const hashedPass = await bcrypt.hash("driver123", 10);
    const user = await prisma.user.create({
      data: {
        email,
        phone: phone || null,
        password: hashedPass,
        role: "DRIVER",
        status: "active",
      },
    });

    // Upsert bus by plate
    const bus = await prisma.bus.upsert({
      where: { plate: normalizedPlate },
      update: {
        number: String(busNumber),
        busType: type,
        isActive: true,
      },
      create: {
        number: String(busNumber),
        plate: normalizedPlate,
        busType: type,
        isActive: true,
      },
    });

    // Create driver profile and link to bus
    const driver = await prisma.driverProfile.create({
      data: {
        userId: user.id,
        fullName,
        licenseNo,
        phone: phone || null,
        address,
        birthDate: new Date(birthDate),
        isActive: true,
        busType: type,
        busId: bus.id,
      },
      include: {
        bus: true,
        user: { select: { email: true, phone: true } },
      },
    });

    return res.status(201).json({
      message: "Driver registered successfully and assigned to bus.",
      driver: {
        id: driver.id,
        name: driver.fullName,
        licenseNo: driver.licenseNo,
        email: driver.user?.email ?? null,
        phone: driver.user?.phone ?? null,
        busType: driver.busType,
      },
      bus: {
        id: bus.id,
        number: bus.number,
        plate: bus.plate,
        busType: bus.busType,
      },
    });
  } catch (error) {
    console.error("Register Driver Error:", error);

    // Handle uniques (email/phone/plate)
    if (String(error?.message || "").includes("Unique constraint failed")) {
      return res.status(409).json({ message: "Email, phone, or plate is already used." });
    }
    return res.status(500).json({ message: "Server error while registering driver." });
  }
});

export default router;
