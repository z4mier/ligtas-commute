// apps/api/routes/driver.reports.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../src/middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * GET /driver/reports
 * Response:
 * {
 *   totalReports: number,
 *   items: [
 *     {
 *       id,
 *       message,
 *       status,
 *       createdAt,
 *       categories: string[],
 *       hasEvidence: boolean
 *     }
 *   ]
 * }
 *
 * Notes:
 * - Anonymous: we DO NOT return reporterId / commuter info.
 */
router.get("/reports", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId || null;
    console.log("[/driver/reports] userId =", userId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get driver profile using userId (unique)
    const driver = await prisma.driverProfile.findUnique({
      where: { userId },
    });

    console.log("[/driver/reports] driver =", driver);

    if (!driver) {
      return res.status(404).json({ error: "Driver profile not found" });
    }

    // Get incident reports for this driver
    const reports = await prisma.incidentReport.findMany({
      where: { driverId: driver.driverId },
      include: {
        categories: true, // IncidentCategory[]
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    console.log(
      "[/driver/reports] reports count =",
      reports.length,
      "driverId =",
      driver.driverId
    );

    const totalReports = reports.length;

    return res.json({
      totalReports,
      items: reports.map((r) => ({
        id: r.id,
        message: r.note || "(No details provided)",
        status: r.status || "PENDING",
        createdAt: r.createdAt,
        categories: Array.isArray(r.categories)
          ? r.categories.map((c) => c.category)
          : [],
        hasEvidence: !!r.evidenceUrl,
      })),
    });
  } catch (e) {
    console.error("[GET /driver/reports] error =", e);
    return res
      .status(500)
      .json({ error: e.message || "Failed to load driver reports" });
  }
});

export default router;
