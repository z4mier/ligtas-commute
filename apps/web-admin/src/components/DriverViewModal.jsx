"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";

export default function DriverViewModal({ open, onClose, driver }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [mounted, setMounted] = useState(false);

  // mount flag for portal (avoids SSR mismatch)
  useEffect(() => setMounted(true), []);

  // Lock page scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  // QR payload
  const qrPayload = useMemo(() => {
    if (!driver) return "";
    return JSON.stringify({
      type: "driver",
      id: driver.driverIdNo || "",
      name: driver.fullName || "",
      plate: driver.plateNumber || "",
      bus: driver.busNumber || "",
      license: driver.license || "",
    });
  }, [driver]);

  // Generate QR
  useEffect(() => {
    if (!open || !qrPayload) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(qrPayload, {
      margin: 1,
      scale: 6,
      errorCorrectionLevel: "M",
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [open, qrPayload]);

  if (!open || !driver || !mounted) return null;

  const Row = ({ label, value }) => (
    <div className="text-sm">
      <span className="font-medium text-[#0B1526]">{label}: </span>
      <span className="text-[#42566F]">{value || "—"}</span>
    </div>
  );

  const formatDate = (v) => {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    const mm = `${d.getMonth() + 1}`.padStart(2, "0");
    const dd = `${d.getDate()}`.padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  };

  // Render the whole modal in a portal with ultra-high z-index
  return createPortal(
    <>
      {/* Backdrop (VERY high z-index to beat any fixed bars) */}
      <div
        className="fixed inset-0 z-[100000] bg-black/50"
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="fixed inset-0 z-[100001] flex items-center justify-center px-4 py-0 md:py-6">
        <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl ring-1 ring-[#D9E6F2] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5EFF8]">
            <h3 className="text-lg font-semibold text-[#0B1526]">Driver Details</h3>
            <button
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm border border-[#D9E6F2] hover:bg-[#F3F9FF]"
            >
              Close
            </button>
          </div>

          {/* Body (scroll inside modal only) */}
          <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-[#0B1526]">
                {driver.fullName || "Unnamed Driver"}
              </h4>
              <span className="inline-block rounded-full bg-[#0D658B] text-white text-[10px] px-2 py-1 tracking-wider">
                {(driver.driverIdNo || "DRV—").toString().toUpperCase()}
              </span>
            </div>

            {/* Info + QR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Details */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Row label="Email" value={driver.email} />
                    <Row label="Phone" value={driver.phone} />
                    <Row label="Birth Date" value={formatDate(driver.birthDate)} />
                    <Row label="Address" value={driver.address} />
                  </div>
                  <div className="space-y-1.5">
                    <Row label="License" value={driver.license} />
                    <Row label="Vehicle" value={driver.vehicle} />
                    <Row label="Bus Number" value={driver.busNumber} />
                    <Row label="Plate Number" value={driver.plateNumber} />
                    <Row label="Applied" value={formatDate(driver.appliedAt)} />
                  </div>
                </div>
              </div>

              {/* QR */}
              <div className="border border-[#E5EFF8] rounded-lg p-3 flex flex-col items-center justify-center">
                <div className="text-xs text-[#42566F] mb-2">Driver QR</div>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Driver QR" className="w-40 h-40" />
                ) : (
                  <div className="text-xs text-[#9AAFC6]">Generating…</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
