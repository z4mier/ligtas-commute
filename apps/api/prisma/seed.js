import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@ligtas.com" },
    update: {},
    create: {
      fullName: "Main Admin",
      email: "admin@ligtas.com",
      password: hash,
      role: "ADMIN",
      status: "active",
      mustChangePassword: false,
    },
  });
  console.log("Seeded admin: admin@ligtas.com / admin123");
}

main().finally(() => prisma.$disconnect());
