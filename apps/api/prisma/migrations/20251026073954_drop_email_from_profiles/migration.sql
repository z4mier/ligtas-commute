/*
  Warnings:

  - You are about to drop the column `email` on the `CommuterProfile` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `DriverProfile` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CommuterProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "address" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "points" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CommuterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CommuterProfile" ("address", "fullName", "id", "language", "points", "userId") SELECT "address", "fullName", "id", "language", "points", "userId" FROM "CommuterProfile";
DROP TABLE "CommuterProfile";
ALTER TABLE "new_CommuterProfile" RENAME TO "CommuterProfile";
CREATE UNIQUE INDEX "CommuterProfile_userId_key" ON "CommuterProfile"("userId");
CREATE TABLE "new_DriverProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "licenseNo" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "address" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "driverIdNo" TEXT NOT NULL,
    "route" TEXT,
    "qrToken" TEXT NOT NULL,
    "status" TEXT DEFAULT 'ACTIVE',
    CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DriverProfile_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DriverProfile" ("address", "birthDate", "busId", "driverIdNo", "fullName", "id", "licenseNo", "qrToken", "route", "status", "userId") SELECT "address", "birthDate", "busId", "driverIdNo", "fullName", "id", "licenseNo", "qrToken", "route", "status", "userId" FROM "DriverProfile";
DROP TABLE "DriverProfile";
ALTER TABLE "new_DriverProfile" RENAME TO "DriverProfile";
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");
CREATE UNIQUE INDEX "DriverProfile_driverIdNo_key" ON "DriverProfile"("driverIdNo");
CREATE UNIQUE INDEX "DriverProfile_qrToken_key" ON "DriverProfile"("qrToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
