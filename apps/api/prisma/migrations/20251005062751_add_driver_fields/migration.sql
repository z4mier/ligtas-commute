/*
  Warnings:

  - Added the required column `address` to the `DriverProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birthDate` to the `DriverProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `busNo` to the `DriverProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `driverIdNo` to the `DriverProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `route` to the `DriverProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehiclePlate` to the `DriverProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicleType` to the `DriverProfile` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DriverProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "licenseNo" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "address" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "busNo" TEXT NOT NULL,
    "vehiclePlate" TEXT NOT NULL,
    "driverIdNo" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offline',
    CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DriverProfile" ("id", "licenseNo", "qrToken", "status", "userId") SELECT "id", "licenseNo", "qrToken", "status", "userId" FROM "DriverProfile";
DROP TABLE "DriverProfile";
ALTER TABLE "new_DriverProfile" RENAME TO "DriverProfile";
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");
CREATE UNIQUE INDEX "DriverProfile_qrToken_key" ON "DriverProfile"("qrToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
