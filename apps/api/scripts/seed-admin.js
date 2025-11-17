import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || "admin@ligtas.com";
  const password = process.argv[3] || "admin123";

  const hash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      fullName: "Administrator",
      password: hash,
      role: "ADMIN",
      status: "ACTIVE",
      mustChangePassword: false,
    },
    create: {
      fullName: "Administrator",
      email,
      phone: "0000000000",
      password: hash,
      role: "ADMIN",
      status: "ACTIVE",
      mustChangePassword: false,
    },
    select: { id: true, email: true, role: true, status: true },
  });

  console.log("Admin ready:", admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });