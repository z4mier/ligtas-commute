/*
  Warnings:

  - You are about to drop the `EmergencyContact` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `profileUrl` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "EmergencyContact_userId_phone_key";

-- DropIndex
DROP INDEX "EmergencyContact_userId_idx";

-- AlterTable
ALTER TABLE "CommuterProfile" ADD COLUMN "emergencyContacts" TEXT;
ALTER TABLE "CommuterProfile" ADD COLUMN "profileUrl" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmergencyContact";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'COMMUTER',
    "status" TEXT NOT NULL DEFAULT 'active',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "mustChangePassword", "password", "phone", "role", "status", "updatedAt") SELECT "createdAt", "email", "id", "mustChangePassword", "password", "phone", "role", "status", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
