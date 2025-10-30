// apps/api/routes/feedback.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const router = Router();

/* Allowed incident categories & statuses */
const INCIDENT_CATEGORIES = new Set([
  "RECKLESS_DRIVING",
  "OVERLOADING",
  "OVERCHARGING",
  "HARASSMENT",
  "OTHER",
]);
const INCIDENT_STATUSES = new Set(["PENDING", "IN_REVIEW", "RESOLVED", "DISMISSED"]);

/* ========== RATINGS ========== */
router.post("/ratings", async (req, res) => {
  try {
    const schema = z.object({
      driverId: z.string().min(1, "Missing driverId"),
      rideId: z.string().min(1).optional(),
      driverScore: z.number().int().min(1).max(5),
      // allow vehicleScore to be optional; treat missing as 0
      vehicleScore: z.number().int().min(0).max(5).optional(),
      comment: z.string().max(1000).optional(),
    });

    const input = schema.parse(req.body);

    const created = await prisma.rideRating.create({
      data: {
        driverId: input.driverId,
        commuterId: req.user.sub,
        rideId: input.rideId || null,
        driverScore: input.driverScore,
        vehicleScore: input.vehicleScore ?? 0,
        comment: input.comment || null,
      },
    });

    return res.status(201).json({
      id: created.id,
      createdAt: created.createdAt,
      message: "Rating saved",
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      const first = e.errors?.[0];
      return res.status(400).json({ message: first?.message || "Invalid input" });
    }
    console.error("POST /feedback/ratings ERROR:", e);
    return res.status(500).json({ message: "Failed to save rating" });
  }
});

/* ========== INCIDENTS (multi-select) ========== */
router.post("/incidents", async (req, res) => {
  try {
    const schema = z.object({
      driverId: z.string().min(1, "Missing driverId"),
      rideId: z.string().optional(),
      categories: z.array(z.string().min(1)).min(1, "Pick at least one category"),
      note: z.string().max(2000).optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      evidenceUrl: z.string().url().optional(),
      status: z.string().optional(),
    });

    const input = schema.parse(req.body);

    const cats = [...new Set(input.categories.map((c) => c.toUpperCase().trim()))];
    if (!cats.every((c) => INCIDENT_CATEGORIES.has(c))) {
      return res.status(400).json({ message: "Invalid categories" });
    }

    const status =
      input.status && INCIDENT_STATUSES.has(input.status.toUpperCase())
        ? input.status.toUpperCase()
        : "PENDING";

    const created = await prisma.incidentReport.create({
      data: {
        driverId: input.driverId,
        reporterId: req.user.sub,
        rideId: input.rideId || null,
        note: input.note || null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        evidenceUrl: input.evidenceUrl || null,
        status,
        categories: {
          createMany: {
            data: cats.map((c) => ({ category: c })),
            skipDuplicates: true,
          },
        },
      },
      include: { categories: true },
    });

    return res.status(201).json({
      id: created.id,
      createdAt: created.createdAt,
      message: "Incident submitted",
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      const first = e.errors?.[0];
      return res.status(400).json({ message: first?.message || "Invalid input" });
    }
    console.error("POST /feedback/incidents ERROR:", e);
    return res.status(500).json({ message: "Failed to save incident" });
  }
});

export default router;
