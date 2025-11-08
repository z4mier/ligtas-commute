import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const r = Router();

/* ---------------- helpers ---------------- */

function mapForList(row) {
  // row is Report with: driver { user }, createdBy
  const d = row.driver;
  const u = d?.user;

  return {
    id: row.id,
    code: `EMG${row.id}`, // keep code pattern for emergencies (adjust if needed)
    type: row.type,        // "EMERGENCY" | ...
    status: row.status,    // "OPEN" | "IN_REVIEW" | ...
    busNumber: d?.busNumber || null,
    route: d?.route || null,
    driverName: u?.fullName || null,
    location: null,        // no location column in your schema; keep null
    message: row.note || null,
    source: "Emergency Button", // this route is for emergencies coming from the button
    createdAt: row.createdAt,
    updatedAt: row.createdAt,   // schema has no updatedAt on Report
    isEmergency: row.type === "EMERGENCY",
  };
}

function matchQ(item, q) {
  if (!q) return true;
  const hay = [
    item.busNumber,
    item.route,
    item.driverName,
    item.message,
    item.code,
    item.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

async function resolveCreatedById() {
  // Prefer explicit env first
  const envId = Number(process.env.BRIDGE_ADMIN_ID || "");
  if (!Number.isNaN(envId) && envId > 0) {
    const exists = await prisma.user.findUnique({ where: { id: envId } });
    if (exists) return envId;
  }
  // Fallback: first ADMIN user
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  return admin?.id || null;
}

async function resolveDriverId({ driverId, busNumber, plateNumber }) {
  if (driverId) return Number(driverId);

  if (busNumber) {
    const d = await prisma.driver.findFirst({
      where: { busNumber },
      select: { id: true },
    });
    if (d) return d.id;
  }

  if (plateNumber) {
    const d = await prisma.driver.findFirst({
      where: { plateNumber },
      select: { id: true },
    });
    if (d) return d.id;
  }

  return null;
}

/* ---------------- list endpoints (admin UI) ---------------- */

r.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const q = String(req.query.q || "").toLowerCase();

    const rows = await prisma.report.findMany({
      include: {
        driver: { include: { user: true } },
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = rows.map(mapForList).filter((x) => matchQ(x, q));
    res.json(mapped);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load reports" });
  }
});

r.get("/emergencies", requireAuth, requireAdmin, async (req, res) => {
  try {
    const q = String(req.query.q || "").toLowerCase();

    const rows = await prisma.report.findMany({
      where: { type: "EMERGENCY" },
      include: {
        driver: { include: { user: true } },
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = rows.map(mapForList).filter((x) => matchQ(x, q));
    res.json(mapped);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load emergency incidents" });
  }
});

/* ---------------- create from Uno bridge ---------------- */

/**
 * POST /reports/emergency
 * Accepts any of:
 * - driverId (preferred)
 * - or busNumber / plateNumber (it will resolve the driver)
 * Optional: message, latitude, longitude
 */
r.post("/emergency", async (req, res) => {
  try {
    const {
      driverId: bodyDriverId,
      busNumber,
      plateNumber,
      message = "Emergency button pressed!",
      latitude = null,
      longitude = null,
    } = req.body || {};

    // Resolve driverId
    const driverId = await resolveDriverId({
      driverId: bodyDriverId,
      busNumber,
      plateNumber,
    });
    if (!driverId) {
      return res.status(400).json({ error: "Driver not found (provide driverId or bus/plate)" });
    }

    // Resolve author
    const createdById = await resolveCreatedById();
    if (!createdById) {
      return res.status(500).json({ error: "No ADMIN user available to attribute report" });
    }

    const created = await prisma.report.create({
      data: {
        type: "EMERGENCY",
        status: "OPEN",
        note: message,
        driver: { connect: { id: driverId } },
        createdBy: { connect: { id: createdById } },
        latitude: latitude !== null ? Number(latitude) : null,
        longitude: longitude !== null ? Number(longitude) : null,
      },
    });

    res.json({ ok: true, id: created.id, createdAt: created.createdAt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to record emergency" });
  }
});

export default r;
