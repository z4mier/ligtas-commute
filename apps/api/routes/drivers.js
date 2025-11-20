// apps/api/src/routes/drivers.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const router = Router();

/**
 * POST /drivers/scan
 * Resolve QR → driverProfile + bus
 */
router.post("/scan", async (req, res) => {
  try {
    const { payload } = z.object({ payload: z.string().min(1) }).parse(req.body);
    const raw = payload.trim();

    // Try parse as JSON
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {}

    // Extract candidate ID
    let candidateId =
      parsed?.driverProfileId ||
      parsed?.driverId ||
      parsed?.userId ||
      parsed?.id ||
      raw;

    // 1) Try match with DriverProfile.id
    let prof = await prisma.driverProfile.findUnique({
      where: { id: candidateId },
      include: { bus: true },
    });

    // 2) Try match with DriverProfile.userId
    if (!prof) {
      prof = await prisma.driverProfile.findFirst({
        where: { userId: candidateId },
        include: { bus: true },
      });
    }

    if (!prof) {
      return res.status(404).json({ message: "Driver not found for this QR." });
    }

    /* -----------------------------
     * FIX: Correct driver name field
     * ----------------------------- */
    const driverName =
      prof.driverName || // correct schema
      prof.fullName ||   // fallback if old schema
      prof.name ||
      "Unknown Driver";

    /* -----------------------------
     * Normalize response
     * ----------------------------- */
    return res.json({
      driverProfileId: prof.id,
      userId: prof.userId,

      // Correct driver name
      name: driverName,
      code: prof.id, // you can change to QR code if needed

      busId: prof.busId ?? null,

      busNumber: prof.bus?.number ?? null,
      plateNumber: prof.bus?.plate ?? null,

      busType: prof.bus?.busType ?? null,
      vehicleType: prof.bus?.busType ?? null, // consistent with mobile naming
    });
  } catch (e) {
    console.error("POST /drivers/scan ERROR", e);
    if (e instanceof z.ZodError)
      return res.status(400).json({ message: "Invalid payload" });

    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /drivers/by-user/:userId
 */
router.get("/by-user/:userId", async (req, res) => {
  try {
    const { userId } = z.object({ userId: z.string().min(1) }).parse(req.params);

    const prof = await prisma.driverProfile.findUnique({
      where: { userId },
      include: { bus: true },
    });

    if (!prof)
      return res.status(404).json({ message: "Driver profile not found" });

    const driverName =
      prof.driverName || prof.fullName || prof.name || "Unknown Driver";

    return res.json({
      driverProfileId: prof.id,
      userId: prof.userId,
      fullName: driverName,

      busId: prof.busId,
      bus: prof.bus
        ? {
            id: prof.bus.id,
            number: prof.bus.number,
            plate: prof.bus.plate,
            type: prof.bus.busType,
          }
        : null,
    });
  } catch (e) {
    console.error("GET /drivers/by-user/:userId ERROR", e);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /drivers/current (Driver-side auth)
 */
router.get("/current", async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { driverProfile: { include: { bus: true } } },
    });

    if (!me?.driverProfile)
      return res.status(404).json({ message: "Not a driver" });

    const d = me.driverProfile;

    const driverName =
      d.driverName || d.fullName || d.name || "Unknown Driver";

    return res.json({
      driverProfileId: d.id,
      userId: d.userId,
      fullName: driverName,

      busId: d.busId,
      bus: d.bus
        ? {
            id: d.bus.id,
            number: d.bus.number,
            plate: d.bus.plate,
            type: d.bus.busType,
          }
        : null,
    });
  } catch (e) {
    console.error("GET /drivers/current ERROR", e);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
