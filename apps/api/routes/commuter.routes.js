// apps/api/routes/commuter.routes.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../src/middleware/auth.js";

console.log("✅ LOADED commuter.routes.js vREVEAL_FIX_2", { pid: process.pid });

const prisma = new PrismaClient();
const router = express.Router();

function getUserId(req) {
  return req.user?.sub || req.user?.id || req.userId || null;
}

/** robust boolean parser */
function parseBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(s)) return true;
    if (["false", "0", "no", "n", "off"].includes(s)) return false;
  }
  return null;
}

/**
 * Extract LCMETA anywhere + strip it from comment.
 * Supports:
 *  - meta not at index 0
 *  - multiple meta blocks (will remove all)
 *  - JSON-stringified comment:
 *     "\"[LCMETA:{\\\"revealName\\\":true}] hello\""
 */
function unpackRatingComment(raw) {
  let text = typeof raw === "string" ? raw : "";
  let trimmed = text.trim();

  // unwrap once if JSON-stringified string
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") trimmed = parsed.trim();
    } catch {
      // ignore
    }
  }

  const m = trimmed.match(/\[LCMETA:(\{.*?\})\]\s*/);
  if (!m) return { metaReveal: null, cleanComment: trimmed || null };

  const metaRaw = m[1];

  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  // parse meta: allow single quotes too
  let meta = tryParse(metaRaw);
  if (!meta) meta = tryParse(metaRaw.replace(/'/g, '"'));

  const metaReveal =
    meta && typeof meta === "object" ? parseBool(meta.revealName) : null;

  // remove ALL LCMETA blocks to prevent duplicates
  const cleanComment =
    trimmed.replace(/\[LCMETA:\{.*?\}\]\s*/g, "").trim() || null;

  return { metaReveal, cleanComment };
}

router.post("/trips/:tripId/rating", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { tripId } = req.params;

    const rating = req.body?.rating;
    const comment = req.body?.comment;

    // ✅ accept revealName from multiple possible keys (mobile/web differences)
    const revealNameRaw =
      req.body?.revealName ??
      req.body?.reveal_name ??
      req.body?.reveal ??
      req.body?.isRevealName ??
      req.body?.is_reveal_name ??
      null;

    // 🔥 if you don't see this, you're hitting a different route file
    console.log("🔥 HIT /commuter/trips/:tripId/rating vREVEAL_FIX_2", {
      pid: process.pid,
      tripId,
      userId,
      bodyKeys: Object.keys(req.body || {}),
      revealNameRaw,
      revealNameType: typeof revealNameRaw,
    });

    const scoreNum = Number(rating);
    if (!scoreNum || scoreNum < 1 || scoreNum > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // ✅ user + commuterProfile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { commuterProfile: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.commuterProfile) {
      return res.status(404).json({ error: "Commuter profile not found" });
    }

    const commuterProfileId = user.commuterProfile.id;

    // ✅ Trip must belong to this commuter
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, commuterProfileId },
      include: { driverProfile: true },
    });

    if (!trip) return res.status(404).json({ error: "Trip not found" });
    if (!trip.driverProfileId) {
      return res.status(400).json({ error: "Trip has no driver assigned" });
    }

    // ✅ already rated?
    const existingRating = await prisma.rideRating.findFirst({
      where: {
        rideId: tripId,
        commuterId: commuterProfileId,
        driverId: trip.driverProfileId,
      },
    });

    if (existingRating) {
      return res.status(400).json({ error: "Trip already rated" });
    }

    const { metaReveal, cleanComment } = unpackRatingComment(comment || "");

    /**
     * ✅ ABSOLUTE RULE:
     * - If app sends boolean -> use directly (NO fallback)
     * - Else parse string/number -> fallback to meta -> else false
     */
    let revealNameFinal = false;

    if (typeof revealNameRaw === "boolean") {
      revealNameFinal = revealNameRaw;
    } else {
      const parsed = parseBool(revealNameRaw);
      revealNameFinal =
        parsed !== null ? parsed : metaReveal !== null ? metaReveal : false;
    }

    console.log("✅ [COMMUTER RATING DECISION]", {
      revealNameRaw,
      revealNameType: typeof revealNameRaw,
      metaReveal,
      revealNameFinal,
    });

    const newRating = await prisma.rideRating.create({
      data: {
        rideId: tripId,
        driverId: trip.driverProfileId,
        commuterId: commuterProfileId,
        score: Math.trunc(scoreNum),
        comment: cleanComment, // clean comment only
        revealName: revealNameFinal, // ✅ source of truth
      },
      select: {
        id: true,
        score: true,
        comment: true,
        revealName: true,
        createdAt: true,
      },
    });

    console.log("✅ [COMMUTER RATING CREATED]", newRating);

    return res.json({ success: true, rating: newRating });
  } catch (err) {
    console.error("❌ [POST /commuter/trips/:tripId/rating] error:", err);
    return res.status(500).json({
      error: "Failed to submit rating",
      details: err.message,
    });
  }
});

export default router;
