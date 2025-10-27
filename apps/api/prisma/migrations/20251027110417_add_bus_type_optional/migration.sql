/*
  Warnings:

  - You are about to drop the column `type` on the `Bus` table. All the data in the column will be lost.
  - You are about to drop the column `driverIdNo` on the `DriverProfile` table. All the data in the column will be lost.
  - You are about to drop the column `qrToken` on the `DriverProfile` table. All the data in the column will be lost.
  - You are about to drop the column `route` on the `DriverProfile` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "busType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Bus" ("id", "isActive", "number", "plate") SELECT "id", "isActive", "number", "plate" FROM "Bus";
DROP TABLE "Bus";
ALTER TABLE "new_Bus" RENAME TO "Bus";
CREATE UNIQUE INDEX "Bus_plate_key" ON "Bus"("plate");
CREATE TABLE "new_DriverProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "licenseNo" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "busId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DriverProfile_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DriverProfile" ("address", "birthDate", "busId", "fullName", "id", "licenseNo", "status", "userId") SELECT "address", "birthDate", "busId", "fullName", "id", "licenseNo", coalesce("status", 'ACTIVE') AS "status", "userId" FROM "DriverProfile";
DROP TABLE "DriverProfile";
ALTER TABLE "new_DriverProfile" RENAME TO "DriverProfile";
CREATE UNIQUE INDEX "DriverProfile_licenseNo_key" ON "DriverProfile"("licenseNo");
CREATE UNIQUE INDEX "DriverProfile_phone_key" ON "DriverProfile"("phone");
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
