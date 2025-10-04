import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const prisma = new PrismaClient();
export const admin = Router();

admin.post("/create-driver", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { fullName, email, phone, licenseNo } = req.body || {};

    if (!fullName || !email || !phone || !licenseNo) {
      return res.status(422).json({ message: "fullName, email, phone, licenseNo are required" });
    }

    const defaults = {
      birthDate: new Date("2000-01-01"),
      address: "Cebu City",
      vehicleType: "Ceres Bus (AC)",
      busNo: "01",
      vehiclePlate: "UNKNOWN",
      driverIdNo: "DR-" + Math.floor(100 + Math.random() * 900), 
      route: "Unknown",
    };

    const passwordHash = await bcrypt.hash("driver123", 10);
    const qrToken = crypto.randomUUID();

    const driver = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        password: passwordHash,
        role: "DRIVER",
        status: "active",
        mustChangePassword: true,
        driverProfile: {
          create: {
            licenseNo,
            birthDate: defaults.birthDate,
            address: defaults.address,
            vehicleType: defaults.vehicleType,
            busNo: defaults.busNo,
            vehiclePlate: defaults.vehiclePlate,
            driverIdNo: defaults.driverIdNo,
            route: defaults.route,
            qrToken,
            status: "offline"
          }
        }
      },
      include: { driverProfile: true }
    });

    return res.status(201).json({
      id: driver.id,
      email: driver.email,
      role: driver.role,
      mustChangePassword: driver.mustChangePassword,
      qrToken: driver.driverProfile?.qrToken
    });
  } catch (err) {
    console.error(err);
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Email or phone already exists" });
    }
    return res.status(500).json({ message: "Server error" });
  }
});
