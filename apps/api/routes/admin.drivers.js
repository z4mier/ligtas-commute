// apps/api/src/routes/admin.drivers.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";              // ⬅️ QR for buses

const prisma = new PrismaClient();
const r = Router();

/* -----------------------------------------------------------
   Helpers
----------------------------------------------------------- */

function toDriverDto(d) {
  // d = DriverProfile with { user, bus }
  const dutyStatus = d.status || "OFF_DUTY";
  const onDuty = dutyStatus === "ON_DUTY";

  return {
    id: d.driverId,
    userId: d.userId,
    fullName: d.fullName,
    licenseNo: d.licenseNo,
    birthDate: d.birthDate,
    address: d.address,
    phone: d.phone || d.user?.phone || null,
    email: d.user?.email || null,

    busType: d.busType,

    bus: d.bus
      ? {
          id: d.bus.id,
          number: d.bus.number,
          plate: d.bus.plate,
          busType: d.bus.busType,
          isActive: d.bus.isActive,
          corridor: d.bus.corridor,
          routeId: d.bus.routeId,
          forwardRoute: d.bus.forwardRoute,
          returnRoute: d.bus.returnRoute,
          qrUrl: d.bus.qrUrl ?? null,
        }
      : null,

    // account-level
    isActive: d.isActive,
    status: d.isActive ? "ACTIVE" : "INACTIVE", // 🔹 keep old behavior for admin UI

    // duty-level (for on duty / off duty)
    dutyStatus,
    onDuty,

    createdAt: d.createdAt,
  };
}

/**
 * Create or fetch a Bus based on payload.
 * - If busId is present → just fetch existing bus.
 * - If (busNo + plateNumber + vehicleType) → find-or-create by number.
 *   When creating a new Bus here, we also generate a QR and store it.
 */
async function resolveBusForPayload(input) {
  // 1) Explicit busId
  if (input.busId) {
    const bus = await prisma.bus.findUnique({
      where: { id: input.busId },
    });
    if (!bus) throw new Error("Bus not found");
    return bus;
  }

  // 2) busNo + plateNumber + vehicleType
  if (input.busNo && input.plateNumber && input.vehicleType) {
    // Try existing by number
    let bus = await prisma.bus.findFirst({
      where: { number: input.busNo },
    });

    // If not found → create new Bus
    if (!bus) {
      bus = await prisma.bus.create({
        data: {
          number: input.busNo,
          plate: input.plateNumber,
          busType: input.vehicleType,
          isActive: true,
          status: "ACTIVE",
          // corridor / routeId / forward/returnRoute can stay null here
        },
      });

      // Generate QR payload for this bus
      const payload = {
        type: "bus",
        busId: bus.id,
        number: bus.number,
        plate: bus.plate,
        busType: bus.busType,
        corridor: bus.corridor,
        routeId: bus.routeId,
      };

      const qrUrl = await QRCode.toDataURL(JSON.stringify(payload), {
        margin: 1,
        scale: 6,
      });

      bus = await prisma.bus.update({
        where: { id: bus.id },
        data: { qrUrl },
      });
    }

    return bus;
  }

  // 3) No bus info
  return null;
}

/**
 * Core driver creation logic shared by several routes.
 */
async function createDriverInternal(body) {
  const schema = z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(6),
    licenseNo: z.string().min(1),
    birthDate: z.union([z.string(), z.date()]),
    address: z.string().min(1),
    vehicleType: z.enum(["AIRCON", "NON_AIRCON"]).optional(),
    busId: z.string().optional(),
    busNo: z.string().optional(),
    plateNumber: z.string().optional(),
  });

  const input = schema.parse(body);

  // Parse birth date
  const birth =
    input.birthDate instanceof Date
      ? input.birthDate
      : new Date(input.birthDate);
  if (Number.isNaN(birth.getTime())) {
    const err = new Error("Invalid birthDate");
    err.status = 400;
    throw err;
  }

  const emailKey = input.email.toLowerCase().trim();

  // Ensure no duplicate user (email or phone)
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailKey }, { phone: input.phone }],
    },
  });
  if (existingUser) {
    const err = new Error("Email or phone already registered");
    err.status = 409;
    throw err;
  }

  // Resolve / create bus if provided
  let bus = null;
  if (input.busId || (input.busNo && input.plateNumber && input.vehicleType)) {
    bus = await resolveBusForPayload(input);
  }

  // Simple temp password for drivers (they can change later)
  const tempPassword = "Driver123!";
  const hash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      email: emailKey,
      phone: input.phone,
      password: hash,
      role: "DRIVER",
      status: "ACTIVE",
      mustChangePassword: true,
      driverProfile: {
        create: {
          fullName: input.fullName,
          licenseNo: input.licenseNo,
          birthDate: birth,
          address: input.address,
          phone: input.phone,
          busId: bus ? bus.id : null,
          busType: input.vehicleType ?? (bus ? bus.busType : "AIRCON"),
          isActive: true,            // account-level active
          status: "OFF_DUTY",        // 🔹 duty-level default
        },
      },
    },
    include: {
      driverProfile: { include: { bus: true } },
    },
  });

  return {
    userId: user.id,
    driver: toDriverDto(user.driverProfile),
    tempPassword,
  };
}

/* -----------------------------------------------------------
   GET /admin/driver-profiles
   → list all drivers for admin UI
----------------------------------------------------------- */
r.get("/driver-profiles", async (_req, res) => {
  try {
    const drivers = await prisma.driverProfile.findMany({
      include: {
        user: { select: { email: true, phone: true, createdAt: true } },
        bus: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      items: drivers.map(toDriverDto),
    });
  } catch (e) {
    console.error("GET /admin/driver-profiles ERROR:", e);
    res.status(500).json({ message: "Failed to load drivers" });
  }
});

/* -----------------------------------------------------------
   GET /admin/driver-profiles/:id
----------------------------------------------------------- */
r.get("/driver-profiles/:id", async (req, res) => {
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);

    const d = await prisma.driverProfile.findUnique({
      where: { driverId: id },
      include: {
        user: { select: { email: true, phone: true, createdAt: true } },
        bus: true,
      },
    });

    if (!d) return res.status(404).json({ message: "Driver not found" });

    res.json(toDriverDto(d));
  } catch (e) {
    console.error("GET /admin/driver-profiles/:id ERROR:", e);
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid id" });
    }
    res.status(500).json({ message: "Failed to load driver" });
  }
});

/* -----------------------------------------------------------
   POST /admin/driver-profiles
   (main create endpoint used by your admin UI)
----------------------------------------------------------- */
r.post("/driver-profiles", async (req, res) => {
  try {
    const result = await createDriverInternal(req.body);
    res.status(201).json({ message: "Driver registered", ...result });
  } catch (e) {
    console.error("POST /admin/driver-profiles ERROR:", e);
    if (e instanceof z.ZodError) {
      return res.status(400).json({
        message: e.errors[0]?.message || "Invalid input",
      });
    }
    if (e.status) {
      return res.status(e.status).json({ message: e.message });
    }
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------------------------
   PATCH /admin/driver-status
   Body: { driverId, status: "ACTIVE" | "INACTIVE" }
   - toggles DriverProfile.isActive
   - when INACTIVE → frees the bus for re-use
   - also forces dutyStatus to OFF_DUTY when deactivated
----------------------------------------------------------- */
r.patch("/driver-status", async (req, res) => {
  try {
    const schema = z.object({
      driverId: z.string().min(1),
      status: z.enum(["ACTIVE", "INACTIVE"]),
    });
    const { driverId, status } = schema.parse(req.body);

    const driver = await prisma.driverProfile.findUnique({
      where: { driverId },
    });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const isActive = status === "ACTIVE";
    let busId = driver.busId;

    // When deactivating, free the bus (so it appears as available again)
    if (!isActive) {
      busId = null;
    }

    const updated = await prisma.driverProfile.update({
      where: { driverId },
      data: {
        isActive,
        busId,
        // if deactivated, make sure they are OFF_DUTY as well
        ...(isActive ? {} : { status: "OFF_DUTY" }),
      },
      include: {
        user: { select: { email: true, phone: true, createdAt: true } },
        bus: true,
      },
    });

    res.json({
      message: `Driver ${isActive ? "activated" : "deactivated"}`,
      driver: toDriverDto(updated),
    });
  } catch (e) {
    console.error("PATCH /admin/driver-status ERROR:", e);
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------------------------
   PATCH /admin/driver-profiles/:id
   (basic edit for name/email/phone/address/license/bus)
----------------------------------------------------------- */
r.patch("/driver-profiles/:id", async (req, res) => {
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);

    const schema = z.object({
      fullName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(6).optional(),
      address: z.string().optional(),
      licenseNo: z.string().min(1).optional(),
      birthDate: z.union([z.string(), z.date()]).optional(),
      vehicleType: z.enum(["AIRCON", "NON_AIRCON"]).optional(),
      busId: z.string().optional(),
      busNo: z.string().optional(),
      plateNumber: z.string().optional(),
    });

    const input = schema.parse(req.body);

    const driver = await prisma.driverProfile.findUnique({
      where: { driverId: id },
    });
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    let bus = null;
    if (
      input.busId ||
      (input.busNo && input.plateNumber && input.vehicleType)
    ) {
      bus = await resolveBusForPayload(input);
    }

    const updates = {
      ...(input.fullName ? { fullName: input.fullName } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.licenseNo ? { licenseNo: input.licenseNo } : {}),
      ...(input.birthDate
        ? {
            birthDate:
              input.birthDate instanceof Date
                ? input.birthDate
                : new Date(input.birthDate),
          }
        : {}),
      ...(bus ? { busId: bus.id, busType: bus.busType } : {}),
      ...(input.vehicleType && !bus ? { busType: input.vehicleType } : {}),
    };

    const [updatedDriver] = await prisma.$transaction([
      prisma.driverProfile.update({
        where: { driverId: id },
        data: updates,
        include: {
          user: { select: { email: true, phone: true, createdAt: true } },
          bus: true,
        },
      }),
      ...(input.email || input.phone
        ? [
            prisma.user.update({
              where: { id: driver.userId },
              data: {
                ...(input.email
                  ? { email: input.email.toLowerCase().trim() }
                  : {}),
                ...(input.phone ? { phone: input.phone } : {}),
              },
            }),
          ]
        : []),
    ]);

    res.json({
      message: "Driver updated",
      driver: toDriverDto(updatedDriver),
    });
  } catch (e) {
    console.error("PATCH /admin/driver-profiles/:id ERROR:", e);
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input" });
    }
    if (e?.code === "P2002") {
      return res
        .status(409)
        .json({ message: "Email or phone already in use" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------------------------
   Legacy aliases for compatibility with your frontend fallbacks
   - POST /admin/create-driver
   - GET  /admin/drivers
   - POST /admin/drivers
----------------------------------------------------------- */

r.post("/create-driver", async (req, res) => {
  try {
    const result = await createDriverInternal(req.body);
    res.status(201).json({ message: "Driver registered", ...result });
  } catch (e) {
    console.error("POST /admin/create-driver ERROR:", e);
    if (e instanceof z.ZodError) {
      return res.status(400).json({
        message: e.errors[0]?.message || "Invalid input",
      });
    }
    if (e.status) {
      return res.status(e.status).json({ message: e.message });
    }
    res.status(500).json({ message: "Server error" });
  }
});

r.get("/drivers", async (_req, res) => {
  try {
    const drivers = await prisma.driverProfile.findMany({
      include: {
        user: { select: { email: true, phone: true, createdAt: true } },
        bus: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(drivers.map(toDriverDto));
  } catch (e) {
    console.error("GET /admin/drivers ERROR:", e);
    res.status(500).json({ message: "Failed to load drivers" });
  }
});

r.post("/drivers", async (req, res) => {
  try {
    const result = await createDriverInternal(req.body);
    res.status(201).json({ message: "Driver registered", ...result });
  } catch (e) {
    console.error("POST /admin/drivers ERROR:", e);
    if (e instanceof z.ZodError) {
      return res.status(400).json({
        message: e.errors[0]?.message || "Invalid input",
      });
    }
    if (e.status) {
      return res.status(e.status).json({ message: e.message });
    }
    res.status(500).json({ message: "Server error" });
  }
});

export default r;
