// apps/api/src/routes/admin.incidents.js
import { Router } from "express";
import { prisma } from "../prismaClient.js";

const router = Router();

/* ---------- helper to shape incident for frontend ---------- */
function mapIncident(it) {
  if (!it) return null;

  const drv = it.driver || {};
  const bus = drv.bus || {};
  const trip = it.trip || null;
  const reporter = it.reporter || null;

  // Build a nice reporter name:
  let reporterName = null;
  if (reporter) {
    if (reporter.commuterProfile && reporter.commuterProfile.fullName) {
      reporterName = reporter.commuterProfile.fullName;
    } else if (reporter.email) {
      reporterName = reporter.email;
    }
  }

  return {
    id: it.id,
    status: it.status,
    note: it.note,
    lat: it.lat,
    lng: it.lng,
    evidenceUrl: it.evidenceUrl,
    createdAt: it.createdAt,
    updatedAt: it.updatedAt,

    driverId: it.driverId,
    driverName: drv.fullName || drv.driverId || "Unknown driver",
    busNumber: bus.number || null,
    plateNumber: bus.plate || null,

    tripId: it.tripId,
    tripCode: trip?.id ? `TRIP-${String(trip.id).slice(-6)}` : null,
    tripOrigin: trip?.origin || null,
    tripDestination: trip?.destination || null,

    // send plain strings for categories
    categories: (it.categories || []).map((c) => c.category),

    // reporter display name (may be null if system-generated)
    reporterName,
  };
}

/**
 * GET /admin/incidents
 */
router.get("/", async (req, res) => {
  try {
    const {
      from,
      to,
      status,
      search = "",
      page = "1",
      pageSize = "10",
    } = req.query;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

    const where = {};

    // --- Date range filter ---
    if (from || to) {
      where.createdAt = {};

      if (from) {
        const dFrom = new Date(from);
        if (!isNaN(dFrom)) where.createdAt.gte = dFrom;
      }

      if (to) {
        let dTo = new Date(to);
        if (isNaN(dTo)) dTo = now;
        const today = new Date(todayStr);
        if (dTo > today) dTo = today;
        dTo.setHours(23, 59, 59, 999);
        where.createdAt.lte = dTo;
      }
    }

    // --- status filter (optional) ---
    if (status && status !== "ALL") {
      where.status = status.toUpperCase();
    }

    const searchText = search.trim();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.max(1, parseInt(pageSize, 10) || 10);
    const skip = (pageNum - 1) * take;

    // --- text search ---
    if (searchText) {
      where.OR = [
        { note: { contains: searchText, mode: "insensitive" } },
        {
          driver: {
            fullName: {
              contains: searchText,
              mode: "insensitive",
            },
          },
        },
        {
          driver: {
            bus: {
              number: {
                contains: searchText,
                mode: "insensitive",
              },
            },
          },
        },
        {
          driver: {
            bus: {
              plate: {
                contains: searchText,
                mode: "insensitive",
              },
            },
          },
        },
        // search reporter email / commuter full name
        {
          reporter: {
            OR: [
              {
                email: {
                  contains: searchText,
                  mode: "insensitive",
                },
              },
              {
                commuterProfile: {
                  fullName: {
                    contains: searchText,
                    mode: "insensitive",
                  },
                },
              },
            ],
          },
        },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.incidentReport.count({ where }),
      prisma.incidentReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          driver: {
            include: {
              bus: true,
            },
          },
          trip: true,
          categories: true,
          // ✅ correct relation name
          reporter: {
            include: {
              commuterProfile: true,
            },
          },
        },
      }),
    ]);

    const mapped = items.map(mapIncident);

    res.json({
      items: mapped,
      page: pageNum,
      pageSize: take,
      total,
    });
  } catch (err) {
    console.error("ADMIN /incidents error:", err);
    res.status(500).json({
      message: "Failed to fetch incident reports.",
    });
  }
});

/**
 * PATCH /admin/incidents/:id
 * Body: { status: "PENDING" | "RESOLVED" | "ESCALATED" }
 */
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const rawStatus = req.body?.status;

  if (!rawStatus) {
    return res.status(400).json({ message: "Status is required" });
  }

  const status = String(rawStatus).toUpperCase();
  const ALLOWED = ["PENDING", "RESOLVED", "ESCALATED"];

  if (!ALLOWED.includes(status)) {
    return res.status(400).json({
      message: "Invalid status. Use PENDING, RESOLVED, ESCALATED.",
    });
  }

  try {
    const incident = await prisma.incidentReport.update({
      where: { id }, // id is String in your schema
      data: { status },
      include: {
        driver: {
          include: {
            bus: true,
          },
        },
        trip: true,
        categories: true,
        reporter: {
          include: {
            commuterProfile: true,
          },
        },
      },
    });

    return res.json(mapIncident(incident));
  } catch (e) {
    console.error("PATCH /admin/incidents/:id ERROR:", e);

    if (e.code === "P2025") {
      return res.status(404).json({ message: "Incident not found" });
    }

    return res.status(500).json({ message: "Failed to update status" });
  }
});

export default router;
