/*
  Warnings:

  - You are about to drop the column `driverScore` on the `RideRating` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleScore` on the `RideRating` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "busNumber" TEXT;
ALTER TABLE "Trip" ADD COLUMN "busPlate" TEXT;
ALTER TABLE "Trip" ADD COLUMN "driverName" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RideRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "commuterId" TEXT NOT NULL,
    "rideId" TEXT,
    "score" INTEGER NOT NULL DEFAULT 5,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RideRating_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RideRating" ("comment", "commuterId", "createdAt", "driverId", "id", "rideId", "updatedAt") SELECT "comment", "commuterId", "createdAt", "driverId", "id", "rideId", "updatedAt" FROM "RideRating";
DROP TABLE "RideRating";
ALTER TABLE "new_RideRating" RENAME TO "RideRating";
CREATE INDEX "RideRating_driverId_createdAt_idx" ON "RideRating"("driverId", "createdAt");
CREATE INDEX "RideRating_commuterId_createdAt_idx" ON "RideRating"("commuterId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
