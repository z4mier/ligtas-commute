// apps/api/routes/admin.settings.js
import express from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

const router = express.Router();

/* GET /admin/profile
   → get current admin email + phone
*/
router.get("/profile", async (req, res) => {
  try {
    const userId = req.user?.sub; // 👈 JWT uses `sub` as user id

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== "ADMIN") {
      return res.status(404).json({ message: "Admin not found." });
    }

    return res.json({
      email: user.email ?? "",
      phone: user.phone ?? "",
    });
  } catch (err) {
    console.error("ADMIN PROFILE GET ERROR:", err);
    return res.status(500).json({ message: "Failed to load profile." });
  }
});

/* PATCH /admin/profile
   body: { email, phone }
*/
router.patch("/profile", async (req, res) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const { email, phone } = req.body || {};

    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required." });
    }
    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ message: "Phone is required." });
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    const PHONE_DIGITS_RE = /^\d{11}$/;

    const trimmedEmail = email.trim().toLowerCase();
    const digitsOnly = phone.replace(/\D/g, "");

    if (!EMAIL_RE.test(trimmedEmail)) {
      return res.status(400).json({ message: "Invalid email format." });
    }
    if (!PHONE_DIGITS_RE.test(digitsOnly)) {
      return res.status(400).json({
        message: "Phone number must be 11 digits (e.g. 09123456789).",
      });
    }

    // duplicate email?
    const emailUsed = await prisma.user.findFirst({
      where: {
        email: trimmedEmail,
        id: { not: userId },
      },
    });
    if (emailUsed) {
      return res.status(400).json({ message: "Email already in use." });
    }

    // duplicate phone?
    const phoneUsed = await prisma.user.findFirst({
      where: {
        phone: digitsOnly,
        id: { not: userId },
      },
    });
    if (phoneUsed) {
      return res
        .status(400)
        .json({ message: "Phone number already in use." });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: trimmedEmail,
        phone: digitsOnly,
      },
    });

    return res.json({ message: "Profile updated successfully." });
  } catch (err) {
    console.error("ADMIN PROFILE PATCH ERROR:", err);
    return res.status(500).json({ message: "Failed to update profile." });
  }
});

/* PATCH /admin/password
   body: { newPassword }
*/
router.patch("/password", async (req, res) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const { newPassword } = req.body || {};

    if (!newPassword || typeof newPassword !== "string") {
      return res
        .status(400)
        .json({ message: "New password is required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters.",
      });
    }

    const hash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hash,
        mustChangePassword: false,
      },
    });

    return res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("ADMIN PASSWORD PATCH ERROR:", err);
    return res.status(500).json({ message: "Failed to update password." });
  }
});

export default router;
