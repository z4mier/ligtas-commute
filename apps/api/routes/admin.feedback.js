// apps/api/src/routes/admin.feedback.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const r = Router();

/* helper to build DTO */
function toFeedbackDto(rating, commuterName) {
  return {
    id: rating.id,
    driverId: rating.driverId,
    driverName: rating.driver?.fullName || "Unknown driver",
    commuterId: rating.commuterId,
    authorName: commuterName || "Anonymous passenger",
    score: rating.score,
    comment: rating.comment || "",
    createdAt: rating.createdAt,
  };
}

/* -----------------------------------------------------------
   GET /admin/feedback
   → list all ride ratings for admin UI
----------------------------------------------------------- */
r.get("/feedback", async (_req, res) => {
  try {
    const ratings = await prisma.rideRating.findMany({
      include: {
        driver: {
          select: {
            driverId: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // fetch commuter names in one go using commuterId
    const commuterIds = [
      ...new Set(
        ratings
          .map((r) => r.commuterId)
          .filter((id) => typeof id === "string" && id.length > 0)
      ),
    ];

    let commuterMap = {};
    if (commuterIds.length > 0) {
      const commuters = await prisma.commuterProfile.findMany({
        where: { id: { in: commuterIds } },
        select: { id: true, fullName: true },
      });
      commuterMap = Object.fromEntries(
        commuters.map((c) => [c.id, c.fullName])
      );
    }

    const items = ratings.map((rt) =>
      toFeedbackDto(rt, commuterMap[rt.commuterId])
    );

    res.json({ items });
  } catch (e) {
    console.error("GET /admin/feedback ERROR:", e);
    res.status(500).json({ message: "Failed to load feedback" });
  }
});

/* -----------------------------------------------------------
   GET /admin/feedback/:id
   → single feedback for modal (optional but nice)
----------------------------------------------------------- */
r.get("/feedback/:id", async (req, res) => {
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);

    const rating = await prisma.rideRating.findUnique({
      where: { id },
      include: {
        driver: {
          select: {
            driverId: true,
            fullName: true,
          },
        },
      },
    });

    if (!rating) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    let authorName = "Anonymous passenger";
    if (rating.commuterId) {
      const commuter = await prisma.commuterProfile.findUnique({
        where: { id: rating.commuterId },
        select: { fullName: true },
      });
      if (commuter?.fullName) authorName = commuter.fullName;
    }

    res.json(toFeedbackDto(rating, authorName));
  } catch (e) {
    console.error("GET /admin/feedback/:id ERROR:", e);
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid id" });
    }
    res.status(500).json({ message: "Failed to load feedback" });
  }
});

export default r;
