/*
  Warnings:

  - A unique constraint covering the columns `[userId,priority]` on the table `EmergencyContact` will be added. If there are existing duplicate values, this will fail.

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
    "profileUrl" TEXT,
    CONSTRAINT "CommuterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CommuterProfile" ("address", "fullName", "id", "language", "profileUrl", "userId") SELECT "address", "fullName", "id", "language", "profileUrl", "userId" FROM "CommuterProfile";
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
    "phone" TEXT,
    "busId" TEXT,
    "busType" TEXT NOT NULL DEFAULT 'AIRCON',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DriverProfile_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DriverProfile" ("address", "birthDate", "busId", "busType", "createdAt", "fullName", "id", "isActive", "licenseNo", "phone", "userId") SELECT "address", "birthDate", "busId", "busType", "createdAt", "fullName", "id", "isActive", "licenseNo", "phone", "userId" FROM "DriverProfile";
DROP TABLE "DriverProfile";
ALTER TABLE "new_DriverProfile" RENAME TO "DriverProfile";
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EmergencyContact_userId_priority_idx" ON "EmergencyContact"("userId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyContact_userId_priority_key" ON "EmergencyContact"("userId", "priority");
