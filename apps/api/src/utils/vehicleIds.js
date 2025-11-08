// apps/api/src/utils/vehicleIds.js
import { prisma } from "../lib/prisma.js";

/* ---------- constants ---------- */

// Single global counter so AIRCON/NON_AIRCON don't drift
const BUS_GLOBAL_KEY = "BUS_GLOBAL";

/* ---------- helpers ---------- */

// 4-digit bus number, e.g., "0007", "0123", "9876"
function formatBus(n) {
  return String(n).padStart(4, "0");
}

function randomLetters() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 3; i++) {
    result += letters[Math.floor(Math.random() * letters.length)];
  }
  return result;
}

function randomDigits() {
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

// realistic plate: "ABC-1234" (uppercase)
function formatPlate() {
  return `${randomLetters()}-${randomDigits()}`;
}

/* ---------- generate (authoritative) ---------- */
/**
 * Generates a unique bus number and plate number.
 * Uses a global counter to ensure no duplicate BUS numbers.
 * Ensures the plateNumber is unique in the driver table.
 */
export async function generateBusAndPlate(/* vehicleType (unused, kept for API shape) */) {
  return prisma.$transaction(async (tx) => {
    // ensure counter exists
    await tx.counter.upsert({
      where: { key: BUS_GLOBAL_KEY },
      create: { key: BUS_GLOBAL_KEY, value: 0 },
      update: {},
    });

    // increment counter atomically
    const busInc = await tx.counter.update({
      where: { key: BUS_GLOBAL_KEY },
      data: { value: { increment: 1 } },
    });

    // generate UNIQUE plate (uppercased)
    let plateNumber = formatPlate().toUpperCase();

    // loop until unique (very unlikely to loop more than once)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const exists = await tx.driver.findUnique({
        where: { plateNumber },
      });
      if (!exists) break;
      plateNumber = formatPlate().toUpperCase();
    }

    return {
      busNumber: formatBus(busInc.value), // e.g., "0001"
      plateNumber, // e.g., "ABC-1234"
    };
  });
}

/* ---------- preview (for UI only; does NOT reserve) ---------- */
/**
 * Returns the *next* busNumber and a random plate preview
 * without saving anything to the DB.
 */
export async function previewBusAndPlate(/* vehicleType (unused) */) {
  const bus = await prisma.counter.findUnique({
    where: { key: BUS_GLOBAL_KEY },
    select: { value: true },
  });

  const nextBus = (bus?.value ?? 0) + 1;

  return {
    busNumber: formatBus(nextBus), // 4-digit preview
    plateNumber: formatPlate().toUpperCase(), // random preview
  };
}
