// apps/api/routes/commuter.trips.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../src/middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

/* -------------------- Start trip -------------------- */
router.post("/trips/start", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId || null;
    console.log("[trip.start] userId =", userId);
    console.log("[trip.start] body =", req.body);

    if (!userId) {
      console.log("[trip.start] missing user id on req.user");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const commuter = await prisma.commuterProfile.findUnique({
      where: { userId },
    });

    if (!commuter) {
      console.log("[trip.start] no commuter profile for user", userId);
      return res.status(400).json({ error: "No commuter profile found" });
    }

    let {
      busId,
      driverProfileId,
      originLat,
      originLng,
      originLabel,

      // 🆕 snapshot fields from mobile
      driverName,
      busNumber,
      busPlate,
    } = req.body || {};

    const lat = Number(originLat);
    const lng = Number(originLng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.log("[trip.start] invalid coords:", originLat, originLng);
      return res.status(400).json({ error: "Invalid origin coordinates" });
    }

    // 🧾 snapshot defaults (trim strings)
    let snapshotDriverName =
      typeof driverName === "string" && driverName.trim()
        ? driverName.trim()
        : null;

    let snapshotBusNumber =
      typeof busNumber === "string" && busNumber.trim()
        ? busNumber.trim()
        : null;

    let snapshotBusPlate =
      typeof busPlate === "string" && busPlate.trim()
        ? busPlate.trim()
        : null;

    // ✅ IDs should be STRING (cuid), not Number
    let safeBusId =
      busId !== undefined && busId !== null && busId !== ""
        ? String(busId)
        : null;

    let safeDriverProfileId =
      driverProfileId !== undefined &&
      driverProfileId !== null &&
      driverProfileId !== ""
        ? String(driverProfileId)
        : null;

    // ✅ validate busId (String) and override snapshot if real bus exists
    if (safeBusId) {
      const bus = await prisma.bus.findUnique({
        where: { id: safeBusId }, // Bus.id is String
      });

      if (!bus) {
        console.log("[trip.start] bus not found:", safeBusId);
        safeBusId = null;
      } else {
        // use real DB data as snapshot
        snapshotBusNumber = bus.number;
        snapshotBusPlate = bus.plate;
      }
    }

    // ✅ validate driverProfileId (use driverId, not id) and override snapshot
    if (safeDriverProfileId) {
      const driver = await prisma.driverProfile.findUnique({
        where: { driverId: safeDriverProfileId }, // DriverProfile.driverId
      });

      if (!driver) {
        console.log("[trip.start] driver not found:", safeDriverProfileId);
        safeDriverProfileId = null;
      } else {
        snapshotDriverName = driver.fullName;
      }
    }

    const trip = await prisma.trip.create({
      data: {
        commuterProfileId: commuter.id,
        busId: safeBusId,
        driverProfileId: safeDriverProfileId,
        originLat: lat,
        originLng: lng,
        originLabel: originLabel || null,
        status: "ONGOING",
        startedAt: new Date(),

        // 🆕 snapshot fields saved on Trip
        driverName: snapshotDriverName,
        busNumber: snapshotBusNumber,
        busPlate: snapshotBusPlate,
      },
    });

    console.log("[trip.start] created trip id =", trip.id);
    return res.json({ trip });
  } catch (e) {
    console.error("trip start error:", e);

    // TEMP: send back details so the mobile log shows the real reason
    return res.status(500).json({
      error: "Failed to start trip",
      message: e.message,
      code: e.code || null,
    });
  }
});

/* -------------------- Complete trip -------------------- */
router.post("/trips/complete", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId || null;

    if (!userId) {
      console.log("[trip.complete] missing user id on req.user");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const commuter = await prisma.commuterProfile.findUnique({
      where: { userId },
    });
    if (!commuter) {
      return res.status(400).json({ error: "No commuter profile found" });
    }

    let { tripId, destLat, destLng, destLabel } = req.body || {};

    // If tripId not passed, get latest ongoing trip
    if (!tripId) {
      const latest = await prisma.trip.findFirst({
        where: {
          commuterProfileId: commuter.id,
          status: "ONGOING",
        },
        orderBy: { startedAt: "desc" },
      });

      if (!latest) {
        return res
          .status(404)
          .json({ error: "No ongoing trip found to complete" });
      }

      tripId = latest.id;
    }

    const lat = destLat !== undefined ? Number(destLat) : null;
    const lng = destLng !== undefined ? Number(destLng) : null;

    const trip = await prisma.trip.update({
      where: { id: String(tripId) },
      data: {
        status: "COMPLETED",
        destLat: Number.isFinite(lat) ? lat : null,
        destLng: Number.isFinite(lng) ? lng : null,
        destLabel: destLabel || null,
        endedAt: new Date(),
      },
    });

    console.log("[trip.complete] updated trip id =", trip.id);
    return res.json({ trip });
  } catch (e) {
    console.error("trip complete error:", e);
    return res.status(500).json({
      error: "Failed to complete trip",
      message: e.message,
      code: e.code || null,
    });
  }
});

/* -------------------- Recent trips -------------------- */
router.get("/trips/recent", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId || null;

    if (!userId) {
      console.log("[trips.recent] missing user id on req.user");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const commuter = await prisma.commuterProfile.findUnique({
      where: { userId },
    });
    if (!commuter) {
      return res.status(400).json({ error: "No commuter profile found" });
    }

    const trips = await prisma.trip.findMany({
      where: {
        commuterProfileId: commuter.id,
        status: "COMPLETED",
      },
      orderBy: { endedAt: "desc" },
      take: 10,
      include: {
        driverProfile: { select: { fullName: true } },
        bus: { select: { number: true, plate: true } },
      },
    });

    return res.json(trips);
  } catch (e) {
    console.error("recent trips error:", e);
    return res.status(500).json({
      error: "Failed to load trips",
      message: e.message,
      code: e.code || null,
    });
  }
});

export default router;
