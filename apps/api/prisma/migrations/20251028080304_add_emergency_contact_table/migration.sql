/*
  Warnings:

  - You are about to drop the column `emergencyContacts` on the `CommuterProfile` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relation" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmergencyContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    CONSTRAINT "CommuterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CommuterProfile" ("address", "fullName", "id", "language", "profileUrl", "userId") SELECT "address", "fullName", "id", "language", "profileUrl", "userId" FROM "CommuterProfile";
DROP TABLE "CommuterProfile";
ALTER TABLE "new_CommuterProfile" RENAME TO "CommuterProfile";
CREATE UNIQUE INDEX "CommuterProfile_userId_key" ON "CommuterProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EmergencyContact_userId_idx" ON "EmergencyContact"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyContact_userId_phone_key" ON "EmergencyContact"("userId", "phone");
