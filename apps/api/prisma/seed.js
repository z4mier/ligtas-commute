import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  // Main (and only) admin
  await prisma.user.upsert({
    where: { email: "admin@sample.com" },
    update: {},
    create: {
      fullName: "Main Admin",
      email: "admin@sample.com",
      password: passwordHash,
      role: "ADMIN",
      status: "active",
      mustChangePassword: false
    }
  });

  console.log("✅ Seeded admin: admin@sample.com (pw: admin123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
