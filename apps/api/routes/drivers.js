// apps/api/src/routes/drivers.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const router = Router();

/**
 * Resolve driver info from a QR payload.
 * Used by the commuter app QR scanner.
 *
 * Body: { payload: string }
 *  - If payload is JSON with driverId, we try that.
 *  - Otherwise we try it as driverProfile.id, then as userId.
 */
router.post("/scan", async (req, res) => {
  try {
    const schema = z.object({
      payload: z.string().min(1),
    });
    const { payload } = schema.parse(req.body);

    const raw = payload.trim();

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // not JSON, ignore
    }

    let candidateId = raw;
    if (parsed && typeof parsed === "object") {
      candidateId =
        parsed.driverId ||
        parsed.driverProfileId ||
        parsed.userId ||
        raw;
    }

    // 1) try as driverProfile.id
    let prof = await prisma.driverProfile.findUnique({
      where: { id: candidateId },
      include: { bus: true },
    });

    // 2) if not found, try as userId
    if (!prof) {
      prof = await prisma.driverProfile.findFirst({
        where: { userId: candidateId },
        include: { bus: true },
      });
    }

    if (!prof) {
      return res
        .status(404)
        .json({ message: "Driver not found for this QR." });
    }

    return res.json({
      id: prof.id,
      userId: prof.userId,
      name: prof.fullName,
      code: prof.id, // you can change this if you have a custom code field
      busNumber: prof.bus?.number ?? null,
      plateNumber: prof.bus?.plate ?? null,
      busType: prof.bus?.busType ?? null,
      vehicleType: prof.bus?.busType ?? null,
    });
  } catch (e) {
    console.error("POST /drivers/scan ERROR", e);
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload" });
    }
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * Resolve driver profile by a User.id (useful when the app only knows the driver's userId).
 * Returns { id, userId, fullName, bus } where id is DriverProfile.id
 */
router.get("/by-user/:userId", async (req, res) => {
  try {
    const { userId } = z.object({ userId: z.string().min(1) }).parse(req.params);

    const prof = await prisma.driverProfile.findUnique({
      where: { userId },
      include: { bus: true },
    });
    if (!prof) return res.status(404).json({ message: "Driver profile not found" });

    return res.json({
      id: prof.id, // DriverProfile.id
      userId: prof.userId,
      fullName: prof.fullName,
      bus: prof.bus
        ? { id: prof.bus.id, number: prof.bus.number, plate: prof.bus.plate, type: prof.bus.busType }
        : null,
    });
  } catch (e) {
    console.error("GET /drivers/by-user/:userId ERROR", e);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * Get current user's driver profile (when the logged user is a driver).
 * Handy as a last-resort lookup.
 */
router.get("/current", async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { driverProfile: { include: { bus: true } } },
    });
    if (!me?.driverProfile) return res.status(404).json({ message: "Not a driver" });

    const d = me.driverProfile;
    return res.json({
      id: d.id, // DriverProfile.id
      userId: d.userId,
      fullName: d.fullName,
      bus: d.bus
        ? { id: d.bus.id, number: d.bus.number, plate: d.bus.plate, type: d.bus.busType }
        : null,
    });
  } catch (e) {
    console.error("GET /drivers/current ERROR", e);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;