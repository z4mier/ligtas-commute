// apps/api/scripts/backfill-commuter.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]; // pass email on CLI
  if (!email) {
    console.error("Usage: node scripts/backfill-commuter.js <email>");
    process.exit(1);
  }
  const key = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email: key } });
  if (!user) {
    console.error("User not found:", key);
    process.exit(1);
  }

  const cp = await prisma.commuterProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, points: 0 },
  });

  // (Optional) set defaults visible in Settings screen
  await prisma.user.update({
    where: { id: user.id },
    data: {
      language: "en",
      address: user.address ?? "",
    },
  });

  console.log("✅ commuterProfile ready:", { userId: user.id, points: cp.points });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
