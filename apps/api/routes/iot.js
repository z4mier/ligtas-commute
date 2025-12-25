import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

/* =====================================================
   DRIVER → IOT STATUS REPORT
   ===================================================== */

/**
 * Accepts many driver endpoints (para dili mag 404 bisan lahi ang mobile route)
 *
 * Main:
 *  - POST /iot/status-report
 *
 * Aliases:
 *  - POST /iot/status-reports
 *  - POST /iot/driver/iot/report
 *  - POST /iot/driver/iot/status-report
 *  - POST /iot/driver/status-report
 *  - POST /iot/driver/iot-status
 *  - POST /iot/drivers/iot/report
 */
async function handleStatusReport(req, res) {
  try {
    const schema = z.object({
      // allow other field names used by mobile
      status: z.any().optional(),
      condition: z.any().optional(),
      state: z.any().optional(),

      deviceId: z.string().optional(),
      busId: z.string().optional(),
      busNumber: z.any().optional(),
      plateNumber: z.any().optional(),
      driverId: z.string().optional(), // optional support

      notes: z.string().optional(),
      message: z.string().optional(),
      remark: z.string().optional(),
    });

    const payload = schema.parse(req.body || {});

    // -------------------------
    // 1) normalize status text
    // -------------------------
    const raw =
      (payload.status ??
        payload.condition ??
        payload.state ??
        payload.message ??
        payload.remark ??
        "")
        .toString()
        .trim();

    if (!raw) {
      return res.status(400).json({
        ok: false,
        message: "Missing status/condition",
      });
    }

    const s = raw
      .toUpperCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/g, "");

    // normalize to admin-friendly values
    const status =
      s === "WORKING" || s === "ONLINE" || s === "ACTIVE" || s === "OK"
        ? "ONLINE"
        : s === "NOT_WORKING" ||
          s === "NOTWORKING" ||
          s === "OFFLINE" ||
          s === "DOWN"
        ? "OFFLINE"
        : s === "NEEDS_MAINTENANCE" ||
          s === "NEED_MAINTENANCE" ||
          s === "MAINTENANCE"
        ? "MAINTENANCE"
        : s;

    // -------------------------
    // 2) find bus using many ways
    // -------------------------
    let bus = null;

    const busNumber = payload.busNumber != null ? String(payload.busNumber).trim() : "";
    const plateNumber = payload.plateNumber != null ? String(payload.plateNumber).trim() : "";

    // normalize plate: remove spaces + hyphens (helps match "LGT 123" vs "LGT123")
    const plateCompact = plateNumber.replace(/[\s-]+/g, "");

    // A) by busId (BEST)
    if (payload.busId) {
      bus = await prisma.bus.findUnique({ where: { id: payload.busId } });
    }

    // B) by deviceId
    if (!bus && payload.deviceId) {
      bus = await prisma.bus.findFirst({
        where: { deviceId: payload.deviceId },
      });
    }

    // C) by busNumber / plateNumber (case-insensitive)
    if (!bus && (busNumber || plateNumber)) {
      bus = await prisma.bus.findFirst({
        where: {
          OR: [
            busNumber
              ? {
                  number: {
                    equals: busNumber,
                    mode: "insensitive",
                  },
                }
              : undefined,
            plateNumber
              ? {
                  plate: {
                    equals: plateNumber,
                    mode: "insensitive",
                  },
                }
              : undefined,
            plateCompact
              ? {
                  plate: {
                    equals: plateCompact,
                    mode: "insensitive",
                  },
                }
              : undefined,
          ].filter(Boolean),
        },
      });
    }

    // D) by driverId -> find driverProfile busId (if your schema supports it)
    if (!bus && payload.driverId) {
      try {
        const dp = await prisma.driverProfile.findFirst({
          where: {
            OR: [{ driverId: payload.driverId }, { id: payload.driverId }],
          },
          select: { busId: true },
        });

        if (dp?.busId) {
          bus = await prisma.bus.findUnique({ where: { id: dp.busId } });
        }
      } catch {
        // ignore if driverProfile model doesn't exist
      }
    }

    if (!bus) {
      return res.status(404).json({
        ok: false,
        message:
          "Bus / device not found. Provide busId, deviceId, busNumber/plateNumber, or driverId.",
        debug:
          process.env.NODE_ENV !== "production"
            ? {
                busId: payload.busId ?? null,
                deviceId: payload.deviceId ?? null,
                busNumber: busNumber || null,
                plateNumber: plateNumber || null,
                plateCompact: plateCompact || null,
                driverId: payload.driverId ?? null,
              }
            : undefined,
      });
    }

    // -------------------------
    // 3) update bus status (admin sees this)
    // -------------------------
    await prisma.bus.update({
      where: { id: bus.id },
      data: { status },
    });

    return res.status(201).json({
      ok: true,
      message: "IoT status report sent successfully",
      data: {
        busId: bus.id,
        deviceId: bus.deviceId,
        busNumber: bus.number,
        plateNumber: bus.plate,
        status,
        notes: payload.notes ?? null,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        ok: false,
        message: "Invalid IoT report payload",
        errors: err.errors,
      });
    }

    console.error("IOT STATUS REPORT ERROR:", err?.message || err);
    return res.status(500).json({
      ok: false,
      message: "Failed to send IoT report",
      error:
        process.env.NODE_ENV !== "production"
          ? String(err?.message || err)
          : undefined,
    });
  }
}

// ✅ Main + aliases
router.post("/status-report", handleStatusReport);
router.post("/status-reports", handleStatusReport);
router.post("/driver/iot/report", handleStatusReport);
router.post("/driver/iot/status-report", handleStatusReport);
router.post("/driver/status-report", handleStatusReport);
router.post("/driver/iot-status", handleStatusReport);
router.post("/drivers/iot/report", handleStatusReport);

/* =====================================================
   ADMIN → IOT DEVICES (Monitoring)
   ===================================================== */

router.get("/devices", async (_req, res) => {
  try {
    const buses = await prisma.bus.findMany({
      where: { deviceId: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        number: true,
        plate: true,
        deviceId: true,
        status: true,
      },
    });

    const items = buses.map((b) => ({
      busId: b.id,
      deviceId: b.deviceId,
      busNumber: b.number,
      plateNumber: b.plate,
      status: b.status,
    }));

    return res.json({ ok: true, items });
  } catch (err) {
    console.error("GET /iot/devices ERROR:", err?.message || err);
    return res.status(500).json({
      ok: false,
      message: "Failed to load IoT devices",
      error:
        process.env.NODE_ENV !== "production"
          ? String(err?.message || err)
          : undefined,
    });
  }
});

/* =====================================================
   ADMIN → IOT STATUS REPORTS (History)
   ===================================================== */

router.get("/status-reports", async (_req, res) => {
  try {
    return res.json({ ok: true, items: [] });
  } catch (err) {
    console.error("GET /iot/status-reports ERROR:", err?.message || err);
    return res.status(500).json({
      ok: false,
      message: "Failed to load IoT status reports",
      error:
        process.env.NODE_ENV !== "production"
          ? String(err?.message || err)
          : undefined,
    });
  }
});

/* =====================================================
   EXISTING IOT EMERGENCY ROUTES (UNCHANGED)
   ===================================================== */

router.post("/emergency", async (req, res) => {
  try {
    const payload = z
      .object({
        code: z.string(),
        message: z.string(),
        deviceId: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      })
      .parse(req.body || {});

    const incident = await prisma.emergencyIncident.create({
      data: {
        code: payload.code.toUpperCase(),
        message: payload.message,
        deviceId: payload.deviceId || "UNKNOWN",
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        status: "PENDING",
      },
    });

    return res.status(201).json({ ok: true, incident });
  } catch (err) {
    console.error("POST /iot/emergency ERROR:", err?.message || err);
    return res.status(500).json({
      ok: false,
      message: "Failed to record emergency",
      error:
        process.env.NODE_ENV !== "production"
          ? String(err?.message || err)
          : undefined,
    });
  }
});

router.get("/emergencies", async (_req, res) => {
  try {
    const incidents = await prisma.emergencyIncident.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.json(incidents);
  } catch (err) {
    console.error("GET /iot/emergencies ERROR:", err?.message || err);
    return res.status(500).json({
      ok: false,
      message: "Failed to load emergencies",
      error:
        process.env.NODE_ENV !== "production"
          ? String(err?.message || err)
          : undefined,
    });
  }
});

router.post("/emergencies/:id/resolve", async (req, res) => {
  try {
    const incident = await prisma.emergencyIncident.update({
      where: { id: req.params.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });

    return res.json({ ok: true, incident });
  } catch (err) {
    console.error("RESOLVE EMERGENCY ERROR:", err?.message || err);
    return res.status(500).json({
      ok: false,
      message: "Failed to resolve incident",
      error:
        process.env.NODE_ENV !== "production"
          ? String(err?.message || err)
          : undefined,
    });
  }
});

export default router;
