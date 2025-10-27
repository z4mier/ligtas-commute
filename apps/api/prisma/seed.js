// apps/api/prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 12);

  // 1) Admin account (no profile)
  await prisma.user.upsert({
    where: { email: "admin@ligtas.com" },
    update: {},
    create: {
      email: "admin@ligtas.com",
      password: hash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  // 2) A sample commuter (name lives in CommuterProfile)
  await prisma.user.upsert({
    where: { email: "test@user.com" },
    update: {},
    create: {
      email: "test@user.com",
      password: await bcrypt.hash("password123", 12),
      role: "COMMUTER",
      status: "ACTIVE",
      commuterProfile: {
        create: {
          fullName: "Test Dev",
          address: "Cebu City",
          language: "en",
        },
      },
    },
  });

  // 3) A sample bus + driver (driver name lives in DriverProfile)
  const bus = await prisma.bus.upsert({
    where: { plate: "ABC1234" },
    update: {},
    create: {
      number: "3000",
      plate: "ABC1234",
      type: "AIRCON",
      isActive: true,
    },
  });

  // simple sequence for driverIdNo if none exists
  async function nextSequence(name) {
    const seq = await prisma.sequence.upsert({
      where: { name },
      update: { current: { increment: 1 } },
      create: { name, current: 1 },
      select: { current: true },
    });
    return seq.current;
  }
  const n = await nextSequence("DRIVER");
  const y = new Date().getFullYear();
  const driverIdNo = `DRV-${y}-${String(n).padStart(6, "0")}`;

  await prisma.user.upsert({
    where: { email: "driver@ligtas.com" },
    update: {},
    create: {
      email: "driver@ligtas.com",
      password: await bcrypt.hash("driver123", 12),
      role: "DRIVER",
      status: "ACTIVE",
      driverProfile: {
        create: {
          fullName: "Sample Driver",
          licenseNo: "DL-1234567",
          birthDate: new Date("1995-01-01"),
          address: "Cebu City",
          busId: bus.id,
          driverIdNo,
          route: "Route A",
          qrToken: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
          status: "ACTIVE",
        },
      },
    },
  });

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
