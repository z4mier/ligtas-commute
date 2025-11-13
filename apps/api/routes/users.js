// apps/api/routes/users.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const r = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

/* ---------- auth helper (local) ---------- */
function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

/* ---------- GET /users/me ---------- */
r.get("/me", requireAuth, async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: {
        commuterProfile: true,
        driverProfile: { include: { bus: true } },
      },
    });
    if (!me) return res.status(404).json({ message: "User not found" });

    // fetch contacts (ordered)
    const contacts = await prisma.emergencyContact.findMany({
      where: { userId: me.id },
      orderBy: { priority: "asc" },
      select: { name: true, phone: true, relation: true, priority: true },
    });

    const commuter = me.commuterProfile;

    res.json({
      id: me.id,
      createdAt: me.createdAt,
      email: me.email,
      phone: me.phone,
      role: me.role,
      status: me.status,
      fullName: me.driverProfile?.fullName ?? commuter?.fullName ?? null,
      address:  me.driverProfile?.address  ?? commuter?.address  ?? null,
      language: commuter?.language ?? "en",
      profileUrl: commuter?.profileUrl ?? null,
      emergencyContacts: contacts,
      driver: me.driverProfile
        ? {
            bus: me.driverProfile.bus
              ? {
                  id: me.driverProfile.bus.id,
                  number: me.driverProfile.bus.number,
                  plate: me.driverProfile.bus.plate,
                  type: me.driverProfile.bus.busType,
                  isActive: me.driverProfile.bus.isActive,
                }
              : null,
          }
        : null,
    });
  } catch (e) {
    console.error("GET /users/me ERROR:", e);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

/* ---------- PATCH /users/me ---------- */
r.patch("/me", requireAuth, async (req, res) => {
  try {
    const Body = z.object({
      fullName: z.string().min(1).optional(),
      email: z.string().email().optional(),  
      phone: z.string().min(6).optional(),
      address: z.string().optional(),
      language: z.string().optional(),
      profileUrl: z.string().optional(),
      emergencyContacts: z
        .array(
          z.object({
            name: z.string().min(1),
            phone: z.string().min(6),
            relation: z.string().optional().nullable(),
            priority: z.number().int().min(0).max(2).optional(),
          })
        )
        .max(3)
        .optional(),
    });

    const input = Body.parse(req.body);
    const userId = req.user.sub;

    const me = await prisma.user.findUnique({
      where: { id: userId },
      include: { commuterProfile: true, driverProfile: true },
    });
    if (!me) return res.status(404).json({ message: "User not found" });

    await prisma.$transaction(async (tx) => {
      // Update User (email/phone)
      if (input.email || input.phone) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(input.email ? { email: input.email.toLowerCase().trim() } : {}),
            ...(input.phone ? { phone: input.phone } : {}),
          },
        });
      }

      // Update Profile (commuter or driver)
      const profUpdate = {
        ...(input.fullName ? { fullName: input.fullName } : {}),
        ...(input.address ? { address: input.address } : {}),
        ...(input.language ? { language: input.language } : {}),
        ...(input.profileUrl ? { profileUrl: input.profileUrl } : {}),
      };

      if (me.commuterProfile) {
        await tx.commuterProfile.update({
          where: { id: me.commuterProfile.id },
          data: profUpdate,
        });
      } else if (me.driverProfile) {
        await tx.driverProfile.update({
          where: { id: me.driverProfile.id },
          data: profUpdate,
        });
      }

      // Replace-set emergency contacts if provided
      if (Array.isArray(input.emergencyContacts)) {
        const list = input.emergencyContacts.slice(0, 3).map((c, i) => ({
          userId,
          name: c.name,
          phone: c.phone,
          relation: c.relation ?? null,
          priority: Number.isInteger(c.priority) ? c.priority : i,
        }));

        await tx.emergencyContact.deleteMany({ where: { userId } });
        if (list.length > 0) {
          await tx.emergencyContact.createMany({ data: list, skipDuplicates: true });
        }
      }
    });

    // Return fresh state
    const contacts = await prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: { priority: "asc" },
      select: { name: true, phone: true, relation: true, priority: true },
    });

    res.json({ message: "Updated", emergencyContacts: contacts });
  } catch (e) {
    console.error("PATCH /users/me ERROR:", e);
    if (e instanceof z.ZodError)
      return res.status(400).json({ message: e.errors[0]?.message || "Invalid input" });
    if (e?.code === "P2002")
      return res.status(409).json({ message: "Duplicate email/phone/contact" });
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------- PATCH /users/change-password ---------- */
r.patch("/change-password", requireAuth, async (req, res) => {
  try {
    const Body = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(6),
    });
    const { currentPassword, newPassword } = Body.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(currentPassword, user.password || "");
    if (!ok) return res.status(400).json({ message: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hash } });

    res.json({ message: "Password changed" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Update failed" });
  }
});

export default r;
