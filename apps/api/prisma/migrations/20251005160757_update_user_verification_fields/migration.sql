/*
  Warnings:

  - You are about to drop the column `phone` on the `Otp` table. All the data in the column will be lost.
  - Added the required column `method` to the `Otp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `target` to the `Otp` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Otp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "target" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Otp" ("code", "consumed", "createdAt", "expiresAt", "id") SELECT "code", "consumed", "createdAt", "expiresAt", "id" FROM "Otp";
DROP TABLE "Otp";
ALTER TABLE "new_Otp" RENAME TO "Otp";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'COMMUTER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationMethod" TEXT,
    "verificationTarget" TEXT,
    "verificationCode" TEXT,
    "codeExpiresAt" DATETIME,
    "lastOtpSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("codeExpiresAt", "createdAt", "email", "fullName", "id", "isVerified", "lastOtpSentAt", "mustChangePassword", "password", "phone", "role", "status", "updatedAt", "verificationCode", "verificationMethod", "verificationTarget") SELECT "codeExpiresAt", "createdAt", "email", "fullName", "id", "isVerified", "lastOtpSentAt", "mustChangePassword", "password", "phone", "role", "status", "updatedAt", "verificationCode", "verificationMethod", "verificationTarget" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
