// apps/api/src/routes/admin-trips.js
import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

router.get("/admin/trips", async (req, res, next) => {
  try {
    const { status, driverId, busId } = req.query;

    const where = {};

    if (status) {
      where.status = String(status).toUpperCase(); 
    }

    if (driverId) {
      where.driverProfileId = String(driverId);
    }

    if (busId) {
      where.busId = String(busId);
    }

    const trips = await prisma.trip.findMany({
      where,
      orderBy: { startedAt: "desc" },
      include: {
        driverProfile: true, // for fullName
        bus: true,           // for number & plate
      },
    });

    // Frontend already accepts either array or { items: [...] }.
    // We'll keep it simple and return plain array.
    res.json(trips);
  } catch (err) {
    next(err);
  }
});

/**
 * Optional: /trips (non-admin) fallback
 * This matches the fallback in your listTrips() helper.
 */
router.get("/trips", async (req, res, next) => {
  try {
    const { status, driverId, busId } = req.query;

    const where = {};

    if (status) {
      where.status = String(status).toUpperCase();
    }

    if (driverId) {
      where.driverProfileId = String(driverId);
    }

    if (busId) {
      where.busId = String(busId);
    }

    const trips = await prisma.trip.findMany({
      where,
      orderBy: { startedAt: "desc" },
      include: {
        driverProfile: true,
        bus: true,
      },
    });

    res.json(trips);
  } catch (err) {
    next(err);
  }
});

export default router;

