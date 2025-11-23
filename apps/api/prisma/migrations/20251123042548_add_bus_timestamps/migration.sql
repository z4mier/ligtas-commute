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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "routeId" TEXT,
    "forwardRoute" TEXT,
    "returnRoute" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Bus" ("busType", "corridor", "forwardRoute", "id", "isActive", "number", "plate", "returnRoute", "routeId", "status") SELECT "busType", "corridor", "forwardRoute", "id", "isActive", "number", "plate", "returnRoute", "routeId", "status" FROM "Bus";
DROP TABLE "Bus";
ALTER TABLE "new_Bus" RENAME TO "Bus";
CREATE UNIQUE INDEX "Bus_plate_key" ON "Bus"("plate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
