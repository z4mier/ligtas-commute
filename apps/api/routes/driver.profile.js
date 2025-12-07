// routes/driver.profile.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const r = express.Router();

/* ------------------ uploads setup ------------------ */
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) =>
    cb(
      null,
      `avatar_${Date.now()}${path.extname(file?.originalname || ".jpg")}`
    ),
});

const fileFilter = (_req, file, cb) => {
  const ok = /image\/(jpeg|png|jpg|webp)/.test(file?.mimetype || "");
  cb(ok ? null : new Error("Only JPG/PNG/WEBP images are allowed"), ok);
};

const upload = multer({ storage, fileFilter });

function absolute(req, relPath) {
  if (!relPath) return null;
  if (/^https?:\/\//i.test(relPath)) return relPath;
  const base = `${req.protocol}://${req.get("host")}`;
  return `${base}${relPath.startsWith("/") ? "" : "/"}${relPath}`;
}

/* -----------------------------------------------------------
   GET /driver/profile
   Uses DriverProfile.driverId (NOT id)
----------------------------------------------------------- */
r.get("/profile", async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const [user, driver] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          profileUrl: true,
          createdAt: true,
          emergencyContacts: true,
        },
      }),
      prisma.driverProfile.findUnique({
        where: { userId },
        // IMPORTANT: use driverId (this is the Prisma field)
        select: {
          driverId: true,
          userId: true,
          fullName: true,
          licenseNo: true,
          phone: true,
          address: true,
          busType: true,
          profileUrl: true,
          createdAt: true,
        },
      }),
    ]);

    if (!user && !driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    res.json({
      // convenient top-level id for mobile
      driverProfileId: driver?.driverId ?? null,

      fullName: driver?.fullName ?? "",
      licenseNo: driver?.licenseNo ?? "",
      email: user?.email ?? "",
      phone: driver?.phone ?? user?.phone ?? "",
      address: driver?.address ?? null,
      // prefer driver's own profileUrl, fallback to user
      profileUrl: absolute(
        req,
        driver?.profileUrl ?? user?.profileUrl ?? null
      ),
      createdAt: user?.createdAt ?? driver?.createdAt ?? new Date(),
      busType: driver?.busType ?? null,
      emergencyContacts: user?.emergencyContacts ?? [],

      // full objects (useful for debugging)
      user,
      driverProfile: driver,
    });
  } catch (e) {
    console.error("Fetch driver profile error:", e);
    res.status(500).json({ message: "Failed to load driver profile" });
  }
});

/* -----------------------------------------------------------
   PATCH /driver/profile  (no license edit here)
----------------------------------------------------------- */
r.patch("/profile", async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { fullName, email, phone, address } = req.body;
    const ops = [];

    if (email || phone) {
      ops.push(
        prisma.user.update({
          where: { id: userId },
          data: {
            ...(email ? { email } : {}),
            ...(phone ? { phone } : {}),
          },
        })
      );
    }

    if (fullName || phone || address) {
      ops.push(
        prisma.driverProfile.update({
          where: { userId },
          data: {
            ...(fullName ? { fullName } : {}),
            ...(phone ? { phone } : {}),
            ...(address ? { address } : {}),
          },
        })
      );
    }

    await Promise.all(ops);
    res.json({ message: "Profile updated" });
  } catch (e) {
    console.error("Update driver profile error:", e);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

/* -----------------------------------------------------------
   PATCH /driver/profile/license
----------------------------------------------------------- */
r.patch("/profile/license", async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { licenseNo } = req.body;
    if (!licenseNo)
      return res.status(400).json({ message: "licenseNo required" });

    await prisma.driverProfile.update({
      where: { userId },
      data: { licenseNo },
    });

    res.json({ message: "License updated" });
  } catch (e) {
    console.error("Update license error:", e);
    res.status(500).json({ message: "Failed to update license" });
  }
});

/* -----------------------------------------------------------
   INTERNAL handler for avatar upload
----------------------------------------------------------- */
async function handleAvatarUpload(req, res) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file)
      return res.status(400).json({ message: "No image uploaded" });

    const rel = `/uploads/${req.file.filename}`;

    // 1) store in User.profileUrl
    await prisma.user.update({
      where: { id: userId },
      data: { profileUrl: rel },
    });

    // 2) also try to store in DriverProfile.profileUrl (if it exists)
    try {
      await prisma.driverProfile.update({
        where: { userId },
        data: { profileUrl: rel },
      });
    } catch (err) {
      // ok if no driverProfile yet; just log quietly
      console.warn("No DriverProfile for avatar upload (ok)", err?.code);
    }

    res.json({ profileUrl: absolute(req, rel) });
  } catch (e) {
    console.error("Upload avatar error:", e);
    res.status(500).json({ message: "Failed to upload avatar" });
  }
}

/* -----------------------------------------------------------
   POST /driver/profile/avatar  (this is what the app calls)
   Keep old route as alias just in case.
----------------------------------------------------------- */
r.post("/profile/avatar", upload.single("avatar"), handleAvatarUpload);

// old alias: /driver/profile/upload-avatar
r.post("/profile/upload-avatar", upload.single("avatar"), handleAvatarUpload);

/* -----------------------------------------------------------
   GET /driver/drivers/by-user/:userId
   Maps User.id → DriverProfile (using driverId)
----------------------------------------------------------- */
r.get("/drivers/by-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId)
      return res.status(400).json({ message: "userId required" });

    const dp = await prisma.driverProfile.findUnique({
      where: { userId },
      select: {
        driverId: true,
        userId: true,
        fullName: true,
        licenseNo: true,
        phone: true,
        address: true,
        busType: true,
        profileUrl: true,
        createdAt: true,
      },
    });

    if (!dp)
      return res.status(404).json({ message: "DriverProfile not found" });

    res.json(dp);
  } catch (e) {
    console.error("Resolve driver by userId error:", e);
    res.status(500).json({ message: "Failed to resolve driver profile" });
  }
});

export default r;
