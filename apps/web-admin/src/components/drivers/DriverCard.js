"use client";
import { Button } from "@/components/ui/button";
import DriverQRDialog from "./DriverQRDialog";
import { useState } from "react";

/* same formatting helpers */
function pad4(n) {
  const d = String(n ?? "").replace(/\D/g, "");
  return d ? d.slice(-4).padStart(4, "0") : "";
}
function up(s) {
  return (s ?? "").toString().toUpperCase();
}

export default function DriverCard({ driver, onToggle, onRefresh }) {
  const [qrOpen, setQrOpen] = useState(false);

  const name = driver?.user?.fullName || "—";
  const email = driver?.user?.email || "—";
  const phone = driver?.user?.phone || "—";
  const birth = driver?.user?.birthdate ? new Date(driver.user.birthdate).toLocaleDateString() : "—";
  const addr = driver?.user?.address || "—";
  const license = driver?.driverLicense || "—";
  const vehicle = driver?.vehicleType ? (driver.vehicleType === "AIRCON" ? "Aircon" : "Non-Aircon") : "—";
  const busNo = pad4(driver?.busNumber);
  const plateNo = up(driver?.plateNumber);
  const route = driver?.route || "—";
  const active = driver?.status === "ACTIVE";

  const appliedRaw = driver?.user?.createdAt || driver?.createdAt || null;
  const applied = appliedRaw ? new Date(appliedRaw).toLocaleDateString() : "—";

  return (
    <div className="rounded-xl border border-[#e5e9ee] p-4 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <h3 className="text-[15px] font-semibold text-[#101929]">{name}</h3>
        <span className="inline-flex items-center rounded-full bg-[#0D658B] text-white text-xs px-3 py-1">
          {route}
        </span>
      </div>

      {/* Info grid */}
      <div className="mt-3 grid sm:grid-cols-3 gap-x-6 gap-y-2 text-sm text-[#3a4351]">
        <div> Email: <span className="text-[#101929]">{email}</span> </div>
        <div> Phone: <span className="text-[#101929]">{phone}</span> </div>
        <div> Bus Number: <span className="text-[#101929]">{busNo || "—"}</span> </div>

        <div> Birth Date: <span className="text-[#101929]">{birth}</span> </div>
        <div> License: <span className="text-[#101929]">{license}</span> </div>
        <div> Plate Number: <span className="text-[#101929]">{plateNo || "—"}</span> </div>

        <div> Address: <span className="text-[#101929]">{addr}</span> </div>
        <div> Vehicle: <span className="text-[#101929]">{vehicle}</span> </div>
        <div> Applied: <span className="text-[#101929]">{applied}</span> </div>
      </div>

      {/* Buttons */}
      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" onClick={() => setQrOpen(true)}>View</Button>
        <Button
          onClick={() => onToggle(driver)}
          className={
            active
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }
        >
          {active ? "Deactivate" : "Activate"}
        </Button>
      </div>

      {/* QR + Edit Dialog */}
      <DriverQRDialog open={qrOpen} onOpenChange={setQrOpen} driver={driver} onSaved={onRefresh} />
    </div>
  );
}
