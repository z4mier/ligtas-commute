import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { CreateFeedbackSchema } from "../utils/validators.js";

const r = Router();

/** Admin-only: create feedback for a driver */
r.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = CreateFeedbackSchema.parse(req.body);
    const item = await prisma.feedback.create({
      data: {
        driverId: data.driverId,
        createdById: req.user.id,
        rating: data.rating,
        comment: data.comment ?? null,
      },
    });
    res.json(item);
  } catch (e) {
    if (e?.name === "ZodError") return res.status(400).json({ error: e.errors });
    console.error("POST /feedbacks error:", e);
    res.status(500).json({ error: "Failed to create feedback" });
  }
});

/** ✅ Admin-only: list ALL feedback across ALL drivers */
r.get("/", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const items = await prisma.feedback.findMany({
      include: {
        createdBy: { select: { id: true, fullName: true, role: true } }, // User
        driver: {
          select: {
            id: true,
            busNumber: true,
            user: { select: { fullName: true } }, // ✅ nested user.fullName
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (e) {
    console.error("GET /feedbacks error:", e);
    res.status(500).json({ error: "Failed to fetch feedbacks" });
  }
});

/** Admin-only: list feedback for a driver */
r.get("/driver/:driverId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const driverId = Number(req.params.driverId);
    if (!driverId) return res.status(400).json({ error: "Invalid driverId" });

    const items = await prisma.feedback.findMany({
      where: { driverId },
      include: {
        createdBy: { select: { id: true, fullName: true, role: true } }, // User
        driver: {
          select: {
            id: true,
            busNumber: true,
            user: { select: { fullName: true } }, // ✅ nested user.fullName
          },
        },
      },
      orderBy: { id: "desc" },
    });

    res.json(items);
  } catch (e) {
    console.error("GET /feedbacks/driver/:driverId error:", e);
    res.status(500).json({ error: "Failed to fetch driver feedback" });
  }
});

export default r;
