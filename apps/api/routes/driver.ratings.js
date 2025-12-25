// apps/api/routes/driver.ratings.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../src/middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

function getUserId(req) {
  return req.user?.sub || req.user?.id || req.userId || null;
}

function requireDriver(req, res, next) {
  const role = req.user?.role;
  if (role && role !== "DRIVER") return res.status(403).json({ error: "Drivers only" });
  next();
}

function unpackRatingComment(raw) {
  let text = typeof raw === "string" ? raw : "";
  const trimmed = String(text || "").trim();
  const m = trimmed.match(/\[LCMETA:(\{.*?\})\]\s*/);
  if (!m) return { comment: trimmed || null, hadMeta: false };
  const clean = trimmed.replace(m[0], "").trim();
  return { comment: clean || null, hadMeta: true };
}

router.get("/ratings", requireAuth, requireDriver, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId },
    });
    if (!driverProfile) return res.status(404).json({ error: "Driver profile not found" });

    console.log(`[Driver Ratings] Fetching ratings for driver: ${driverProfile.driverId}`);
    console.log("SERVER INSTANCE:", {
      pid: process.pid,
      databaseUrl: (process.env.DATABASE_URL || "").slice(0, 40) + "...",
    });

    const ratings = await prisma.rideRating.findMany({
      where: { driverId: driverProfile.driverId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        score: true,
        comment: true,
        revealName: true,
        createdAt: true,
        updatedAt: true,
        commuterId: true,
      },
    });

    const commuterIds = [...new Set(ratings.map((r) => r.commuterId))];

    const commuterProfiles = commuterIds.length
      ? await prisma.commuterProfile.findMany({
          where: { id: { in: commuterIds } },
          select: { id: true, fullName: true },
        })
      : [];

    const commuterMap = new Map(commuterProfiles.map((cp) => [cp.id, cp.fullName]));

    const items = ratings.map((r) => {
      const parsed = unpackRatingComment(r.comment || "");
      const reveal = r.revealName === true;
      const commuterFullName = commuterMap.get(r.commuterId) || null;

      console.log(
        `[Rating ${r.id}] DB.revealName=${r.revealName} -> reveal=${reveal}, commuterId=${r.commuterId}, name=${commuterFullName}`
      );

      return {
        id: r.id,
        score: r.score,
        createdAt: r.createdAt || r.updatedAt,
        comment: parsed.comment,
        revealName: reveal,
        commuterName: reveal ? commuterFullName : null,
      };
    });

    const totalRatings = items.length;
    const sum = items.reduce((acc, it) => acc + (Number(it.score) || 0), 0);
    const averageScore = totalRatings ? sum / totalRatings : 0;

    return res.json({ averageScore, totalRatings, items });
  } catch (err) {
    console.error("[GET /driver/ratings] error:", err);
    return res.status(500).json({ error: "Failed to load ratings" });
  }
});

export default router;
