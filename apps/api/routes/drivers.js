// apps/api/src/routes/drivers.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const router = Router();

/* Auth middleware is applied in index.js:
   app.use("/drivers", requireAuth, driversRouter)
*/

/**
 * Resolve driver profile by a User.id (useful when the app only knows the driver's userId).
 * Returns { id, userId, fullName, bus } where id is DriverProfile.id
 */
router.get("/by-user/:userId", async (req, res) => {
  try {
    const { userId } = z.object({ userId: z.string().min(1) }).parse(req.params);

    const prof = await prisma.driverProfile.findUnique({
      where: { userId },
      include: { bus: true },
    });
    if (!prof) return res.status(404).json({ message: "Driver profile not found" });

    return res.json({
      id: prof.id,                // <- DriverProfile.id  (this is what ratings need)
      userId: prof.userId,
      fullName: prof.fullName,
      bus: prof.bus
        ? { id: prof.bus.id, number: prof.bus.number, plate: prof.bus.plate, type: prof.bus.busType }
        : null,
    });
  } catch (e) {
    console.error("GET /drivers/by-user/:userId ERROR", e);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * Get current user's driver profile (when the logged user is a driver).
 * Handy as a last-resort lookup.
 */
router.get("/current", async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { driverProfile: { include: { bus: true } } },
    });
    if (!me?.driverProfile) return res.status(404).json({ message: "Not a driver" });

    const d = me.driverProfile;
    return res.json({
      id: d.id, // DriverProfile.id
      userId: d.userId,
      fullName: d.fullName,
      bus: d.bus
        ? { id: d.bus.id, number: d.bus.number, plate: d.bus.plate, type: d.bus.busType }
        : null,
    });
  } catch (e) {
    console.error("GET /drivers/current ERROR", e);
    return res.status(500).json({ message: "Server error" });
  }
});

/* (Optional) Add your existing list/set status endpoints below if you had them…
   Keeping the file short since the goal here is the lookup endpoints above. */

export default router;
