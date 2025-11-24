-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "status" TEXT NOT NULL DEFAULT 'OFF_DUTY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DriverProfile_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DriverProfile" ("address", "birthDate", "busId", "busType", "createdAt", "fullName", "id", "isActive", "licenseNo", "phone", "userId") SELECT "address", "birthDate", "busId", "busType", "createdAt", "fullName", "id", "isActive", "licenseNo", "phone", "userId" FROM "DriverProfile";
DROP TABLE "DriverProfile";
ALTER TABLE "new_DriverProfile" RENAME TO "DriverProfile";
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");
CREATE INDEX "DriverProfile_busId_idx" ON "DriverProfile"("busId");
CREATE INDEX "DriverProfile_status_busId_idx" ON "DriverProfile"("status", "busId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
