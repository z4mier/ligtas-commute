/*
  Warnings:

  - A unique constraint covering the columns `[deviceId]` on the table `Bus` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Bus" ADD COLUMN "deviceId" TEXT;

-- CreateTable
CREATE TABLE "EmergencyIncident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "busId" TEXT,
    "driverProfileId" TEXT,
    "busNumber" TEXT,
    "busPlate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "EmergencyIncident_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmergencyIncident_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EmergencyIncident_deviceId_createdAt_idx" ON "EmergencyIncident"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "EmergencyIncident_status_createdAt_idx" ON "EmergencyIncident"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmergencyIncident_busId_createdAt_idx" ON "EmergencyIncident"("busId", "createdAt");

-- CreateIndex
CREATE INDEX "EmergencyIncident_driverProfileId_createdAt_idx" ON "EmergencyIncident"("driverProfileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Bus_deviceId_key" ON "Bus"("deviceId");
