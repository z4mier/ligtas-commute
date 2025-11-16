/*
  Warnings:

  - You are about to drop the `IncidentReportCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `rideId` on the `IncidentReport` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "IncidentReportCategory";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "IncidentCategory" (
    "incidentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    PRIMARY KEY ("incidentId", "category"),
    CONSTRAINT "IncidentCategory_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "IncidentReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IncidentReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "reporterId" TEXT,
    "tripId" TEXT,
    "note" TEXT,
    "lat" REAL,
    "lng" REAL,
    "evidenceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IncidentReport_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IncidentReport_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_IncidentReport" ("createdAt", "driverId", "evidenceUrl", "id", "lat", "lng", "note", "reporterId", "status", "updatedAt") SELECT "createdAt", "driverId", "evidenceUrl", "id", "lat", "lng", "note", "reporterId", "status", "updatedAt" FROM "IncidentReport";
DROP TABLE "IncidentReport";
ALTER TABLE "new_IncidentReport" RENAME TO "IncidentReport";
CREATE INDEX "IncidentReport_driverId_createdAt_idx" ON "IncidentReport"("driverId", "createdAt");
CREATE INDEX "IncidentReport_status_createdAt_idx" ON "IncidentReport"("status", "createdAt");
CREATE INDEX "IncidentReport_tripId_createdAt_idx" ON "IncidentReport"("tripId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
