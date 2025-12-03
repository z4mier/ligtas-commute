-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'COMMUTER',
    "status" TEXT NOT NULL DEFAULT 'active',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "licenseNo" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "busId" TEXT,
    "busType" TEXT NOT NULL DEFAULT 'AIRCON',
    "status" TEXT NOT NULL DEFAULT 'OFF_DUTY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommuterProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "address" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "profileUrl" TEXT,

    CONSTRAINT "CommuterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relation" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bus" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "busType" TEXT NOT NULL DEFAULT 'AIRCON',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "corridor" TEXT NOT NULL DEFAULT 'EAST',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "qrUrl" TEXT,
    "routeId" TEXT,
    "forwardRoute" TEXT,
    "returnRoute" TEXT,
    "destLabel" TEXT,
    "destLat" DOUBLE PRECISION,
    "destLng" DOUBLE PRECISION,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "commuterProfileId" TEXT NOT NULL,
    "driverProfileId" TEXT,
    "busId" TEXT,
    "driverName" TEXT,
    "busNumber" TEXT,
    "busPlate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "originLat" DOUBLE PRECISION,
    "originLng" DOUBLE PRECISION,
    "destLat" DOUBLE PRECISION,
    "destLng" DOUBLE PRECISION,
    "originLabel" TEXT,
    "destLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideRating" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "commuterId" TEXT NOT NULL,
    "rideId" TEXT,
    "score" INTEGER NOT NULL DEFAULT 5,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentReport" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "reporterId" TEXT,
    "tripId" TEXT,
    "note" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "evidenceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentCategory" (
    "incidentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "IncidentCategory_pkey" PRIMARY KEY ("incidentId","category")
);

-- CreateTable
CREATE TABLE "EmergencyIncident" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "busId" TEXT,
    "driverProfileId" TEXT,
    "busNumber" TEXT,
    "busPlate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "EmergencyIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");

-- CreateIndex
CREATE INDEX "DriverProfile_busId_idx" ON "DriverProfile"("busId");

-- CreateIndex
CREATE INDEX "DriverProfile_status_busId_idx" ON "DriverProfile"("status", "busId");

-- CreateIndex
CREATE UNIQUE INDEX "CommuterProfile_userId_key" ON "CommuterProfile"("userId");

-- CreateIndex
CREATE INDEX "EmergencyContact_userId_idx" ON "EmergencyContact"("userId");

-- CreateIndex
CREATE INDEX "EmergencyContact_userId_priority_idx" ON "EmergencyContact"("userId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyContact_userId_phone_key" ON "EmergencyContact"("userId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyContact_userId_priority_key" ON "EmergencyContact"("userId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "Bus_plate_key" ON "Bus"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "Bus_deviceId_key" ON "Bus"("deviceId");

-- CreateIndex
CREATE INDEX "Trip_commuterProfileId_status_idx" ON "Trip"("commuterProfileId", "status");

-- CreateIndex
CREATE INDEX "Trip_driverProfileId_idx" ON "Trip"("driverProfileId");

-- CreateIndex
CREATE INDEX "Trip_busId_idx" ON "Trip"("busId");

-- CreateIndex
CREATE INDEX "Trip_status_endedAt_idx" ON "Trip"("status", "endedAt");

-- CreateIndex
CREATE INDEX "RideRating_driverId_createdAt_idx" ON "RideRating"("driverId", "createdAt");

-- CreateIndex
CREATE INDEX "RideRating_commuterId_createdAt_idx" ON "RideRating"("commuterId", "createdAt");

-- CreateIndex
CREATE INDEX "IncidentReport_driverId_createdAt_idx" ON "IncidentReport"("driverId", "createdAt");

-- CreateIndex
CREATE INDEX "IncidentReport_status_createdAt_idx" ON "IncidentReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "IncidentReport_tripId_createdAt_idx" ON "IncidentReport"("tripId", "createdAt");

-- CreateIndex
CREATE INDEX "EmergencyIncident_deviceId_createdAt_idx" ON "EmergencyIncident"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "EmergencyIncident_status_createdAt_idx" ON "EmergencyIncident"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmergencyIncident_busId_createdAt_idx" ON "EmergencyIncident"("busId", "createdAt");

-- CreateIndex
CREATE INDEX "EmergencyIncident_driverProfileId_createdAt_idx" ON "EmergencyIncident"("driverProfileId", "createdAt");

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommuterProfile" ADD CONSTRAINT "CommuterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_commuterProfileId_fkey" FOREIGN KEY ("commuterProfileId") REFERENCES "CommuterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRating" ADD CONSTRAINT "RideRating_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentCategory" ADD CONSTRAINT "IncidentCategory_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "IncidentReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyIncident" ADD CONSTRAINT "EmergencyIncident_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyIncident" ADD CONSTRAINT "EmergencyIncident_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
