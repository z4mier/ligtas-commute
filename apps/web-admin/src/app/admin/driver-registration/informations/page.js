"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import DriverViewModal from "../../../../components/DriverViewModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const LIST_PATH = process.env.NEXT_PUBLIC_DRIVERS_LIST_PATH || "";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

/** Pick the first non-empty value from a list of keys (supports dot paths) */
function pick(raw, keys = []) {
  for (const k of keys) {
    const parts = k.split(".");
    let v = raw;
    for (const p of parts) {
      if (v && typeof v === "object" && p in v) v = v[p];
      else {
        v = undefined;
        break;
      }
    }
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

/** Normalize different API shapes to a consistent driver object */
function normalizeDriver(raw) {
  if (!raw || typeof raw !== "object") return null;

  // IDs
  const id = pick(raw, ["id", "_id", "driverId", "driver_id"]);
  const driverIdNo = pick(raw, [
    "driverProfile.driverIdNo",
    "driverIdNo",
    "driverProfile.code",
    "code",
    "_id",
  ]);

  // Name
  const first = pick(raw, ["firstName", "firstname"]);
  const last = pick(raw, ["lastName", "lastname"]);
  const fullFromParts = [first, last].filter(Boolean).join(" ");
  const fullName =
    pick(raw, ["fullName", "name", "full_name"]) || fullFromParts;

  // Status
  const status =
    (pick(raw, ["driverProfile.status", "status"]) || "active").toLowerCase();

  return {
    id: id || null,
    driverIdNo: driverIdNo || "",
    fullName,
    status,

    // LEFT
    email: pick(raw, ["email"]),
    birthDate: pick(raw, ["driverProfile.birthDate"]),
    address: pick(raw, ["driverProfile.address"]),

    // MIDDLE
    phone: pick(raw, ["phone"]),
    license: pick(raw, ["driverProfile.licenseNo"]),
    vehicle: pick(raw, ["driverProfile.vehicleType"]),

    // RIGHT
    busNumber: pick(raw, ["driverProfile.busNo"]),
    plateNumber: pick(raw, ["driverProfile.vehiclePlate"]),
    appliedAt: pick(raw, ["createdAt", "driverProfile.createdAt"]),

    // For QR modal
    qrToken: pick(raw, ["driverProfile.qrToken", "qrToken"]),

    raw, // keep original for modal
  };
}

export default function DriverInformationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null); // currently viewed driver (modal)

  useEffect(() => {
    loadDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDrivers() {
    setLoading(true);

    const token = getToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };

    const CANDIDATES = [
      ...(LIST_PATH ? [LIST_PATH] : []),
      "/admin/drivers",
      "/admin/driver-list",
      "/admin/driver",
      "/drivers",
      "/drivers/list",
      "/driver",
      "/driver/all",
    ];

    let lastErr = null;
    for (const path of CANDIDATES) {
      try {
        const url = `${API_BASE}${path}`;
        const res = await fetch(url, { headers });

        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          router.replace("/login");
          return;
        }

        const text = await res.text();
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {}

        if (!res.ok) {
          lastErr = new Error(`HTTP ${res.status} at ${path}`);
          continue;
        }

        const list =
          (Array.isArray(data) && data) ||
          data?.data ||
          data?.items ||
          data?.drivers ||
          data?.results ||
          [];

        if (!Array.isArray(list)) {
          lastErr = new Error(`Unexpected response shape at ${path}`);
          continue;
        }

        const normalized = list
          .map(normalizeDriver)
          .filter((x) => x && (x.id || x.driverIdNo));

        setDrivers(normalized);
        setLoading(false);
        return;
      } catch (e) {
        lastErr = e;
      }
    }

    // If all endpoints failed, just clear
    console.error(lastErr || "Failed to load drivers");
    setDrivers([]);
    setLoading(false);
  }

  async function toggleStatus(d) {
    // optimistic UI
    setDrivers((prev) =>
      prev.map((x) =>
        (x.id ?? x.driverIdNo) === (d.id ?? d.driverIdNo)
          ? { ...x, status: x.status === "active" ? "inactive" : "active" }
          : x
      )
    );

    try {
      const token = getToken();
      const id = d.id ?? d.driverIdNo;
      const targetStatus = d.status === "active" ? "inactive" : "active";

      // try PATCH then POST fallback
      let ok = false;
      try {
        const r1 = await fetch(`${API_BASE}/admin/drivers/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: targetStatus }),
        });
        ok = r1.ok;
      } catch {}

      if (!ok) {
        const action = targetStatus === "active" ? "activate" : "deactivate";
        const r2 = await fetch(`${API_BASE}/admin/drivers/${id}/${action}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        ok = r2.ok;
      }

      if (!ok) throw new Error("Failed to update status");
    } catch (err) {
      // revert on error
      setDrivers((prev) =>
        prev.map((x) =>
          (x.id ?? x.driverIdNo) === (d.id ?? d.driverIdNo)
            ? { ...x, status: d.status }
            : x
        )
      );
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(
      (d) =>
        (d.fullName || "").toLowerCase().includes(q) ||
        (d.email || "").toLowerCase().includes(q) ||
        (d.driverIdNo || "").toLowerCase().includes(q) ||
        (d.busNumber || "").toLowerCase().includes(q) ||
        (d.plateNumber || "").toLowerCase().includes(q)
    );
  }, [drivers, search]);

  return (
    <section className="space-y-6">
      {/* Page header */}
      <header>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B1526]">
          Driver Management
        </h2>
        <p className="text-sm text-[#5D6E80] mt-1">
          View and manage registered drivers.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2">
        <Link
          href="/admin/driver-registration/informations"
          className={`rounded-lg px-3 py-2 border font-medium ${
            pathname === "/admin/driver-registration/informations"
              ? "border-[#B9E6FA] bg-[#E9F1FA] text-[#00ABE4]"
              : "border-[#C7D8E6] bg-white text-[#5D6E80] hover:bg-[#F3F9FF]"
          }`}
        >
          Informations
        </Link>
        <Link
          href="/admin/driver-registration"
          className={`rounded-lg px-3 py-2 border font-medium ${
            pathname === "/admin/driver-registration"
              ? "border-[#B9E6FA] bg-[#E9F1FA] text-[#00ABE4]"
              : "border-[#C7D8E6] bg-white text-[#5D6E80] hover:bg-[#F3F9FF]"
          }`}
        >
          Register Driver
        </Link>
      </div>

      {/* === Drivers Panel (container) === */}
      <div className="rounded-2xl border border-[#C7D8E6] bg-white p-4 md:p-5 shadow-sm">
        {/* Panel header: title + search */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#0B1526]">
              Registered Drivers
            </h3>
            <p className="text-sm text-[#5D6E80]">
              List of all drivers in the system.
            </p>
          </div>
          <input
            type="text"
            placeholder="Search name, email, ID, bus, plate…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-[#C7D8E6] bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#00ABE4]/50 text-[#0B1526] w-full md:w-96"
          />
        </div>

        {/* Cards list inside the panel (scrollable if long) */}
        <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {loading ? (
            <p className="text-center text-[#5D6E80] py-10">Loading drivers...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-[#5D6E80] py-10">No drivers found.</p>
          ) : (
            filtered.map((d) => (
              <DriverCard
                key={d.id ?? d.driverIdNo}
                d={d}
                onToggle={() => toggleStatus(d)}
                onView={() => setViewing(d)} // open modal
              />
            ))
          )}
        </div>
      </div>

      {/* View Modal */}
      <DriverViewModal open={!!viewing} driver={viewing} onClose={() => setViewing(null)} />
    </section>
  );
}

/* ---------- Small helpers ---------- */
function Row({ label, value }) {
  return (
    <div className="text-xs md:text-sm text-[#5D6E80]">
      <span className="font-medium">{label}: </span>
      <span className="text-[#0B1526]">{value || "—"}</span>
    </div>
  );
}

/* ---------- Card ---------- */
function DriverCard({ d, onToggle, onView }) {
  const active = d.status === "active";
  return (
    <div className="relative rounded-xl border border-[#D9E6F2] bg-white p-4 md:p-5 shadow-sm">
      {/* Badge */}
      <div className="absolute right-4 top-4">
        <span className="inline-block rounded-full bg-[#0D658B] text-white text-[10px] px-2 py-1 tracking-wider">
          {d.driverIdNo ? String(d.driverIdNo).toUpperCase() : "DRV—"}
        </span>
      </div>

      <h4 className="text-base md:text-lg font-semibold text-[#0B1526] mb-2">
        {d.fullName || "Unnamed Driver"}
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-3">
        <div className="space-y-1">
          <Row label="Email" value={d.email} />
          <Row label="Birth Date" value={formatDate(d.birthDate)} />
          <Row label="Address" value={d.address} />
        </div>
        <div className="space-y-1">
          <Row label="Phone" value={d.phone} />
          <Row label="License" value={d.license} />
          <Row label="Vehicle" value={d.vehicle} />
        </div>
        <div className="space-y-1">
          <Row label="Bus Number" value={d.busNumber} />
          <Row label="Plate Number" value={d.plateNumber} />
          <Row label="Applied" value={formatDate(d.appliedAt)} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onView}
          className="inline-flex items-center gap-2 rounded-md border border-[#C7D8E6] px-3 py-1.5 text-sm text-[#0B1526] hover:bg-[#F3F9FF]"
        >
          View
        </button>

        <span className="ml-auto" />

        {active ? (
          <button
            onClick={onToggle}
            className="rounded-md bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5"
          >
            Deactivate
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-1.5"
          >
            Activate
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}
