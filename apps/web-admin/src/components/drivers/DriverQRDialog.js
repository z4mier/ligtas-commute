"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import QRCode from "react-qr-code";
import { useEffect, useMemo, useRef, useState } from "react";
import { updateDriver } from "@/lib/drivers";

/* helpers to keep formatting consistent */
function pad4(n) {
  const d = String(n ?? "").replace(/\D/g, "");
  return d ? d.slice(-4).padStart(4, "0") : "";
}
function up(s) {
  return (s ?? "").toString().toUpperCase();
}

export default function DriverQRDialog({ open, onOpenChange, driver, onSaved }) {
  const svgRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    route: "",
    driverLicense: "",
    vehicleType: "NON_AIRCON",
  });

  useEffect(() => {
    if (!driver) return;
    setForm({
      fullName: driver?.user?.fullName || "",
      phone: driver?.user?.phone || "",
      email: driver?.user?.email || "",
      address: driver?.user?.address || "",
      route: driver?.route || "",
      driverLicense: driver?.driverLicense || "",
      vehicleType: driver?.vehicleType || "NON_AIRCON",
    });
  }, [driver, open]);

  // Normalized values for display and QR
  const displayBus = pad4(driver?.busNumber);
  const displayPlate = up(driver?.plateNumber);

  const qrPayload = useMemo(() => {
    if (!driver) return null;
    return {
      app: "LigtasCommute",
      type: "driver",
      id: driver?.id,
      name: driver?.user?.fullName,
      route: driver?.route,
      vehicleType: driver?.vehicleType,
      busNumber: displayBus,            // always 4-digit
      plateNumber: displayPlate,        // always UPPER
    };
  }, [driver, displayBus, displayPlate]);

  function downloadQR() {
    if (!svgRef.current || !qrPayload) return;
    const svg = svgRef.current.querySelector("svg");
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
      a.download = `driver_${driver?.id || "qr"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function setField(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function resetFormFromDriver() {
    setEditing(false);
    setForm({
      fullName: driver?.user?.fullName || "",
      phone: driver?.user?.phone || "",
      email: driver?.user?.email || "",
      address: driver?.user?.address || "",
      route: driver?.route || "",
      driverLicense: driver?.driverLicense || "",
      vehicleType: driver?.vehicleType || "NON_AIRCON",
    });
  }

  async function onSave() {
    setSaving(true);
    try {
      const userPayload = {
        fullName: form.fullName || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
      };
      const driverPayload = {
        route: form.route || null,
        driverLicense: form.driverLicense || null,
        vehicleType: form.vehicleType || "NON_AIRCON",
      };

      await updateDriver(driver.id, {
        ...userPayload,
        ...driverPayload,
        user: userPayload,
      });

      setEditing(false);
      onSaved && (await onSaved());
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetFormFromDriver();
        onOpenChange?.(v);
      }}
    >
      <DialogContent
        className="bg-white rounded-2xl shadow-xl p-4 max-w-none"
        style={{ width: "min(92vw, 420px)" }}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="mb-1">
          <DialogTitle className="text-sm font-semibold text-[#0D658B]">
            Driver Details
          </DialogTitle>
          <p className="text-[11px] text-gray-500 mt-1">QR code and editable profile.</p>
        </DialogHeader>

        {/* Body */}
        <div className="space-y-3">
          <div className="flex justify-center">
            <div
              ref={svgRef}
              className="flex justify-center items-center bg-white border border-gray-200 p-2 rounded-xl"
            >
              <QRCode value={qrPayload ? JSON.stringify(qrPayload) : ""} size={110} bgColor="#ffffff" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {[
              ["Full name", "fullName", "text"],
              ["Phone", "phone", "text"],
              ["Email", "email", "email"],
              ["Address", "address", "text"],
              ["Route", "route", "text"],
              ["Driver License", "driverLicense", "text"],
            ].map(([label, key, type]) => (
              <div key={key}>
                <Label className="text-[11px] text-[#6b7280]">{label}</Label>
                {editing ? (
                  <Input
                    type={type}
                    className="mt-0.5 h-8 text-sm"
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                  />
                ) : (
                  <div className="mt-0.5 text-sm text-[#101929] break-words">{form[key] || "—"}</div>
                )}
              </div>
            ))}

            <div>
              <Label className="text-[11px] text-[#6b7280]">Vehicle Type</Label>
              {editing ? (
                <Select value={form.vehicleType} onValueChange={(v) => setField("vehicleType", v)}>
                  <SelectTrigger className="mt-0.5 h-8 text-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AIRCON">Aircon</SelectItem>
                    <SelectItem value="NON_AIRCON">Non-Aircon</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-0.5 text-sm text-[#101929]">
                  {driver?.vehicleType === "AIRCON"
                    ? "Aircon"
                    : driver?.vehicleType === "NON_AIRCON"
                    ? "Non-Aircon"
                    : "—"}
                </div>
              )}
            </div>

            <div>
              <Label className="text-[11px] text-[#6b7280]">Bus Number</Label>
              <div className="mt-0.5 text-sm text-[#101929]">{displayBus || "—"}</div>
            </div>
            <div>
              <Label className="text-[11px] text-[#6b7280]">Plate Number</Label>
              <div className="mt-0.5 text-sm text-[#101929]">{displayPlate || "—"}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="mt-3 w-full flex items-center justify-between">
          {!editing ? (
            <Button variant="outline" className="h-8 px-3 border-[#cbd5e1]" onClick={() => setEditing(true)}>
              ✎ Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" className="h-8 px-3 border-[#cbd5e1]" onClick={resetFormFromDriver}>
                Cancel
              </Button>
              <Button
                className="h-8 px-4 bg-[#0D658B] hover:bg-[#0b5676] text-white"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}

          <Button onClick={downloadQR} className="h-8 px-3 bg-[#0D658B] hover:bg-[#0b5676] text-white">
            Download QR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
