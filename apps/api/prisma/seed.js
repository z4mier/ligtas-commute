// apps/api/prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  /* ---------- 1) ADMIN ACCOUNT ---------- */
  const adminHash = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@ligtas.com" },
    update: {},
    create: {
      email: "admin@ligtas.com",
      password: adminHash,
      role: "ADMIN",
      status: "active", // matches your default style
    },
  });

  /* ---------- 2) COMMUTER / NORMAL USER ---------- */
  const userHash = await bcrypt.hash("user123", 12);

  await prisma.user.upsert({
    where: { email: "user@ligtas.com" },
    update: {},
    create: {
      email: "user@ligtas.com",
      password: userHash,
      role: "COMMUTER", // string lang ni sa schema
      status: "active",
      commuterProfile: {
        create: {
          fullName: "Sample Commuter",
          address: "Cebu City",
          language: "en",
        },
      },
    },
  });

  /* ---------- 3) SAMPLE BUS (MATCHES Bus MODEL) ---------- */
  const bus = await prisma.bus.upsert({
    where: { plate: "ABC1234" },
    update: {},
    create: {
      number: "3000",
      plate: "ABC1234",
      busType: "AIRCON",
      isActive: true,
    },
  });

  /* ---------- 4) DRIVER USER + DRIVER PROFILE ---------- */

  // primary key sa DriverProfile is driverId
  const y = new Date().getFullYear();
  const driverId = `DRV-${y}-000001`;

  const driverHash = await bcrypt.hash("Driver123!", 12);

  await prisma.user.upsert({
    where: { email: "driver@ligtas.com" },
    update: {},
    create: {
      email: "driver@ligtas.com",
      password: driverHash,
      role: "DRIVER",
      status: "active",
      driverProfile: {
        create: {
          driverId, // ✅ exact field name from schema
          fullName: "Sample Driver",
          licenseNo: "DL-1234567",
          birthDate: new Date("1995-01-01"),
          address: "Cebu City",
          phone: "09000000001",

          // optional but valid fields from your DriverProfile model
          busType: "AIRCON",
          isActive: true,

          // connect to the Bus we just created
          bus: {
            connect: { id: bus.id },
          },
        },
      },
    },
  });

  console.log("✅ Seed complete: admin, driver, user, bus & driverProfile created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
