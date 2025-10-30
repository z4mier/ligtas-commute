-- CreateTable
CREATE TABLE "RideRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "commuterId" TEXT NOT NULL,
    "rideId" TEXT,
    "driverScore" INTEGER NOT NULL,
    "vehicleScore" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RideRating_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncidentReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "reporterId" TEXT,
    "rideId" TEXT,
    "note" TEXT,
    "lat" REAL,
    "lng" REAL,
    "evidenceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IncidentReport_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncidentReportCategory" (
    "reportId" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    PRIMARY KEY ("reportId", "category"),
    CONSTRAINT "IncidentReportCategory_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "IncidentReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RideRating_driverId_createdAt_idx" ON "RideRating"("driverId", "createdAt");

-- CreateIndex
CREATE INDEX "RideRating_commuterId_createdAt_idx" ON "RideRating"("commuterId", "createdAt");

-- CreateIndex
CREATE INDEX "IncidentReport_driverId_createdAt_idx" ON "IncidentReport"("driverId", "createdAt");

-- CreateIndex
CREATE INDEX "IncidentReport_status_createdAt_idx" ON "IncidentReport"("status", "createdAt");
