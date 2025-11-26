// apps/api/routes/iot.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

const iotIncidentSchema = z.object({
  code: z.string().min(1), // "YELLOW" | "ORANGE" | "RED"
  message: z.string().min(1),

  driverId: z.string().min(1).optional(),
  busNumber: z.string().min(1).optional(),
  plateNumber: z.string().min(1).optional(),

  latitude: z.number().optional(),
  longitude: z.number().optional(),

  deviceId: z.string().optional(),
});

/**
 * With app.use("/iot", iotRouter) in index:
 * → this endpoint becomes POST /iot/emergency
 */
router.post("/emergency", async (req, res) => {
  try {
    const payload = iotIncidentSchema.parse(req.body || {});
    const codeUpper = payload.code.toUpperCase();

    let busId = null;
    let busNumber = payload.busNumber || null;
    let busPlate = payload.plateNumber || null;
    let driverProfileId = null;
    let finalDeviceId = payload.deviceId || null;

    if (payload.busNumber || payload.plateNumber) {
      const bus = await prisma.bus.findFirst({
        where: {
          OR: [
            payload.busNumber
              ? { number: String(payload.busNumber) }
              : undefined,
            payload.plateNumber
              ? { plate: String(payload.plateNumber) }
              : undefined,
          ].filter(Boolean),
        },
        select: {
          id: true,
          number: true,
          plate: true,
          deviceId: true,
        },
      });

      if (bus) {
        busId = bus.id;
        busNumber = bus.number;
        busPlate = bus.plate;
        if (!finalDeviceId && bus.deviceId) {
          finalDeviceId = bus.deviceId;
        }

        const driver = await prisma.driverProfile.findFirst({
          where: {
            busId: bus.id,
            isActive: true,
          },
          orderBy: { createdAt: "desc" },
          select: { driverId: true },
        });

        if (driver) {
          driverProfileId = driver.driverId;
        }
      }
    }

    const incident = await prisma.emergencyIncident.create({
      data: {
        deviceId: finalDeviceId || "UNKNOWN_DEVICE",

        code: codeUpper,
        message: payload.message,

        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,

        status: "PENDING",

        busId,
        driverProfileId,

        busNumber: busNumber || null,
        busPlate: busPlate || null,
      },
    });

    return res.status(201).json({
      ok: true,
      message: "Emergency incident recorded from IoT device.",
      incident,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        ok: false,
        message: "Invalid payload from IoT device",
        errors: err.errors,
      });
    }

    console.error("POST /iot/emergency ERROR:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to record emergency incident",
    });
  }
});

/**
 * With app.use("/iot", iotRouter):
 * → GET /iot/emergencies
 */
router.get("/emergencies", async (req, res) => {
  try {
    const items = await prisma.emergencyIncident.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        bus: { select: { number: true, plate: true } },
        driver: { select: { fullName: true } },
      },
    });

    return res.json(items);
  } catch (err) {
    console.error("GET /iot/emergencies ERROR:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to load IoT emergencies",
    });
  }
});

/**
 * With app.use("/iot", iotRouter):
 * → POST /iot/emergencies/:id/resolve
 */
router.post("/emergencies/:id/resolve", async (req, res) => {
  const { id } = req.params;

  try {
    const incident = await prisma.emergencyIncident.update({
      where: { id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });

    return res.json({
      ok: true,
      message: "Emergency incident resolved.",
      incident,
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({
        ok: false,
        message: "Incident not found.",
      });
    }

    console.error("POST /iot/emergencies/:id/resolve ERROR:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to resolve emergency incident.",
    });
  }
});

/**
 * GET /iot/ping
 */
router.get("/ping", (_req, res) => {
  res.json({ ok: true, message: "IOT route alive" });
});

export default router;
