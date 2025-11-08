// src/app/(protected)/drivers/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  listDrivers,
  registerDriver,
  setDriverStatus,
  previewIdentifiers,
} from "@/lib/drivers";
import DriverCard from "@/components/drivers/DriverCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import QRCode from "react-qr-code";

/* -------------------- Tabs -------------------- */
function Tabs({ value, onChange }) {
  const tabs = [
    { key: "register", label: "Register" },
    { key: "information", label: "Information" },
  ];
  return (
    <div className="flex items-center gap-2 border-b border-[#e5edf2]">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2 rounded-t-lg text-sm transition capitalize
            ${
              value === t.key
                ? "bg-white border border-[#e5edf2] border-b-transparent font-semibold text-[#0D658B]"
                : "text-[#101929]/80 hover:text-[#0D658B]"
            }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------- Main Component -------------------- */
export default function DriversPage() {
  const [tab, setTab] = useState("register");

  // Form states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [route, setRoute] = useState("");
  const [driverLicense, setDriverLicense] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [vehicleType, setVehicleType] = useState("NON_AIRCON");

  // Read-only previews (server will still allocate real values)
  const [busNumberPreview, setBusNumberPreview] = useState("");
  const [plateNumberPreview, setPlateNumberPreview] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Submit state (✅ added)
  const [submitting, setSubmitting] = useState(false);

  // Table state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // QR Modal
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState(null);
  const svgRef = useRef(null);

  // Validators
  const PHONE_RE = /^\d{11}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[cC][oO][mM]$/;
  const DL_RE = /^[A-Za-z][0-9]{2}-[0-9]{2}-[0-9]{6}$/;

  /* -------------------- Fetch all drivers -------------------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listDrivers();
        setRows(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* -------------------- Preview next identifiers (display only) -------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setPreviewLoading(true);
      try {
        const preview = await previewIdentifiers(vehicleType);
        if (!alive) return;
        setBusNumberPreview(String(preview?.busNumber || ""));
        setPlateNumberPreview(String(preview?.plateNumber || "").toUpperCase());
      } catch {
        if (!alive) return;
        setBusNumberPreview("");
        setPlateNumberPreview("");
      } finally {
        if (alive) setPreviewLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [vehicleType]);

  /* -------------------- Search Filter -------------------- */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((d) => {
      const name = d?.user?.fullName?.toLowerCase() || "";
      const phone = d?.user?.phone?.toLowerCase() || "";
      const email = d?.user?.email?.toLowerCase() || "";
      const r = d?.route?.toLowerCase() || "";
      const bus = d?.busNumber?.toLowerCase() || "";
      const plate = d?.plateNumber?.toLowerCase() || "";
      const vt = d?.vehicleType?.toLowerCase() || "";
      return (
        name.includes(term) ||
        phone.includes(term) ||
        email.includes(term) ||
        r.includes(term) ||
        bus.includes(term) ||
        plate.includes(term) ||
        vt.includes(term)
      );
    });
  }, [rows, q]);

  /* -------------------- Submit Register -------------------- */
  async function onRegister(e) {
    e.preventDefault();

    if (!fullName || !phone) {
      alert("Full name and phone are required.");
      return;
    }
    if (!PHONE_RE.test(phone)) {
      alert("Phone must be exactly 11 digits.");
      return;
    }
    if (!email || !EMAIL_RE.test(email)) {
      alert("Enter a valid .com email (e.g., name@example.com).");
      return;
    }
    if (driverLicense && !DL_RE.test(driverLicense.trim())) {
      alert("Driver License format must be like B87-93-671484.");
      return;
    }

    // Let the server allocate Bus# and Plate#
    const payload = {
      fullName,
      phone,
      email,
      address: address || null,
      route: route || null,
      driverLicense: driverLicense ? driverLicense.toUpperCase().trim() : null,
      birthdate: birthdate ? new Date(birthdate).toISOString() : null,
      vehicleType,
    };

    setSubmitting(true);
    try {
      const created = await registerDriver(payload);

      // Refresh list
      const data = await listDrivers();
      setRows(Array.isArray(data) ? data : []);

      // Build QR data from server response (authoritative)
      setQrData({
        app: "LigtasCommute",
        type: "driver",
        id: created?.id ?? null,
        name: created?.user?.fullName ?? fullName,
        busNumber: created?.busNumber ?? "",
        plateNumber: created?.plateNumber ?? "",
        vehicleType: created?.vehicleType ?? vehicleType,
      });
      setShowQR(true);

      // Reset and switch tab
      setFullName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setRoute("");
      setDriverLicense("");
      setBirthdate("");
      setVehicleType("NON_AIRCON");
      setBusNumberPreview("");
      setPlateNumberPreview("");
      setTab("information");
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to register driver.");
    } finally {
      setSubmitting(false);
    }
  }

  /* -------------------- Toggle Status -------------------- */
  async function toggleStatus(row) {
    const next = row.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";
    try {
      await setDriverStatus(row.id, next);
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, status: next } : r))
      );
    } catch {
      alert("Failed to update status.");
    }
  }

  /* -------------------- Download QR -------------------- */
  function downloadQR() {
    if (!svgRef.current || !qrData) return;
    const svg = svgRef.current.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = function () {
      const canvas = document.createElement("canvas");
      const scale = 3;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngFile = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngFile;
      a.download = `driver_${qrData?.plateNumber || qrData?.busNumber || "qr"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  /* -------------------- Render -------------------- */
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[#101929]">Drivers</h1>
        <p className="text-sm text-[#6b7280]">
          Register new drivers and manage the active roster.
        </p>
      </div>

      <div className="sticky top-[56px] z-10 -mx-6 px-6 bg-[#F7FAFC]">
        <Tabs value={tab} onChange={setTab} />
      </div>

      {tab === "register" && (
        <section className="rounded-2xl border border-[#e9eef2] bg-white overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-[#eef3f6]">
            <div className="text-lg font-semibold text-[#101929]">Register Driver</div>
            <p className="text-sm text-[#6b7280]">Fill in driver details below.</p>
          </div>

          <form onSubmit={onRegister} className="p-4 sm:p-5 grid gap-4 max-w-4xl">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-[#101929]">Full name</Label>
                <Input
                  className="mt-1 h-11 w-full"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                />
              </div>

              <div>
                <Label className="text-sm text-[#101929]">Phone</Label>
                <Input
                  className="mt-1 h-11 w-full"
                  value={phone}
                  inputMode="numeric"
                  maxLength={11}
                  pattern="^\d{11}$"
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setPhone(v);
                  }}
                  placeholder="09XXXXXXXXX"
                  title="Phone must be exactly 11 digits."
                />
              </div>

              <div>
                <Label className="text-sm text-[#101929]">Email</Label>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  className="mt-1 h-11 w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => setEmail((v) => v.trim())}
                  pattern="^[^\s@]+@[^\s@]+\.[cC][oO][mM]$"
                  placeholder="name@example.com"
                  title="Enter a valid .com email (e.g., name@example.com)."
                />
              </div>

              <div>
                <Label className="text-sm text-[#101929]">Address</Label>
                <Input
                  className="mt-1 h-11 w-full"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="City, Province"
                />
              </div>

              <div>
                <Label className="text-sm text-[#101929]">Route</Label>
                <Input
                  className="mt-1 h-11 w-full"
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  placeholder="e.g. Mandaue – Cebu"
                />
              </div>

              <div>
                <Label className="text-sm text-[#101929]">License No.</Label>
                <Input
                  className="mt-1 h-11 w-full"
                  value={driverLicense}
                  inputMode="text"
                  maxLength={13}
                  pattern="^[A-Za-z][0-9]{2}-[0-9]{2}-[0-9]{6}$"
                  onChange={(e) => {
                    const raw = e.target.value.toUpperCase().trim();
                    setDriverLicense(raw.replace(/[^A-Z0-9-]/g, ""));
                  }}
                  placeholder="B87-93-671484"
                  title="Format: 1 letter + 2 digits, dash, 2 digits, dash, 6 digits."
                  onBlur={(e) => e.currentTarget.reportValidity()}
                />
              </div>

              <div>
                <Label className="text-sm text-[#101929]">Birthdate</Label>
                <Input
                  type="date"
                  className="mt-1 h-11 w-full"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-sm text-[#101929]">Bus Type</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger className="mt-1 h-11 w-full">
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AIRCON">Aircon</SelectItem>
                    <SelectItem value="NON_AIRCON">Non-Aircon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Read-only previews; server will allocate final values */}
              <div>
                <Label className="text-sm text-[#101929]">Bus Number (preview)</Label>
                <Input
                  className="mt-1 h-11 w-full"
                  value={busNumberPreview}
                  readOnly
                  placeholder={previewLoading ? "Generating…" : "Will be auto-assigned"}
                />
              </div>

              <div>
                <Label className="text-sm text-[#101929]">Plate Number (preview)</Label>
                <Input
                  className="mt-1 h-11 w-full"
                  value={plateNumberPreview}
                  readOnly
                  placeholder={previewLoading ? "Generating…" : "Will be auto-assigned"}
                />
              </div>
            </div>

            <div className="pt-2">
              {/* prevent duplicate submits */}
              <Button
                type="submit"
                disabled={submitting || previewLoading}
                className="h-11 px-6 rounded-xl bg-[#0D658B] hover:bg-[#0b5676] text-white"
                >
                {submitting ? "Registering…" : "Register Driver"}
              </Button>
            </div>
          </form>
        </section>
      )}

      {tab === "information" && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-[#e9eef2] bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-lg font-semibold text-[#101929]">Driver List</div>
                <p className="text-sm text-[#6b7280]">
                  Search by name, phone, email, route, bus/plate, or vehicle type.
                </p>
              </div>
              <div className="w-full sm:w-96">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search drivers…"
                  className="h-11"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {filtered.map((d) => (
              <DriverCard
                key={d.id}
                driver={d}
                onToggle={toggleStatus}
                onRefresh={async () => {
                  const data = await listDrivers();
                  setRows(Array.isArray(data) ? data : []);
                }}
              />
            ))}

            {!loading && filtered.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#e9eef2] bg-white p-10 text-center">
                <div className="text-base font-medium text-[#101929]">
                  No drivers found
                </div>
                <div className="mt-1 text-sm text-[#6b7280]">
                  Try a different search.
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* QR Modal */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent
          className="w-[95vw] sm:max-w-[420px] bg-white rounded-2xl shadow-2xl border border-[#e5edf2] p-5 animate-in fade-in-0 zoom-in-95 duration-200 overflow-visible"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="text-center mb-3">
            <DialogTitle className="text-lg font-semibold text-[#0D658B]">
              Driver Registered
            </DialogTitle>
            <p className="text-sm text-gray-500">
              QR code generated successfully for this driver.
            </p>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            <div
              ref={svgRef}
              className="flex justify-center items-center bg-white border border-gray-200 p-3 rounded-xl shadow-sm"
            >
              <QRCode value={qrData ? JSON.stringify(qrData) : ""} size={150} bgColor="#ffffff" />
            </div>

            {qrData && (
              <div className="w-full text-sm bg-[#f8fafc] border border-[#e5edf2] rounded-lg p-4 shadow-inner">
                <p className="mb-1">
                  <span className="font-semibold text-[#0D658B]">Name:</span> {qrData.name}
                </p>
                <p className="mb-1">
                  <span className="font-semibold text-[#0D658B]">Bus #:</span> {qrData.busNumber}
                </p>
                <p>
                  <span className="font-semibold text-[#0D658B]">Plate #:</span> {qrData.plateNumber}
                </p>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-1 text-center">
              Scan this QR in the commuter app to verify driver details.
            </p>
          </div>

          <DialogFooter className="mt-4 flex justify-center">
            <Button
              onClick={downloadQR}
              className="h-10 px-6 bg-[#0D658B] hover:bg-[#0b5676] text-white rounded-lg shadow-md"
            >
              Download QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
