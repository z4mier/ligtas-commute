"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";

export default function DriverQRModal({ open, onClose, data }) {
  const [png, setPng] = useState("");
  const linkRef = useRef(null);

  useEffect(() => {
    setPng("");
    if (!open || !data?.token) return;

    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const payload = `${base}/verify/driver/${data.token}`;

    QRCode.toDataURL(payload, { margin: 1, scale: 6 })
      .then(setPng)
      .catch(() => setPng(""));
  }, [open, data?.token]);

  if (!open) return null;

  const download = () => {
    if (!png) return;
    const a = linkRef.current;
    a.href = png;
    a.download = `${data?.driverIdNo || "driver-qr"}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop (no click-to-close) */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95"
        style={{ maxHeight: "90vh" }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5EFF8] px-5 py-4">
          <h3 className="text-base font-semibold text-[#0B1526]">Driver QR Code</h3>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm border border-[#D9E6F2] hover:bg-[#F3F9FF]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 text-sm overflow-y-auto">
          <div className="flex items-center justify-center">
            {png ? (
              <img
                src={png}
                alt="Driver QR"
                className="w-48 h-48 rounded-md border border-[#E5EFF8] bg-white"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-[#5D6E80] border border-[#E5EFF8] rounded-md">
                Generating…
              </div>
            )}
          </div>

          <div className="space-y-1 text-[#42566F]">
            <Row label="Driver" value={data?.fullName} />
            <Row label="Bus Number" value={data?.busNo} />
            <Row label="Plate Number" value={data?.plate} />
            <Row label="Driver ID" value={data?.driverIdNo} />
            <Row label="Vehicle" value={data?.vehicleType} />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#E5EFF8] px-5 py-4 flex justify-center">
          <button
            onClick={download}
            disabled={!png}
            className="rounded-lg bg-[#00ABE4] text-white text-sm font-semibold px-5 py-2 hover:bg-[#0098CB] transition disabled:opacity-60"
          >
            Download QR Code
          </button>
          <a ref={linkRef} className="hidden" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-medium text-[#0B1526]">{label}:</span>
      <span className="ml-3">{value || "—"}</span>
    </div>
  );
}
