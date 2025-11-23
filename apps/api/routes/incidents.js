// apps/api/routes/incidents.js
import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * POST /api/incidents
 * Body:
 * {
 *   tripId: string,
 *   categories?: string[],   // multi-select categories
 *   note?: string
 * }
 *
 * Creates an IncidentReport + multiple IncidentCategory rows.
 */
router.post("/", async (req, res) => {
  try {
    const { tripId, categories, note } = req.body || {};

    if (!tripId) {
      return res.status(400).json({ error: "tripId is required" });
    }

    const trip = await prisma.trip.findUnique({
      where: { id: String(tripId) },
      // 👇 add this so we know which user (commuter) owns the trip
      include: {
        commuterProfile: true,
      },
    });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    if (!trip.driverProfileId) {
      return res
        .status(400)
        .json({ error: "Trip has no driver, cannot create incident" });
    }

    const driverId = trip.driverProfileId;

    // 👇 take the commuter’s userId as the reporterId
    const reporterId = trip.commuterProfile?.userId || null;

    const catArray = Array.isArray(categories)
      ? categories.filter((c) => typeof c === "string" && c.trim() !== "")
      : [];

    const incident = await prisma.incidentReport.create({
      data: {
        driverId,
        tripId: trip.id,
        // only set reporterId if we actually have one
        ...(reporterId && { reporterId }),
        note: note || null,
        categories: catArray.length
          ? {
              create: catArray.map((c) => ({
                category: c,
              })),
            }
          : undefined,
      },
      include: {
        categories: true,
      },
    });

    res.status(201).json(incident);
  } catch (e) {
    console.error("[/incidents] error =", e);
    res
      .status(500)
      .json({ error: e.message || "Failed to submit incident report" });
  }
});

export default router;
