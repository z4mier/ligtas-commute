import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import bcrypt from "bcryptjs";

const r = Router();

/**
 * GET /admins
 * ✅ Admin-only: List all admins (excluding password)
 */
r.get("/", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            address: true,
            profileUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: { id: "desc" },
    });
    res.json(admins);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch admins" });
  }
});

/* ------------------------------------------------------------------ */
/*                         SELF (/admins/me)                           */
/* ------------------------------------------------------------------ */

/**
 * GET /admins/me
 * ✅ Admin-only: Get the currently signed-in admin profile
 */
r.get("/me", requireAuth, requireAdmin, async (req, res) => {
  try {
    const me = await prisma.admin.findUnique({
      where: { userId: req.user.id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            address: true,
            profileUrl: true,
            createdAt: true,
          },
        },
      },
    });
    if (!me) return res.status(404).json({ error: "Admin not found" });

    res.json({
      id: me.user.id,
      fullName: me.user.fullName,
      email: me.user.email,
      phone: me.user.phone,
      address: me.user.address,
      profileUrl: me.user.profileUrl,
      createdAt: me.user.createdAt,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch admin info" });
  }
});

/**
 * PATCH /admins/me
 * ✅ Admin-only: Update own profile (not password)
 */
r.patch("/me", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { fullName, email, phone, address, profileUrl } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { fullName, email, phone, address, profileUrl },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        address: true,
        profileUrl: true,
      },
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    if (e?.code === "P2002")
      return res.status(409).json({ error: "Email/Phone already in use" });
    res.status(500).json({ error: "Failed to update admin profile" });
  }
});

/**
 * PATCH /admins/me/password
 * ✅ Admin-only: Change own password
 */
r.patch("/me/password", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed },
    });
    res.json({ success: true, message: "Password updated successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update password" });
  }
});

/* ------------------------------------------------------------------ */
/*                      EXISTING ID-BASED ROUTES                       */
/* ------------------------------------------------------------------ */

/**
 * PATCH /admins/:id
 * ✅ Admin-only: Update admin’s profile (not password)
 */
r.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { fullName, email, phone, address, profileUrl } = req.body;

    const updated = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { fullName, email, phone, address, profileUrl },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        address: true,
        profileUrl: true,
      },
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    if (e.code === "P2002")
      return res.status(409).json({ error: "Email/Phone already in use" });
    res.status(500).json({ error: "Failed to update admin profile" });
  }
});

export default r;
