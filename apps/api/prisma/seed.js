// apps/api/prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 12);

  // 1) Admin account (no profile)
  await prisma.user.upsert({
    where: { email: "admin@ligtas.com" },
    update: {},
    create: {
      email: "admin@ligtas.com",
      password: adminHash,
      role: "ADMIN",
      status: "active", // matches schema's default style
    },
  });

  // 2) Sample commuter (+ CommuterProfile)
  await prisma.user.upsert({
    where: { email: "test@user.com" },
    update: {},
    create: {
      email: "test@user.com",
      password: await bcrypt.hash("password123", 12),
      role: "COMMUTER",
      status: "active",
      commuterProfile: {
        create: {
          fullName: "Test Dev",
          address: "Cebu City",
          language: "en",
        },
      },
    },
  });

  // 3) One sample bus
  const bus = await prisma.bus.upsert({
    where: { plate: "ABC1234" },
    update: {},
    create: {
      number: "3000",
      plate: "ABC1234",
      busType: "AIRCON", // allowed: "AIRCON" | "NON_AIRCON"
      isActive: true,
    },
  });

  // 4) Sample driver (+ DriverProfile)
  await prisma.user.upsert({
    where: { email: "driver@ligtas.com" },
    update: {},
    create: {
      email: "driver@ligtas.com",
      password: await bcrypt.hash("driver123", 12),
      role: "DRIVER",
      status: "active",
      driverProfile: {
        create: {
          fullName: "Sample Driver",
          licenseNo: "DL-1234567",
          birthDate: new Date("1995-01-01"),
          address: "Cebu City",
          // Optional phone if you want:
          // phone: "09123456789",

          // Link to the bus (either busId OR relation connect works)
          busId: bus.id, // ✅ valid per your schema
          // Alternatively:
          // bus: { connect: { id: bus.id } },

          // Optional overrides (your schema provides defaults):
          // busType: "AIRCON",
          // isActive: true,
        },
      },
    },
  });

  // Optional: initialize a sequence row if you plan to use it later
  await prisma.sequence.upsert({
    where: { name: "DRIVER" },
    update: {},
    create: { name: "DRIVER", current: 0 },
  });

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
