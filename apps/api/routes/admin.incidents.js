// apps/api/src/routes/admin.incidents.js
import { Router } from "express";
import { prisma } from "../prismaClient.js"; // adjust path if different

const router = Router();

/**
 * GET /admin/incidents
 * Query params:
 *  - from: "YYYY-MM-DD"
 *  - to:   "YYYY-MM-DD"
 *  - status: PENDING / RESOLVED / ESCALATED... (optional)
 *  - search: text search (driver name, note, bus number, etc.)
 *  - page:   1-based page (default 1)
 *  - pageSize: default 10
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

    // --- Date range (clamped to today for "to") ---
    const where = {};

    if (from || to) {
      where.createdAt = {};

      if (from) {
        const dFrom = new Date(from);
        if (!isNaN(dFrom)) {
          where.createdAt.gte = dFrom;
        }
      }

      if (to) {
        let dTo = new Date(to);
        if (isNaN(dTo)) {
          dTo = now;
        }
        // clamp to today (no future date)
        const today = new Date(todayStr);
        if (dTo > today) dTo = today;

        // include whole day
        dTo.setHours(23, 59, 59, 999);
        where.createdAt.lte = dTo;
      }
    }

    // --- status filter (optional) ---
    if (status && status !== "ALL") {
      where.status = status.toUpperCase();
    }

    // --- text search (driver name, note, bus, reporter) ---
    const searchText = search.trim();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.max(1, parseInt(pageSize, 10) || 10);
    const skip = (pageNum - 1) * take;

    // Build OR search only if naa gyud text
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
              bus: true, // assumes DriverProfile has relation to Bus
            },
          },
          trip: true,
          categories: true,
        },
      }),
    ]);

    // shape data a bit for the frontend
    const mapped = items.map((it) => {
      const drv = it.driver || {};
      const bus = drv.bus || {};
      const trip = it.trip || null;

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

        categories: (it.categories || []).map((c) => c.name),
      };
    });

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

export default router;
