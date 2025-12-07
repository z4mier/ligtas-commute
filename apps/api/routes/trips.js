// apps/api/routes/trips.js
import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

/* ---------- RECENT TRIPS FOR A COMMUTER ---------- */
router.get("/recent", async (req, res) => {
  try {
    const { commuterProfileId } = req.query;

    if (!commuterProfileId) {
      return res.status(400).json({
        error: "Missing commuterProfileId in query",
      });
    }

    const trips = await prisma.trip.findMany({
      where: { commuterProfileId: String(commuterProfileId) },
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        driverProfile: {
          select: {
            driverId: true,
            fullName: true,
            busType: true,
          },
        },
        bus: {
          select: {
            id: true,
            plate: true,
            number: true,
          },
        },
      },
    });

    res.json(trips);
  } catch (e) {
    console.error("[/trips/recent] error =", e);
    res.status(500).json({ error: e.message || "Failed to load trips" });
  }
});

/* ---------- SUBMIT / UPDATE RATING FOR A TRIP ---------- */
router.post("/:tripId/rating", async (req, res) => {
  const { tripId } = req.params;
  const { rating, comment } = req.body || {};

  const score = Number(rating);

  if (!score || score < 1 || score > 5) {
    return res.status(400).json({
      error: "rating must be between 1 and 5",
    });
  }

  try {
    const trip = await prisma.trip.findUnique({
      where: { id: String(tripId) },
    });

    if (!trip) {
      return res.status(404).json({
        error: "Trip not found",
      });
    }

    if (!trip.driverProfileId) {
      return res.status(400).json({
        error: "Trip has no driver assigned, cannot create rating",
      });
    }

    const existing = await prisma.rideRating.findFirst({
      where: {
        rideId: trip.id,
        commuterId: trip.commuterProfileId,
      },
    });

    let rideRating;
    if (existing) {
      rideRating = await prisma.rideRating.update({
        where: { id: existing.id },
        data: {
          score,
          comment: comment || null,
        },
      });
    } else {
      rideRating = await prisma.rideRating.create({
        data: {
          driverId: trip.driverProfileId,
          commuterId: trip.commuterProfileId,
          rideId: trip.id,
          score,
          comment: comment || null,
        },
      });
    }

    res.json(rideRating);
  } catch (e) {
    console.error("[/trips/:tripId/rating] error =", e);
    res.status(500).json({ error: e.message || "Failed to submit rating" });
  }
});

export default router;