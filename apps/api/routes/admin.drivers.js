import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const r = Router();

/**
 * GET /admin/driver-profiles
 * Lists drivers with linked user + bus (if any)
 */
r.get("/driver-profiles", async (_req, res) => {
  try {
    const profiles = await prisma.driverProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
        bus: {
          select: {
            id: true,
            number: true,
            plate: true,
            busType: true, // <- string: "AIRCON" | "NON_AIRCON"
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = profiles.map((p) => {
      const u = p.user;
      const b = p.bus;
      const active =
        typeof u?.status === "string"
          ? u.status.toUpperCase() === "ACTIVE"
          : Boolean(u?.status);

      return {
        id: p.id,
        userId: p.userId ?? null,
        fullName: p.fullName ?? null,
        email: u?.email ?? null,
        phone: u?.phone ? String(u.phone) : null,
        licenseNo: p.licenseNo ?? null,
        birthDate: p.birthDate ?? null,
        address: p.address ?? null,
        isActive: Boolean(p.isActive),
        createdAt: p.createdAt ?? u?.createdAt ?? null,
        busType: p.busType ?? (b?.busType ?? null), // prefer profile.busType
        bus: b
          ? {
              id: b.id,
              number: b.number,
              plate: b.plate,
              busType: b.busType,
              isActive: b.isActive,
            }
          : null,
      };
    });

    res.json({ items, count: items.length });
  } catch (e) {
    console.error("GET /admin/driver-profiles failed:", e);
    res.status(500).json({ error: "Failed to load driver profiles" });
  }
});

export default r;