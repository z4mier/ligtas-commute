-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "busType" TEXT NOT NULL DEFAULT 'AIRCON',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "corridor" TEXT NOT NULL DEFAULT 'EAST',
    "isActive" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Bus" ("busType", "id", "isActive", "number", "plate") SELECT "busType", "id", "isActive", "number", "plate" FROM "Bus";
DROP TABLE "Bus";
ALTER TABLE "new_Bus" RENAME TO "Bus";
CREATE UNIQUE INDEX "Bus_plate_key" ON "Bus"("plate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
