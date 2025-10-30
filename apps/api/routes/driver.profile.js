// routes/driver.profile.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const r = express.Router();

/* uploads setup */
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) =>
    cb(null, `avatar_${Date.now()}${path.extname(file?.originalname || ".jpg")}`),
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
   GET /driver/profile  -> now includes driverProfileId
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
        },
      }),
      prisma.driverProfile.findUnique({
        where: { userId },
        // IMPORTANT: include id + userId so the app can submit ratings/incidents
        select: {
          id: true,
          userId: true,
          fullName: true,
          licenseNo: true,
          phone: true,
          address: true,
          busType: true,
        },
      }),
    ]);

    if (!user && !driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    res.json({
      // convenient top-level field:
      driverProfileId: driver?.id ?? null,

      // keep your existing shape
      fullName: driver?.fullName ?? "",
      licenseNo: driver?.licenseNo ?? "",
      email: user?.email ?? "",
      phone: driver?.phone ?? user?.phone ?? "",
      address: driver?.address ?? null,
      profileUrl: absolute(req, user?.profileUrl ?? null),
      createdAt: user?.createdAt ?? new Date(),
      busType: driver?.busType ?? null,

      // also include the full driver object WITH id
      driverProfile: driver ?? null,
    });
  } catch (e) {
    console.error("Fetch driver profile error:", e);
    res.status(500).json({ message: "Failed to load driver profile" });
  }
});

/* -----------------------------------------------------------
   PATCH /driver/profile (no license edit here)
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

/* OPTIONAL: change license */
r.patch("/profile/license", async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { licenseNo } = req.body;
    if (!licenseNo) return res.status(400).json({ message: "licenseNo required" });

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
   POST /driver/profile/upload-avatar (stores in User.profileUrl)
----------------------------------------------------------- */
r.post("/profile/upload-avatar", upload.single("avatar"), async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });

    const rel = `/uploads/${req.file.filename}`;
    await prisma.user.update({
      where: { id: userId },
      data: { profileUrl: rel },
    });

    res.json({ profileUrl: absolute(req, rel) });
  } catch (e) {
    console.error("Upload avatar error:", e);
    res.status(500).json({ message: "Failed to upload avatar" });
  }
});

/* -----------------------------------------------------------
   NEW: GET /drivers/by-user/:userId
   Maps User.id → DriverProfile (returns the profile WITH id)
----------------------------------------------------------- */
r.get("/drivers/by-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "userId required" });

    const dp = await prisma.driverProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        fullName: true,
        licenseNo: true,
        phone: true,
        address: true,
        busType: true,
        createdAt: true,
      },
    });

    if (!dp) return res.status(404).json({ message: "DriverProfile not found" });
    res.json(dp);
  } catch (e) {
    console.error("Resolve driver by userId error:", e);
    res.status(500).json({ message: "Failed to resolve driver profile" });
  }
});

export default r;
