-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commuterProfileId" TEXT NOT NULL,
    "driverProfileId" TEXT,
    "busId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "originLat" REAL,
    "originLng" REAL,
    "destLat" REAL,
    "destLng" REAL,
    "originLabel" TEXT,
    "destLabel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trip_commuterProfileId_fkey" FOREIGN KEY ("commuterProfileId") REFERENCES "CommuterProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trip_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trip_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Trip_commuterProfileId_status_idx" ON "Trip"("commuterProfileId", "status");

-- CreateIndex
CREATE INDEX "Trip_driverProfileId_idx" ON "Trip"("driverProfileId");

-- CreateIndex
CREATE INDEX "Trip_busId_idx" ON "Trip"("busId");

-- CreateIndex
CREATE INDEX "Trip_status_endedAt_idx" ON "Trip"("status", "endedAt");
