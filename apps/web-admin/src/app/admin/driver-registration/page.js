"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export default function DriverRegistrationPage() {
  const pathname = usePathname();
  const isInfo = pathname === "/admin/driver-registration/informations";
  const isRegister = pathname === "/admin/driver-registration";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    licenseNo: "",
    birthDate: "",
    address: "",
    vehicleType: "AIRCON",
    busNo: "",
    vehiclePlate: "",
    driverIdNo: "",
    route: "",
  });

  const [msg, setMsg] = useState("");
  const [created, setCreated] = useState(null);
  const [saving, setSaving] = useState(false);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function resetForm() {
    setForm({
      fullName: "",
      email: "",
      phone: "",
      licenseNo: "",
      birthDate: "",
      address: "",
      vehicleType: "AIRCON",
      busNo: "",
      vehiclePlate: "",
      driverIdNo: "",
      route: "",
    });
  }

  async function createDriver(e) {
    e.preventDefault();
    setMsg("");
    setCreated(null);

    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE}/admin/create-driver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }
        throw new Error(data?.message || `Request failed (HTTP ${res.status})`);
      }

      setCreated(data);
      setMsg("✅ Driver created (default password: driver123)");
      resetForm();
    } catch (err) {
      setMsg("❌ " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <header>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0B1526]">
          Driver Management
        </h2>
        <p className="text-sm md:text-base text-[#5D6E80] mt-1">
          Register new drivers and manage applications.
        </p>
      </header>

      {/* Tabs (clickable + route-aware) */}
      <div className="flex gap-2">
        <Link
          href="/admin/driver-registration/informations"
          className={`rounded-lg px-3 py-2 border font-medium transition ${
            isInfo
              ? "border-[#B9E6FA] bg-[#E9F1FA] text-[#00ABE4]"
              : "border-[#C7D8E6] bg-white text-[#5D6E80] hover:bg-[#F3F9FF]"
          }`}
        >
          Informations
        </Link>
        <Link
          href="/admin/driver-registration"
          className={`rounded-lg px-3 py-2 border font-medium transition ${
            isRegister
              ? "border-[#B9E6FA] bg-[#E9F1FA] text-[#00ABE4]"
              : "border-[#C7D8E6] bg-white text-[#5D6E80] hover:bg-[#F3F9FF]"
          }`}
        >
          Register Driver
        </Link>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-[#C7D8E6] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#E9F1FA] border border-[#C7D8E6] text-[#00ABE4] text-lg font-semibold">
            +
          </div>
          <h3 className="text-lg md:text-xl font-semibold text-[#0B1526]">
            Register New Driver
          </h3>
        </div>

        <form onSubmit={createDriver} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full Name">
            <Input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} />
          </Field>

          <Field label="Phone Number">
            <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
          </Field>

          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </Field>

          <Field label="Driver’s License Number">
            <Input value={form.licenseNo} onChange={(e) => setField("licenseNo", e.target.value)} />
          </Field>

          <Field label="Birth Date">
            <Input type="date" value={form.birthDate} onChange={(e) => setField("birthDate", e.target.value)} />
          </Field>

          <Field label="Address">
            <Input value={form.address} onChange={(e) => setField("address", e.target.value)} />
          </Field>

          <Field label="Vehicle Type">
            <Select
              value={form.vehicleType}
              onChange={(e) => setField("vehicleType", e.target.value)}
              options={[
                { label: "Aircon", value: "AIRCON" },
                { label: "Non-Aircon", value: "NON_AIRCON" },
              ]}
            />
          </Field>

          <Field label="Bus Number">
            <Input value={form.busNo} onChange={(e) => setField("busNo", e.target.value)} />
          </Field>

          <Field label="Plate Number">
            <Input value={form.vehiclePlate} onChange={(e) => setField("vehiclePlate", e.target.value)} />
          </Field>

          <Field label="Driver ID No">
            <Input value={form.driverIdNo} onChange={(e) => setField("driverIdNo", e.target.value)} />
          </Field>

          <Field label="Route" full>
            <Input value={form.route} onChange={(e) => setField("route", e.target.value)} />
          </Field>

          {/* Actions */}
          <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#00ABE4] px-4 py-2 font-semibold text-white hover:bg-[#0098CB] disabled:opacity-60"
            >
              {saving ? "Creating..." : "Register Driver & Generate QR Code"}
            </button>
          </div>
        </form>

        {/* Status / Result */}
        {msg && (
          <p className="mt-4 rounded-md border border-[#C7D8E6] bg-[#E9F1FA] px-3 py-2 text-sm text-[#0B1526]">
            {msg}
          </p>
        )}
        {created && (
          <div className="mt-4 rounded-xl border border-[#C7D8E6] bg-[#F7FBFF] p-4 overflow-auto">
            <h4 className="mb-2 font-semibold text-[#0B1526]">Driver Created</h4>
            <pre className="whitespace-pre-wrap text-xs text-[#405266]">
              {JSON.stringify(created, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- UI Components ---------- */

function Field({ label, full = false, children }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "md:col-span-2" : ""}`}>
      <span className="text-sm text-[#405266]">{label}</span>
      {children}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-[#C7D8E6] bg-[#F7FBFF] px-3 py-2 text-[#0B1526] outline-none focus:ring-2 focus:ring-[#00ABE4]/50 ${
        props.className || ""
      }`}
    />
  );
}

function Select({ options = [], ...props }) {
  return (
    <select
      {...props}
      className="w-full rounded-lg border border-[#C7D8E6] bg-[#F7FBFF] px-3 py-2 text-[#0B1526] outline-none focus:ring-2 focus:ring-[#00ABE4]/50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
