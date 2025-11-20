// apps/api/routes/driver.ratings.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../src/middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * GET /driver/ratings
 * Response:
 * {
 *   averageScore: number,
 *   totalRatings: number,
 *   items: [
 *     { id, score, comment, createdAt }
 *   ]
 * }
 */
router.get("/ratings", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId || null;
    console.log("[/driver/ratings] userId =", userId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // DriverProfile userId is @unique in your schema
    const driver = await prisma.driverProfile.findUnique({
      where: { userId },
    });

    console.log("[/driver/ratings] driver =", driver);

    if (!driver) {
      return res.status(404).json({ error: "Driver profile not found" });
    }

    const ratings = await prisma.rideRating.findMany({
      where: { driverId: driver.driverId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    console.log(
      "[/driver/ratings] ratings count =",
      ratings.length,
      "driverId =",
      driver.driverId
    );

    const totalRatings = ratings.length;
    const averageScore =
      totalRatings === 0
        ? 0
        : ratings.reduce((sum, r) => sum + (r.score || 0), 0) / totalRatings;

    return res.json({
      averageScore,
      totalRatings,
      items: ratings.map((r) => ({
        id: r.id,
        score: r.score,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
    });
  } catch (e) {
    console.error("[GET /driver/ratings] error =", e);
    return res
      .status(500)
      .json({ error: e.message || "Failed to load driver ratings" });
  }
});

export default router;
