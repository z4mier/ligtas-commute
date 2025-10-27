// apps/api/routes/users.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const r = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

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
  const me = await prisma.user.findUnique({
    where: { id: req.user.sub },
    include: { commuterProfile: true, driverProfile: true },
  });
  if (!me) return res.status(404).json({ message: "User not found" });

  const prof = me.commuterProfile || me.driverProfile || {};
  res.json({
    id: me.id,
    email: me.email,
    phone: me.phone,
    role: me.role,
    status: me.status,
    fullName: prof.fullName || "",
    address: prof.address || "",
    language: prof.language || "en",
    points: Number(prof.points || 0),
  });
});

/* ---------- PATCH /users/me ---------- */
r.patch("/me", requireAuth, async (req, res) => {
  try {
    const Body = z.object({
      fullName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      language: z.string().optional(),
    });
    const data = Body.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { commuterProfile: true, driverProfile: true },
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    await prisma.$transaction(async (tx) => {
      if (data.email || data.phone) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            ...(data.email ? { email: data.email } : {}),
            ...(data.phone ? { phone: data.phone } : {}),
          },
        });
      }

      const profileUpdate = {
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.address ? { address: data.address } : {}),
        ...(data.language ? { language: data.language } : {}),
      };

      if (user.commuterProfile) {
        await tx.commuterProfile.update({
          where: { id: user.commuterProfile.id },
          data: profileUpdate,
        });
      } else if (user.driverProfile) {
        await tx.driverProfile.update({
          where: { id: user.driverProfile.id },
          data: profileUpdate,
        });
      }
    });

    res.json({ message: "Profile updated" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Update failed" });
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

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash },
    });

    res.json({ message: "Password changed" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Update failed" });
  }
});

export default r;
