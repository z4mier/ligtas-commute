// src/app/(protected)/drivers/page.js
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  listDrivers,
  createDriver,
  setDriverStatus,
  authHeaders,
} from "@/lib/api";
import {
  Eye,
  Pencil,
  Download,
  X,
  AlertTriangle,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Poppins } from "next/font/google";

/* ---------- FONT ---------- */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

/* ---------- CONFIG ---------- */
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API ||
  "http://localhost:4000";

/* ---------- utils ---------- */
const byBusNumber = (a, b) => Number(a.number) - Number(b.number);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const shortId = (id) =>
  id ? `DRV-${String(id).slice(-5).padStart(5, "0").toUpperCase()}` : "DRV—";
const pick = (v, fb = "—") => (v == null || v === "" ? fb : v);

/* QR helper */
async function makeQrDataUrl(text) {
  try {
    const QR = await import("qrcode");
    return await QR.toDataURL(text, { margin: 1, scale: 6 });
  } catch {
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
      text
    )}`;
  }
}

/* ---------- NORMALIZE DRIVER (includes route info) ---------- */
function normalizeDriver(p) {
  const bus = p.bus || {};
  const statusRaw = (p.status || (p.active ? "ACTIVE" : "INACTIVE") || "")
    .toString()
    .toUpperCase();

  const routeSide = bus.corridor || bus.routeSide || p.routeSide || "";

  const routeLabelFromBus = bus.route || bus.routeLabel || "";

  const forwardRoute = bus.forwardRoute || p.forwardRoute || "";
  const returnRoute = bus.returnRoute || p.returnRoute || "";

  const routeLabel =
    p.routeLabel ||
    routeLabelFromBus ||
    (forwardRoute && returnRoute ? `${forwardRoute} — ${returnRoute}` : "");

  return {
    id: p.id,
    fullName: pick(p.fullName),
    email: pick(p.email),
    phone: pick(p.phone),
    licenseNo: pick(p.licenseNo),
    birthDate: p.birthDate,
    address: pick(p.address),
    vehicleType: pick(bus.busType || p.vehicleType),
    busNo: pick(bus.number || p.busNo),
    plateNumber: pick(bus.plate || p.plateNumber),
    status: statusRaw || "ACTIVE",
    active: statusRaw === "ACTIVE",
    createdAt: p.createdAt,
    routeSide,
    forwardRoute,
    returnRoute,
    routeLabel,
  };
}

/* ---------- Validation (PH rules) ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^(09\d{9}|\+639\d{9})$/;
const LTO_LICENSE_RE = /^[A-Z]\d{2}-\d{2}-\d{6}$/;

function isAdult(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const eighteen = new Date(d.getFullYear() + 18, d.getMonth(), d.getDate());
  return eighteen <= now;
}

/* ---------- NiceSelect (scrollable, LIGHT THEME) ---------- */
function NiceSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  ariaLabel,
  listMaxHeight = 300,
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (
        btnRef.current &&
        !btnRef.current.contains(e.target) &&
        listRef.current &&
        !listRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected =
    options.find((o) => String(o.value) === String(value)) || null;

  function onKey(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (open && e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((s) => !s)}
        onKeyDown={onKey}
        style={{
          width: "100%",
          textAlign: "left",
          border: "1px solid #D4DBE7",
          borderRadius: 999,
          padding: "10px 14px",
          background: "#FFFFFF",
          color: "var(--text)",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: 13,
        }}
      >
        <span style={{ opacity: selected ? 1 : 0.6 }}>
          {selected ? selected.label : placeholder || "Select…"}
        </span>
        <span style={{ float: "right", opacity: 0.5 }}>▾</span>
      </button>

      {open && !disabled && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            marginTop: 6,
            background: "#FFFFFF",
            border: "1px solid #D4DBE7",
            borderRadius: 10,
            boxShadow: "0 16px 40px rgba(15,23,42,.14)",
            zIndex: 60,
            maxHeight: listMaxHeight,
            overflowY: "auto",
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: "10px 12px", color: "#9CA3AF" }}>
              No options
            </div>
          ) : (
            options.map((o) => {
              const active = String(o.value) === String(value);
              return (
                <div
                  key={o.value}
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={{
                    padding: "10px 12px",
                    color: "var(--text)",
                    background: active ? "#E0F2FE" : "transparent",
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "#EDF3FA";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {o.label}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* Helper for route side label */
function routeSideLabel(side) {
  if (side === "EAST") return "East route (via Oslob)";
  if (side === "WEST") return "West route (via Barili)";
  return "—";
}

/* ---------- MAIN ---------- */
export default function DriverManagementPage() {
  const [tab, setTab] = useState("info");
  const [flash, setFlash] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const [vehicleType, setVehicleType] = useState("");
  const [busList, setBusList] = useState([]);
  const [busId, setBusId] = useState("");
  const [busPlate, setBusPlate] = useState("");
  const [listRefreshing, setListRefreshing] = useState(false);

  const [routeSide, setRouteSide] = useState("");
  const [forwardRoute, setForwardRoute] = useState("");
  const [returnRoute, setReturnRoute] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    birthDate: "",
    licenseNo: "",
    address: "",
  });
  const upd = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  /* ---------- DRIVERS ---------- */
  const [drivers, setDrivers] = useState([]);
  const [drvLoading, setDrvLoading] = useState(false);
  const [drvError, setDrvError] = useState("");
  const [query, setQuery] = useState("");

  // sorting + pagination
  const [sortMode, setSortMode] = useState("newest"); // newest | oldest | nameAsc | nameDesc
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  // QR modal
  const [qrOpen, setQrOpen] = useState(false);
  const [qrImg, setQrImg] = useState("");
  const [qrDriver, setQrDriver] = useState(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState("");
  const eupd = (k, v) => {
    setEditForm((s) => (s ? { ...s, [k]: v } : s));
    if (editError) {
      const msg = validateFormBase({ ...(editForm || {}), [k]: v });
      if (!msg) setEditError("");
    }
  };

  // Confirm modal
  const [confirm, setConfirm] = useState({ open: false, driver: null });

  const usedBusNumbers = useMemo(() => {
    const set = new Set();
    for (const d of drivers) if (d.active && d.busNo) set.add(String(d.busNo));
    return set;
  }, [drivers]);

  async function loadDrivers() {
    setDrvError("");
    setDrvLoading(true);
    try {
      const items = await listDrivers();
      setDrivers((items || []).map(normalizeDriver));
    } catch (e) {
      setDrvError(e.message || "Failed to load");
      setDrivers([]);
    } finally {
      setDrvLoading(false);
    }
  }

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    if (tab === "info") loadDrivers();
  }, [tab]);

  useEffect(() => {
    if (!flash.text) return;
    const t = setTimeout(() => setFlash({ type: "", text: "" }), 1000);
    return () => clearTimeout(t);
  }, [flash.text]);

  const busOptions = useMemo(() => {
    const raw = (busList || []).slice().sort(byBusNumber);
    const filtered = raw.filter((b) => !usedBusNumbers.has(String(b.number)));
    return filtered.map((b) => ({ value: b.id, label: b.number }));
  }, [busList, usedBusNumbers]);

  useEffect(() => {
    let aborter;
    setBusId("");
    setBusPlate("");
    setRouteSide("");
    setForwardRoute("");
    setReturnRoute("");

    if (!vehicleType) {
      setBusList([]);
      return;
    }

    (async () => {
      try {
        setListRefreshing(true);
        aborter = new AbortController();
        const res = await fetch(
          `${API_URL}/buses?busType=${encodeURIComponent(
            vehicleType
          )}&active=true`,
          { headers: authHeaders(), signal: aborter.signal }
        ).catch(() => null);

        if (res && res.ok) {
          const data = await res.json();
          setBusList(Array.isArray(data) ? data : []);
        } else {
          setBusList([]);
        }
      } catch {
        setBusList([]);
      } finally {
        setListRefreshing(false);
      }
    })();

    return () => aborter?.abort();
  }, [vehicleType]);

  useEffect(() => {
    const found = (busList || []).find((b) => String(b.id) === String(busId));
    setBusPlate(found ? found.plate : "");

    const side = found?.corridor || found?.routeSide || "";
    setRouteSide(side);

    const fwd = found?.forwardRoute || "";
    const ret = found?.returnRoute || "";
    setForwardRoute(fwd);
    setReturnRoute(ret);
  }, [busId, busList]);

  /* Search filter */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) => {
      const hay = [
        d.fullName,
        d.email,
        d.phone,
        d.licenseNo,
        d.address,
        d.vehicleType,
        d.busNo,
        d.plateNumber,
        shortId(d.id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [drivers, query]);

  /* Sort */
  const sorted = useMemo(() => {
    const arr = filtered.slice();
    if (sortMode === "newest") {
      arr.sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at; // newest first
      });
    } else if (sortMode === "oldest") {
      arr.sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return at - bt; // oldest first
      });
    } else if (sortMode === "nameAsc") {
      arr.sort((a, b) =>
        (a.fullName || "").localeCompare(b.fullName || "", undefined, {
          sensitivity: "base",
        })
      );
    } else if (sortMode === "nameDesc") {
      arr.sort((a, b) =>
        (b.fullName || "").localeCompare(a.fullName || "", undefined, {
          sensitivity: "base",
        })
      );
    }
    return arr;
  }, [filtered, sortMode]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [query, sortMode, drivers.length]);

  useEffect(() => {
    setPage((p) => Math.min(p, pageCount));
  }, [pageCount]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  function askDeactivate(drv) {
    setConfirm({ open: true, driver: drv });
  }
  async function toggleDriverActive(drv, toActive) {
    try {
      await setDriverStatus({
        driverId: drv.id,
        status: toActive ? "ACTIVE" : "INACTIVE",
      });
      await loadDrivers();
      setFlash({
        type: "success",
        text: toActive ? "Driver activated." : "Driver deactivated.",
      });
    } catch (e) {
      setFlash({ type: "error", text: e.message || "Update failed" });
    } finally {
      setConfirm({ open: false, driver: null });
    }
  }

  function validateFormBase(f) {
    if (!f.fullName?.trim()) return "Full name is required.";
    if (!EMAIL_RE.test((f.email || "").trim())) return "Invalid email.";
    if (!PHONE_RE.test((f.phone || "").trim()))
      return "Invalid phone number.";
    if (!LTO_LICENSE_RE.test((f.licenseNo || "").trim().toUpperCase()))
      return "Invalid driver’s license number.";
    if (!isAdult(f.birthDate)) return "Driver must be at least 18 years old.";
    if (!f.address?.trim()) return "Address is required.";
    return "";
  }
  function validateCreate() {
    const base = validateFormBase(form);
    if (base) return base;
    if (!vehicleType || !busId)
      return "Please select vehicle type and bus number.";
    const selectedBus = (busList || []).find(
      (b) => String(b.id) === String(busId)
    );
    if (!selectedBus) return "Selected bus not found.";
    if (usedBusNumbers.has(String(selectedBus.number)))
      return `Bus ${selectedBus.number} is already assigned. Choose another.`;
    return "";
  }

  const [submitting, setSubmitting] = useState(false);
  async function onSubmit(e) {
    e.preventDefault();
    setFlash({ type: "", text: "" });

    const v = validateCreate();
    if (v) {
      setFlash({ type: "error", text: v });
      return;
    }

    const selectedBus = (busList || []).find(
      (b) => String(b.id) === String(busId)
    );

    const basePayload = { ...form };

    const busPayload = {
      busId: selectedBus.id,
    };

    const routePayload = {};
    if (selectedBus) {
      routePayload.routeSide =
        selectedBus.corridor || selectedBus.routeSide || null;

      routePayload.routeCode = selectedBus.routeId || null;

      const fwd = selectedBus.forwardRoute || "";
      const ret = selectedBus.returnRoute || "";
      const single = selectedBus.route || selectedBus.routeLabel || "";

      if (fwd && ret) {
        routePayload.routeLabel = `${fwd} — ${ret}`;
      } else if (single) {
        routePayload.routeLabel = single;
      }
    }

    const payload = {
      ...basePayload,
      ...busPayload,
      ...routePayload,
    };

    try {
      setLoading(true);
      setSubmitting(true);
      const data = await createDriver(payload);
      setFlash({ type: "success", text: data?.message || "Driver registered." });
      setForm({
        fullName: "",
        email: "",
        phone: "",
        birthDate: "",
        licenseNo: "",
        address: "",
      });
      setVehicleType("");
      setBusList([]);
      setBusId("");
      setBusPlate("");
      setRouteSide("");
      setForwardRoute("");
      setReturnRoute("");
      await loadDrivers();
      setTab("info");
    } catch (e) {
      const msg = (e?.response?.data?.message || e?.message || "").toLowerCase();
      let nice = "Server error";
      if (msg.includes("email") && msg.includes("exist"))
        nice = "Email already in use.";
      else if (msg.includes("phone") && msg.includes("exist"))
        nice = "Phone number already in use.";
      else if (msg.includes("license") && msg.includes("exist"))
        nice = "Driver’s license number already in use.";
      else if (msg.includes("bus") && (msg.includes("taken") || msg.includes("assigned")))
        nice = "This bus is already assigned.";
      else if (msg.includes("invalid email")) nice = "Invalid email.";
      else if (msg.includes("invalid phone")) nice = "Invalid phone number.";
      else if (msg.includes("under 18") || msg.includes("18"))
        nice = "Driver must be at least 18 years old.";
      else if (msg) nice = e.response?.data?.message || e.message;
      setFlash({ type: "error", text: nice });
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  }

  async function updateDriver(id, body) {
    const res = await fetch(`${API_URL}/admin/driver-profiles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Update failed");
    }
    return res.json().catch(() => ({}));
  }

  async function openQr(drv) {
    const payload = JSON.stringify({
      type: "driver",
      id: drv.id,
      code: shortId(drv.id),
      name: drv.fullName,
      bus: drv.busNo,
      plate: drv.plateNumber,
    });
    const url = await makeQrDataUrl(payload);
    setQrImg(url);
    setQrDriver(drv);
    setQrOpen(true);
  }

  function openEdit(drv) {
    setEditForm({
      id: drv.id,
      fullName: drv.fullName || "",
      email: drv.email || "",
      phone: drv.phone || "",
      birthDate: drv.birthDate ? drv.birthDate.slice(0, 10) : "",
      licenseNo: drv.licenseNo || "",
      address: drv.address || "",
    });
    setEditError("");
    setEditOpen(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editForm) return;
    const base = validateFormBase(editForm);
    if (base) {
      setEditError(base);
      return;
    }

    const body = {
      fullName: editForm.fullName,
      email: editForm.email,
      phone: editForm.phone,
      birthDate: editForm.birthDate,
      licenseNo: editForm.licenseNo,
      address: editForm.address,
    };

    try {
      await updateDriver(editForm.id, body);
      setEditOpen(false);
      setEditForm(null);
      await loadDrivers();
      setFlash({ type: "success", text: "Driver updated." });
    } catch (err) {
      setEditError(err.message || "Update failed");
    }
  }

  /* ---------- Styles (LIGHT THEME) ---------- */
  const S = {
    page: {
      display: "grid",
      gap: 16,
      maxWidth: 1120,
      margin: "0 auto",
      padding: "0 16px 24px",
    },
    tabs: {
      display: "flex",
      gap: 24,
      borderBottom: "1px solid var(--line)",
      marginBottom: 16,
      overflowX: "auto",
    },
    tabBtn: (active) => ({
      padding: "10px 0",
      borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
      fontWeight: 600,
      fontSize: 14,
      color: active ? "var(--accent)" : "var(--muted)",
      cursor: "pointer",
      whiteSpace: "nowrap",
    }),
    card: {
      background: "var(--card)",
      border: "1px solid var(--line)",
      borderRadius: 24,
      padding: 20,
      boxShadow: "0 20px 45px rgba(15,23,42,0.06)",
    },
    label: {
      fontWeight: 600,
      marginBottom: 6,
      fontSize: 13,
      color: "var(--muted)",
    },
    input: {
      width: "100%",
      border: "1px solid #D4DBE7",
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 14,
      background: "#F9FBFF",
      color: "var(--text)",
      outline: "none",
    },
    field: { display: "grid", gap: 6 },
    grid2: { display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" },
    grid3: { display: "grid", gap: 12, gridTemplateColumns: "repeat(3,1fr)" },
    btn: {
      width: "100%",
      background: "#0D658B",
      color: "#FFFFFF",
      border: "none",
      borderRadius: 999,
      padding: "12px 0",
      fontWeight: 700,
      fontSize: 14,
      letterSpacing: 0.3,
      cursor: "pointer",
      transition: "background .15s ease, box-shadow .15s ease",
      boxShadow: "0 0 0 rgba(13,101,139,0)",
    },
    btnHover: {
      background: "#0B5878",
      boxShadow: "0 0 14px rgba(13,101,139,.45)",
    },
    searchRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 12,
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    search: {
      flex: 1,
      minWidth: 260,
      borderRadius: 999,
      border: "1px solid #E2E8F0",
      padding: "10px 18px",
      background: "#F9FBFF",
      color: "var(--text)",
      fontSize: 14,
    },
    searchRight: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      justifyContent: "flex-end",
    },
    sortSelect: {
      border: "1px solid #D4DBE7",
      borderRadius: 999,
      padding: "8px 14px",
      fontSize: 13,
      background: "#FFFFFF",
      color: "#0F172A",
      outline: "none",
    },
    drvCard: {
      border: "1px solid #E2E8F0",
      borderRadius: 24,
      padding: 20,
      background: "#FFFFFF",
      boxShadow: "0 18px 40px rgba(15,23,42,0.05)",
    },
    drvHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
    },
    drvName: {
      fontWeight: 800,
      fontSize: 18,
      display: "flex",
      gap: 10,
      color: "var(--accent)",
      alignItems: "center",
      flexWrap: "wrap",
    },
    idPill: {
      padding: "4px 10px",
      borderRadius: 999,
      background: "#EEF2FF",
      fontSize: 12,
      color: "#4B5563",
      fontWeight: 600,
    },
    drvRight: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      justifyContent: "flex-end",
    },
    statusPill: (status) => {
      const isActive = status === "ACTIVE";
      return {
        padding: "4px 12px",
        borderRadius: 999,
        fontSize: 12,
        background: isActive ? "#E8F9F0" : "#E5E7EB",
        color: isActive ? "#166534" : "#4B5563",
        border: isActive ? "1px solid #86EFAC" : "1px solid #CBD5F5",
        fontWeight: 600,
      };
    },
    editBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 12px",
      borderRadius: 999,
      border: "1px solid #CBD5F5",
      background: "#FFFFFF",
      color: "#0F172A",
      fontSize: 12,
      cursor: "pointer",
      fontWeight: 500,
    },
    drvBody: {
      display: "grid",
      gap: 14,
      gridTemplateColumns: "repeat(2, minmax(0,1fr))",
      marginTop: 12,
    },
    drvCol: {
      display: "grid",
      gap: 6,
    },
    sectionTitle: {
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 0.08,
      color: "#9CA3AF",
      marginBottom: 4,
      fontWeight: 600,
    },
    drvRow: {
      display: "grid",
      gridTemplateColumns: "120px 1fr",
      gap: 8,
      fontSize: 14,
      color: "#0F172A",
    },
    drvFooter: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 16,
      flexWrap: "wrap",
    },
    btnGhost: {
      padding: "8px 10px",
      borderRadius: 999,
      border: "1px solid #D4DBE7",
      background: "#FFFFFF",
      color: "var(--accent)",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      fontWeight: 500,
    },
    btnGreen: {
      padding: "8px 12px",
      borderRadius: 999,
      border: "1px solid #22C55E",
      background: "#FFFFFF",
      color: "#16A34A",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 500,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
    },
    btnRed: {
      padding: "8px 12px",
      borderRadius: 999,
      border: "1px solid #FCA5A5",
      background: "#FFFFFF",
      color: "#B91C1C",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 500,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
    },
    muted: { color: "#6B7280", fontSize: 14 },
    flash: (type) => ({
      padding: "10px 14px",
      borderRadius: 10,
      fontSize: 14,
      color: type === "error" ? "#B91C1C" : "#166534",
      background: type === "error" ? "#FEE2E2" : "#DCFCE7",
      border:
        type === "error" ? "1px solid #FCA5A5" : "1px solid #86EFAC",
      transition: "opacity .2s ease",
    }),
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,.35)",
      display: "grid",
      placeItems: "center",
      zIndex: 80,
    },
    modal: {
      width: "min(720px, 96vw)",
      background: "var(--card)",
      border: "1px solid var(--line)",
      borderRadius: 20,
      padding: 16,
      boxShadow: "0 24px 60px rgba(15,23,42,.18)",
    },
    modalHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    iconBtn: {
      height: 36,
      width: 36,
      display: "grid",
      placeItems: "center",
      borderRadius: 999,
      border: "1px solid #D4DBE7",
      background: "#FFFFFF",
      color: "#0F172A",
      cursor: "pointer",
    },
    danger: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: 12,
      borderRadius: 12,
      border: "1px solid #FCA5A5",
      background: "#FEE2E2",
      color: "#B91C1C",
      marginBottom: 12,
      fontSize: 14,
    },
    modalFlash: (type = "error") => ({
      marginBottom: 10,
      padding: "10px 12px",
      borderRadius: 10,
      fontSize: 14,
      color: type === "error" ? "#B91C1C" : "#166534",
      background: type === "error" ? "#FEE2E2" : "#DCFCE7",
      border:
        type === "error" ? "1px solid #FCA5A5" : "1px solid #86EFAC",
    }),
    pagination: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 16,
    },
    paginationBtn: {
      height: 32,
      width: 32,
      borderRadius: 999,
      border: "1px solid #D4DBE7",
      background: "#FFFFFF",
      display: "grid",
      placeItems: "center",
      cursor: "pointer",
      fontSize: 16,
      lineHeight: 1,
      color: "#0F172A",
    },
    paginationInfo: {
      fontSize: 13,
      color: "#6B7280",
      fontWeight: 500,
    },
  };

  return (
    <>
      <style jsx global>{`
        @media (max-width: 900px) {
          .driver-grid-2 {
            grid-template-columns: 1fr !important;
          }
          .driver-grid-3 {
            grid-template-columns: 1fr !important;
          }
          .driver-body-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className={poppins.className} style={S.page}>
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: 0,
              letterSpacing: 0.2,
            }}
          >
            Driver Management
          </h1>
          <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 14 }}>
            Register new drivers and manage applications.
          </p>
        </div>

        <div style={S.tabs}>
          <div style={S.tabBtn(tab === "info")} onClick={() => setTab("info")}>
            Informations
          </div>
          <div
            style={S.tabBtn(tab === "register")}
            onClick={() => setTab("register")}
          >
            Register Driver
          </div>
        </div>

        {flash.text && (
          <div aria-live="polite" role="status" style={S.flash(flash.type)}>
            {flash.text}
          </div>
        )}

        {tab === "register" ? (
          <section style={S.card}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 18,
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span>+ Register New Driver</span>
            </div>

            <form
              onSubmit={onSubmit}
              style={{ display: "grid", gap: 12 }}
              noValidate
            >
              <div style={S.grid2} className="driver-grid-2">
                <div style={S.field}>
                  <label style={S.label}>Full Name</label>
                  <input
                    style={S.input}
                    placeholder="Juan Dela Cruz"
                    value={form.fullName}
                    onChange={(e) => upd("fullName", e.target.value)}
                    required
                  />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Phone Number</label>
                  <input
                    style={S.input}
                    placeholder="09XXXXXXXXX"
                    value={form.phone}
                    onChange={(e) => upd("phone", e.target.value)}
                    required
                    inputMode="tel"
                  />
                </div>
              </div>

              <div style={S.grid2} className="driver-grid-2">
                <div style={S.field}>
                  <label style={S.label}>Email</label>
                  <input
                    style={S.input}
                    type="email"
                    placeholder="driver@example.com"
                    value={form.email}
                    onChange={(e) => upd("email", e.target.value)}
                    required
                  />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Driver’s License Number</label>
                  <input
                    style={S.input}
                    placeholder="X00-00-000000"
                    value={form.licenseNo}
                    onChange={(e) =>
                      upd("licenseNo", e.target.value.toUpperCase())
                    }
                    required
                  />
                </div>
              </div>

              <div style={S.grid2} className="driver-grid-2">
                <div style={S.field}>
                  <label style={S.label}>Birth Date</label>
                  <input
                    style={S.input}
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => upd("birthDate", e.target.value)}
                    required
                  />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Address</label>
                  <input
                    style={S.input}
                    placeholder="Street, Barangay, City"
                    value={form.address}
                    onChange={(e) => upd("address", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={S.grid3} className="driver-grid-3">
                <div style={S.field}>
                  <label style={S.label}>Vehicle Type</label>
                  <NiceSelect
                    ariaLabel="Vehicle Type"
                    value={vehicleType}
                    onChange={(v) => setVehicleType(v)}
                    options={[
                      { value: "AIRCON", label: "Ceres Bus (AC)" },
                      { value: "NON_AIRCON", label: "Ceres Bus (Non-AC)" },
                    ]}
                    placeholder="Select vehicle type"
                    listMaxHeight={300}
                  />
                </div>

                <div style={S.field}>
                  <label style={S.label}>Bus Number</label>
                  <NiceSelect
                    ariaLabel="Bus Number"
                    value={busId}
                    onChange={(v) => setBusId(v)}
                    options={busOptions}
                    placeholder={
                      vehicleType ? "Select bus number" : "Select vehicle first"
                    }
                    disabled={!vehicleType}
                    listMaxHeight={300}
                  />
                  {vehicleType && busOptions.length === 0 && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: "#B91C1C",
                      }}
                    >
                      No registered buses available for this type. Please
                      register buses first.
                    </div>
                  )}
                </div>

                <div style={S.field}>
                  <label style={S.label}>Plate Number</label>
                  <input
                    style={{
                      ...S.input,
                      background: "#F3F4F6",
                    }}
                    placeholder="Auto-filled"
                    value={busPlate}
                    readOnly
                  />
                </div>
              </div>

              <div style={S.grid2} className="driver-grid-2">
                <div style={S.field}>
                  <label style={S.label}>Route Side</label>
                  <input
                    style={{
                      ...S.input,
                      background: "#F3F4F6",
                    }}
                    placeholder="Auto-filled from selected bus"
                    value={routeSideLabel(routeSide)}
                    readOnly
                  />
                </div>

                <div style={S.field}>
                  <label style={S.label}>Route</label>
                  <input
                    style={{
                      ...S.input,
                      background: "#F3F4F6",
                    }}
                    placeholder="Auto-filled from selected bus"
                    value={
                      forwardRoute && returnRoute
                        ? `${forwardRoute} — ${returnRoute}`
                        : ""
                    }
                    readOnly
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || submitting}
                style={{ ...S.btn }}
                onMouseEnter={(e) =>
                  Object.assign(e.currentTarget.style, S.btnHover)
                }
                onMouseLeave={(e) =>
                  Object.assign(e.currentTarget.style, S.btn)
                }
              >
                {loading
                  ? "Registering..."
                  : "Register Driver & Generate QR Code"}
              </button>
            </form>
          </section>
        ) : (
          <section style={S.card}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>
              Driver Informations
            </div>

            <div style={S.searchRow}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, phone, bus, plate…"
                style={S.search}
              />
              <div style={S.searchRight}>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value)}
                  style={S.sortSelect}
                >
                  <option value="newest">Newest to oldest</option>
                  <option value="oldest">Oldest to newest</option>
                  <option value="nameAsc">A–Z (driver name)</option>
                  <option value="nameDesc">Z–A (driver name)</option>
                </select>
              </div>
            </div>

            {drvError && (
              <div
                style={{
                  ...S.muted,
                  marginBottom: 8,
                  color: "#B91C1C",
                }}
              >
                Error: {drvError}
              </div>
            )}

            {drvLoading ? (
              <div style={S.muted}>Loading drivers…</div>
            ) : sorted.length === 0 ? (
              <div style={S.muted}>No drivers found.</div>
            ) : (
              <>
                <div style={{ display: "grid", gap: 12 }}>
                  {pageItems.map((d, idx) => {
                    const key = d.id || d.email || d.licenseNo || `drv-${idx}`;

                    const routeLabelText =
                      d.routeLabel ||
                      (d.forwardRoute && d.returnRoute
                        ? `${d.forwardRoute} — ${d.returnRoute}`
                        : "—");

                    return (
                      <div key={key} style={S.drvCard}>
                        {/* HEADER: name + code left, status pill right */}
                        <div style={S.drvHeader}>
                          <div style={S.drvName}>
                            <span>{d.fullName || "Unnamed Driver"}</span>
                            <span style={S.idPill}>{shortId(d.id)}</span>
                          </div>

                          <div style={S.drvRight}>
                            <div style={S.statusPill(d.status)}>
                              {d.active ? "Active" : "Not active"}
                            </div>
                          </div>
                        </div>

                        {/* BODY */}
                        <div
                          style={S.drvBody}
                          className="driver-body-grid"
                        >
                          <div style={S.drvCol}>
                            <div style={S.sectionTitle}>
                              Personal information
                            </div>
                            <div style={S.drvRow}>
                              <div>Email</div>
                              <div>{d.email}</div>
                            </div>
                            <div style={S.drvRow}>
                              <div>Phone</div>
                              <div>{d.phone}</div>
                            </div>
                            <div style={S.drvRow}>
                              <div>Birth date</div>
                              <div>{fmtDate(d.birthDate)}</div>
                            </div>
                            <div style={S.drvRow}>
                              <div>License</div>
                              <div>{d.licenseNo}</div>
                            </div>
                            <div style={S.drvRow}>
                              <div>Address</div>
                              <div>{d.address}</div>
                            </div>
                            <div style={S.drvRow}>
                              <div>Applied on</div>
                              <div>{fmtDate(d.createdAt)}</div>
                            </div>
                          </div>

                          <div style={S.drvCol}>
                            <div style={S.sectionTitle}>Bus & route</div>
                            <div style={S.drvRow}>
                              <div>Vehicle</div>
                              <div>{d.vehicleType}</div>
                            </div>
                            <div style={S.drvRow}>
                              <div>Bus number</div>
                              <div>{d.busNo}</div>
                            </div>
                            <div style={S.drvRow}>
                              <div>Plate number</div>
                              <div>{d.plateNumber}</div>
                            </div>
                            <div style={S.drvRow}>
                              <div>Route side</div>
                              <div>{routeSideLabel(d.routeSide)}</div>
                            </div>
                            <div style={S.drvRow}>
                              <div>Route</div>
                              <div>{routeLabelText}</div>
                            </div>
                          </div>
                        </div>

                        {/* FOOTER BUTTONS bottom-right */}
                        <div style={S.drvFooter}>
                          <button
                            type="button"
                            style={S.editBtn}
                            onClick={() => openEdit(d)}
                          >
                            <Pencil size={14} />
                            <span>Edit</span>
                          </button>

                          {d.active ? (
                            <button
                              type="button"
                              style={S.btnRed}
                              onClick={() => askDeactivate(d)}
                            >
                              <Trash2 size={14} />
                              <span>Deactivate</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              style={S.btnGreen}
                              onClick={() => toggleDriverActive(d, true)}
                            >
                              <RefreshCw size={14} />
                              <span>Reactivate</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {pageCount > 1 && (
                  <div style={S.pagination}>
                    <button
                      type="button"
                      style={{
                        ...S.paginationBtn,
                        opacity: page === 1 ? 0.4 : 1,
                        cursor: page === 1 ? "default" : "pointer",
                      }}
                      disabled={page === 1}
                      onClick={() => page > 1 && setPage(page - 1)}
                    >
                      ‹
                    </button>
                    <span style={S.paginationInfo}>
                      Page {page} of {pageCount}
                    </span>
                    <button
                      type="button"
                      style={{
                        ...S.paginationBtn,
                        opacity: page === pageCount ? 0.4 : 1,
                        cursor:
                          page === pageCount ? "default" : "pointer",
                      }}
                      disabled={page === pageCount}
                      onClick={() =>
                        page < pageCount && setPage(page + 1)
                      }
                    >
                      ›
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* QR MODAL */}
        {qrOpen && (
          <div style={S.overlay} onMouseDown={() => setQrOpen(false)}>
            <div
              style={S.modal}
              onMouseDown={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div style={S.modalHeader}>
                <strong>Driver QR Code</strong>
                <button style={S.iconBtn} onClick={() => setQrOpen(false)}>
                  <X size={16} />
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  padding: 16,
                  gap: 12,
                }}
              >
                <img
                  src={qrImg}
                  alt="Driver QR"
                  style={{
                    width: 240,
                    height: 240,
                    borderRadius: 12,
                    border: "1px solid #E2E8F0",
                  }}
                />
                <a
                  href={qrImg}
                  download={`${
                    qrDriver ? shortId(qrDriver.id) : "driver-qr"
                  }.png`}
                  style={{
                    ...S.btn,
                    width: "auto",
                    padding: "10px 14px",
                    textDecoration: "none",
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <Download size={16} /> Download QR
                  </span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {editOpen && editForm && (
          <div
            style={S.overlay}
            onMouseDown={() => setEditOpen(false)}
          >
            <div
              style={S.modal}
              onMouseDown={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div style={S.modalHeader}>
                <strong>Edit Driver</strong>
                <button
                  style={S.iconBtn}
                  onClick={() => setEditOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>

              {editError && (
                <div style={S.modalFlash("error")}>{editError}</div>
              )}

              <form onSubmit={saveEdit} style={{ display: "grid", gap: 12 }}>
                <div style={S.grid2} className="driver-grid-2">
                  <div style={S.field}>
                    <label style={S.label}>Full Name</label>
                    <input
                      style={S.input}
                      value={editForm.fullName}
                      onChange={(e) => eupd("fullName", e.target.value)}
                      required
                    />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Phone Number</label>
                    <input
                      style={S.input}
                      value={editForm.phone}
                      onChange={(e) => eupd("phone", e.target.value)}
                      required
                      inputMode="tel"
                    />
                  </div>
                </div>

                <div style={S.grid2} className="driver-grid-2">
                  <div style={S.field}>
                    <label style={S.label}>Email</label>
                    <input
                      style={S.input}
                      type="email"
                      value={editForm.email}
                      onChange={(e) => eupd("email", e.target.value)}
                      required
                    />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Driver’s License Number</label>
                    <input
                      style={S.input}
                      value={editForm.licenseNo}
                      onChange={(e) =>
                        eupd("licenseNo", e.target.value.toUpperCase())
                      }
                      required
                    />
                  </div>
                </div>

                <div style={S.grid2} className="driver-grid-2">
                  <div style={S.field}>
                    <label style={S.label}>Birth Date</label>
                    <input
                      style={S.input}
                      type="date"
                      value={editForm.birthDate}
                      onChange={(e) => eupd("birthDate", e.target.value)}
                      required
                    />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Address</label>
                    <input
                      style={S.input}
                      value={editForm.address}
                      onChange={(e) => eupd("address", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "end",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    style={S.btnGhost}
                    onClick={() => setEditOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      ...S.btn,
                      width: "auto",
                      padding: "10px 16px",
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CONFIRM DEACTIVATE */}
        {confirm.open && confirm.driver && (
          <div
            style={S.overlay}
            onMouseDown={() => setConfirm({ open: false, driver: null })}
          >
            <div
              style={S.modal}
              onMouseDown={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div style={S.modalHeader}>
                <strong>Deactivate Driver?</strong>
                <button
                  style={S.iconBtn}
                  onClick={() =>
                    setConfirm({ open: false, driver: null })
                  }
                >
                  <X size={16} />
                </button>
              </div>
              <div style={S.danger}>
                <AlertTriangle size={18} />
                This will disable the driver’s account. The assigned bus
                number becomes available for new registrations.
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                }}
              >
                <button
                  style={S.btnGhost}
                  onClick={() =>
                    setConfirm({ open: false, driver: null })
                  }
                >
                  Cancel
                </button>
                <button
                  style={{ ...S.btnRed }}
                  onClick={() =>
                    toggleDriverActive(confirm.driver, false)
                  }
                >
                  <Trash2 size={16} />
                  <span>Yes, Deactivate</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
