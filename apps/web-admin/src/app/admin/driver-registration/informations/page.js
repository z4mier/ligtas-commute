"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const LIST_PATH = process.env.NEXT_PUBLIC_DRIVERS_LIST_PATH || "";
function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

/** Normalize different API shapes to a consistent driver object */
function normalizeDriver(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    id:
      raw.id ??
      raw._id ??
      raw.driverId ??
      raw.driver_id ??
      raw.driverUUID ??
      null,
    driverIdNo:
      raw.driverIdNo ??
      raw.driver_id_no ??
      raw.driverCode ??
      raw.driverId ??
      raw._id ??
      "",
    fullName: raw.fullName ?? raw.name ?? raw.full_name ?? "",
    email: raw.email ?? "",
    phone: raw.phone ?? raw.mobile ?? "",
    vehicleType: raw.vehicleType ?? raw.vehicle_type ?? "",
    route: raw.route ?? raw.routeName ?? "",
    status: raw.status ?? raw.accountStatus ?? raw.state ?? "",
    raw, // keep original for debugging "View"
  };
}

export default function DriverInformationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isInfo = pathname === "/admin/driver-registration/informations";
  const isRegister = pathname === "/admin/driver-registration";

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Try several common list routes and accept different response shapes */
  // ⬇️ replace your loadDrivers() with this
async function loadDrivers() {
  setLoading(true);
  setMsg("");

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  // Put your env-configured path FIRST if provided
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
      try { data = text ? JSON.parse(text) : null; } catch {}

      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} at ${path}`);
        continue;
      }

      // Accept multiple shapes
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
      setMsg(`Loaded from ${path}`); // optional: keep for debug; remove later
      return;
    } catch (e) {
      lastErr = e;
    }
  }

  setDrivers([]);
  setMsg(
    lastErr
      ? `Failed to load drivers: ${lastErr.message}. Set NEXT_PUBLIC_DRIVERS_LIST_PATH to your actual endpoint.`
      : "Failed to load drivers. Set NEXT_PUBLIC_DRIVERS_LIST_PATH."
  );
  setLoading(false);
}

  async function deleteDriver(idLike) {
    const id = idLike || "";
    if (!id) return alert("Missing driver id.");
    if (!confirm("Are you sure you want to delete this driver?")) return;

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/drivers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.message || "Delete failed.");
      }

      setDrivers((d) => d.filter((x) => x.id !== id && x.driverIdNo !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(
      (d) =>
        d.fullName.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        (d.driverIdNo || "").toLowerCase().includes(q)
    );
  }, [drivers, search]);

  return (
    <section className="space-y-6">
      {/* Header */}
      <header>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0B1526]">
          Driver Management
        </h2>
        <p className="text-sm md:text-base text-[#5D6E80] mt-1">
          View and manage registered drivers.
        </p>
      </header>

      {/* Tabs */}
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

      {/* Table Card */}
      <div className="rounded-2xl border border-[#C7D8E6] bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#0B1526]">Registered Drivers</h3>
            <p className="text-sm text-[#5D6E80]">List of all drivers in the system.</p>
          </div>
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-[#C7D8E6] bg-[#F7FBFF] px-3 py-2 outline-none focus:ring-2 focus:ring-[#00ABE4]/50 text-[#0B1526] w-full md:w-72"
          />
        </div>

        {msg && (
          <p className="mb-3 rounded-md border border-[#C7D8E6] bg-[#E9F1FA] px-3 py-2 text-sm text-[#0B1526]">
            {msg}
          </p>
        )}

        {loading ? (
          <p className="text-center text-[#5D6E80] py-10">Loading drivers...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-[#5D6E80] py-10">No drivers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-[#5D6E80] border-b border-[#C7D8E6]">
                  <Th>ID No</Th>
                  <Th>Full Name</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Vehicle</Th>
                  <Th>Route</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2EEF7]">
                {filtered.map((d) => (
                  <tr key={d.id ?? d.driverIdNo} className="hover:bg-[#F3F9FF] transition">
                    <Td>{d.driverIdNo || "—"}</Td>
                    <Td>{d.fullName || "—"}</Td>
                    <Td>{d.email || "—"}</Td>
                    <Td>{d.phone || "—"}</Td>
                    <Td>{d.vehicleType || "—"}</Td>
                    <Td>{d.route || "—"}</Td>
                    <Td>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                          d.status === "active"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        }`}
                      >
                        {d.status || "Pending"}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => alert(`Driver details:\n\n${JSON.stringify(d.raw ?? d, null, 2)}`)}
                          className="rounded-md border border-[#C7D8E6] bg-white px-2 py-1 text-xs hover:bg-[#F3F9FF]"
                        >
                          View
                        </button>
                        <button
                          onClick={() => deleteDriver(d.id ?? d.driverIdNo)}
                          className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Table cells ---------- */
function Th({ children }) {
  return <th className="py-2 pr-4 font-medium">{children}</th>;
}
function Td({ children }) {
  return <td className="py-2 pr-4 text-[#0B1526]">{children}</td>;
}
