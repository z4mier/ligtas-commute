// src/app/(protected)/drivers/page.js
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  listDrivers,
  createDriver,
  setDriverStatus,
  authHeaders,
} from "@/lib/api";
import { Eye, Pencil, Download, X, AlertTriangle } from "lucide-react";

/* ---------- CONFIG ---------- */
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API ||
  "http://localhost:4000";

/* Catalog (AC / Non-AC only) */
const BUS_CATALOG = {
  AIRCON: [
    { id: "ac-3000", number: "3000", plate: "ABC 1234" },
    { id: "ac-3001", number: "3001", plate: "ABC 5678" },
    { id: "ac-3205", number: "3205", plate: "ACR 1205" },
    { id: "ac-3308", number: "3308", plate: "ACX 3308" },
    { id: "ac-3402", number: "3402", plate: "ACY 3402" },
    { id: "ac-3507", number: "3507", plate: "ACT 3507" },
    { id: "ac-3604", number: "3604", plate: "ACU 3604" },
  ],
  NON_AIRCON: [
    { id: "nac-1000", number: "1000", plate: "DFG 4567" },
    { id: "nac-1001", number: "1001", plate: "DFG 8910" },
    { id: "nac-1103", number: "1103", plate: "NAX 1103" },
    { id: "nac-1201", number: "1201", plate: "NAY 1201" },
    { id: "nac-1255", number: "1255", plate: "NAQ 1255" },
    { id: "nac-1304", number: "1304", plate: "NAP 1304" },
    { id: "nac-1310", number: "1310", plate: "NAZ 1310" },
  ],
};

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

function normalizeDriver(p) {
  const bus = p.bus || {};
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
    active: Boolean(p.active ?? (p.status ? p.status === "ACTIVE" : true)),
    createdAt: p.createdAt,
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

/* ---------- NiceSelect (scrollable) ---------- */
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
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          padding: "10px 12px",
          background: "rgba(255,255,255,0.05)",
          color: "#f5f5f5",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <span style={{ opacity: selected ? 1 : 0.6 }}>
          {selected ? selected.label : placeholder || "Select…"}
        </span>
        <span style={{ float: "right", opacity: 0.7 }}>▾</span>
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
            background: "#0B132B",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            boxShadow: "0 8px 20px rgba(0,0,0,.45)",
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
            options.map((o) => (
              <div
                key={o.value}
                role="option"
                aria-selected={String(o.value) === String(value)}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={{
                  padding: "10px 12px",
                  color: "#f5f5f5",
                  background:
                    String(o.value) === String(value)
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",
                  cursor: "pointer",
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                {o.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
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

  // only exclude buses that are taken by ACTIVE drivers
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

  /* Auto-dismiss flash after 1s */
  useEffect(() => {
    if (!flash.text) return;
    const t = setTimeout(() => setFlash({ type: "", text: "" }), 1000);
    return () => clearTimeout(t);
  }, [flash.text]);

  /* Build bus options with filtering (exclude used) */
  const busOptions = useMemo(() => {
    const raw = (busList || []).slice().sort(byBusNumber);
    const filtered = raw.filter((b) => !usedBusNumbers.has(String(b.number)));
    return filtered.map((b) => ({ value: b.id, label: b.number }));
  }, [busList, usedBusNumbers]);

  /* Vehicle type load + remote merge */
  useEffect(() => {
    let aborter;
    setBusId("");
    setBusPlate("");
    if (!vehicleType) {
      setBusList([]);
      return;
    }
    setBusList(BUS_CATALOG[vehicleType] || []);

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
          if (Array.isArray(data) && data.length) {
            const map = new Map();
            [...data, ...BUS_CATALOG[vehicleType]].forEach((b) =>
              map.set(String(b.id), b)
            );
            setBusList(Array.from(map.values()));
          }
        }
      } finally {
        setListRefreshing(false);
      }
    })();

    return () => aborter?.abort();
  }, [vehicleType]);

  useEffect(() => {
    const found = (busList || []).find((b) => String(b.id) === String(busId));
    setBusPlate(found ? found.plate : "");
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

  /* Toggle Active with confirm */
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

  /* Client-side validation */
  function validateFormBase(f) {
    if (!f.fullName?.trim()) return "Full name is required.";
    if (!EMAIL_RE.test((f.email || "").trim())) return "Invalid email.";
    if (!PHONE_RE.test((f.phone || "").trim()))
      return "Invalid phone number. Use 09XXXXXXXXX or +639XXXXXXXXX.";
    if (!LTO_LICENSE_RE.test((f.licenseNo || "").trim().toUpperCase()))
      return "Invalid driver’s license number (use format: X00-00-000000).";
    if (!isAdult(f.birthDate)) return "Driver must be at least 18 years old.";
    if (!f.address?.trim()) return "Address is required.";
    return "";
  }
  function validateCreate() {
    const base = validateFormBase(form);
    if (base) return base;
    if (!vehicleType || !busId)
      return "Please select vehicle type and bus number.";
    const selected = (busList || []).find((b) => String(b.id) === String(busId));
    if (!selected) return "Selected bus not found.";
    if (usedBusNumbers.has(String(selected.number)))
      return `Bus ${selected.number} is already assigned. Choose another.`;
    return "";
  }

  /* Submit (create) */
  const [submitting, setSubmitting] = useState(false);
  async function onSubmit(e) {
    e.preventDefault();
    setFlash({ type: "", text: "" });

    const v = validateCreate();
    if (v) {
      setFlash({ type: "error", text: v });
      return;
    }

    const selected = (busList || []).find((b) => String(b.id) === String(busId));
    const payload = /^\d+$/.test(String(selected.id))
      ? { ...form, busId: Number(selected.id) }
      : {
          ...form,
          vehicleType,
          busNo: selected.number,
          plateNumber: selected.plate,
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

  /* Update (edit) */
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
      vehicleType: drv.vehicleType || "",
      busId: "",
      busPlate: "",
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

    let body = {
      fullName: editForm.fullName,
      email: editForm.email,
      phone: editForm.phone,
      birthDate: editForm.birthDate,
      licenseNo: editForm.licenseNo,
      address: editForm.address,
    };

    if (editForm.vehicleType && editForm.busId) {
      const list = BUS_CATALOG[editForm.vehicleType] || [];
      const found = (list || []).find((b) => String(b.id) === String(editForm.busId));
      if (found) {
        body =
          /^\d+$/.test(String(found.id))
            ? { ...body, busId: Number(found.id) }
            : {
                ...body,
                vehicleType: editForm.vehicleType,
                busNo: found.number,
                plateNumber: found.plate,
              };
      }
    }

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

  /* ---------- Styles ---------- */
  const S = {
    page: { display: "grid", gap: 16 },
    tabs: {
      display: "flex",
      gap: 20,
      borderBottom: "1px solid var(--line)",
      marginBottom: 16,
    },
    tabBtn: (active) => ({
      padding: "10px 0",
      borderBottom: `2px solid ${active ? "var(--text)" : "transparent"}`,
      fontWeight: 600,
      color: active ? "var(--text)" : "var(--muted)",
      cursor: "pointer",
    }),
    card: {
      background: "var(--card)",
      border: "1px solid var(--line)",
      borderRadius: 16,
      padding: 20,
    },
    label: {
      fontWeight: 600,
      marginBottom: 6,
      fontSize: 13,
      color: "var(--muted)",
    },
    input: {
      width: "100%",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 14,
      background: "rgba(255,255,255,0.05)",
      color: "#f5f5f5",
      outline: "none",
    },
    field: { display: "grid", gap: 6 },
    grid2: { display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" },
    grid3: { display: "grid", gap: 12, gridTemplateColumns: "repeat(3,1fr)" },
    btn: {
      width: "100%",
      background: "#0E4371",
      color: "white",
      border: "none",
      borderRadius: 10,
      padding: "12px 0",
      fontWeight: 700,
      letterSpacing: 0.2,
      cursor: "pointer",
      transition: ".2s",
      boxShadow: "0 0 0 rgba(19,94,161,0)",
    },
    btnHover: {
      background: "#135ea1",
      boxShadow: "0 0 12px rgba(19,94,161,.55)",
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 12,
      color: "#9CA3AF",
    },
    dot: (on) => ({
      height: 6,
      width: 6,
      borderRadius: 999,
      background: on ? "#22c55e" : "#ef4444",
    }),
    searchRow: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      marginBottom: 12,
    },
    search: {
      flex: 1,
      width: "100%",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10,
      padding: "10px 12px",
      background: "rgba(255,255,255,0.05)",
      color: "#f5f5f5",
    },
    refresh: {
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.15)",
      background: "rgba(255,255,255,0.06)",
      color: "#e5e7eb",
      cursor: "pointer",
    },
    drvCard: {
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14,
      padding: 16,
      background: "rgba(255,255,255,0.03)",
    },
    drvHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    drvName: { fontWeight: 800, fontSize: 18, display: "flex", gap: 10 },
    idPill: {
      padding: "4px 10px",
      borderRadius: 999,
      background: "rgba(255,255,255,0.1)",
      fontSize: 12,
      color: "#e5e7eb",
    },
    drvGrid: {
      display: "grid",
      gap: 10,
      gridTemplateColumns: "repeat(2,minmax(0,1fr))",
      marginTop: 10,
    },
    drvRow: {
      display: "grid",
      gridTemplateColumns: "120px 1fr",
      gap: 8,
      fontSize: 14,
      color: "#cbd5e1",
    },
    drvActions: { display: "flex", gap: 10, marginTop: 12 },
    btnGhost: {
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.15)",
      background: "rgba(255,255,255,0.06)",
      color: "#e5e7eb",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    },
    btnGreen: {
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid rgba(34,197,94,.35)",
      background: "rgba(34,197,94,.18)",
      color: "#bbf7d0",
      cursor: "pointer",
    },
    btnRed: {
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid rgba(239,68,68,.35)",
      background: "rgba(239,68,68,.18)",
      color: "#fecaca",
      cursor: "pointer",
    },
    muted: { color: "#94a3b8", fontSize: 14 },
    flash: (type) => ({
      padding: "10px 14px",
      borderRadius: 8,
      fontSize: 14,
      color: type === "error" ? "#fca5a5" : "#86efac",
      background:
        type === "error" ? "rgba(239,68,68,.15)" : "rgba(34,197,94,.12)",
      border:
        type === "error"
          ? "1px solid rgba(239,68,68,.35)"
          : "1px solid rgba(34,197,94,.35)",
      transition: "opacity .2s ease",
    }),
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.6)",
      display: "grid",
      placeItems: "center",
      zIndex: 80,
    },
    modal: {
      width: "min(720px, 96vw)",
      background: "var(--card)",
      border: "1px solid var(--line)",
      borderRadius: 16,
      padding: 16,
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
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.15)",
      background: "rgba(255,255,255,0.06)",
      color: "#e5e7eb",
      cursor: "pointer",
    },
    danger: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: 12,
      borderRadius: 12,
      border: "1px solid rgba(239,68,68,.35)",
      background: "rgba(239,68,68,.12)",
      color: "#fecaca",
      marginBottom: 12,
    },
    modalFlash: (type = "error") => ({
      marginBottom: 10,
      padding: "10px 12px",
      borderRadius: 10,
      fontSize: 14,
      color: type === "error" ? "#fca5a5" : "#86efac",
      background:
        type === "error" ? "rgba(239,68,68,.15)" : "rgba(34,197,94,.12)",
      border:
        type === "error"
          ? "1px solid rgba(239,68,68,.35)"
          : "1px solid rgba(34,197,94,.35)",
    }),
  };

  return (
    <div style={S.page}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
          Driver Management
        </h1>
        <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
          Register new drivers and manage applications.
        </p>
      </div>

      <div style={S.tabs}>
        <div
          style={S.tabBtn(tab === "info")}
          onClick={() => setTab("info")}
        >
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
            }}
          >
            <span>+ Register New Driver</span>
            <span style={S.badge}>
              <span style={S.dot(!listRefreshing)} />
              {listRefreshing ? "Refreshing list…" : "List up to date"}
            </span>
          </div>

          <form
            onSubmit={onSubmit}
            style={{ display: "grid", gap: 12 }}
            noValidate
          >
            <div style={S.grid2}>
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
                  placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                  value={form.phone}
                  onChange={(e) => upd("phone", e.target.value)}
                  required
                  inputMode="tel"
                />
              </div>
            </div>

            <div style={S.grid2}>
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

            <div style={S.grid2}>
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

            <div style={S.grid3}>
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
                      color: "#fca5a5",
                    }}
                  >
                    All buses for this type are already assigned.
                  </div>
                )}
              </div>

              <div style={S.field}>
                <label style={S.label}>Plate Number</label>
                <input
                  style={{
                    ...S.input,
                    background: "rgba(255,255,255,0.03)",
                  }}
                  placeholder="Auto-filled"
                  value={busPlate}
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
          <div
            style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}
          >
            Driver Informations
          </div>

          <div style={S.searchRow}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              style={S.search}
            />
            <button
              style={S.refresh}
              onClick={loadDrivers}
              disabled={drvLoading}
            >
              {drvLoading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {drvError && (
            <div
              style={{
                ...S.muted,
                marginBottom: 8,
                color: "#fca5a5",
              }}
            >
              Error: {drvError}
            </div>
          )}

          {drvLoading ? (
            <div style={S.muted}>Loading drivers…</div>
          ) : filtered.length === 0 ? (
            <div style={S.muted}>No drivers found.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {filtered.map((d, idx) => {
                const key =
                  d.id ||
                  d.email ||
                  d.licenseNo ||
                  `drv-${idx}`;

                return (
                  <div key={key} style={S.drvCard}>
                    <div style={S.drvHeader}>
                      <div style={S.drvName}>
                        <span>{d.fullName || "Unnamed Driver"}</span>
                        <span style={S.idPill}>{shortId(d.id)}</span>
                      </div>
                      <button
                        title="Edit driver"
                        style={S.iconBtn}
                        onClick={() => openEdit(d)}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>

                    <div style={S.drvGrid}>
                      <div style={S.drvRow}>
                        <div>Email:</div>
                        <div>{d.email}</div>
                      </div>
                      <div style={S.drvRow}>
                        <div>Phone:</div>
                        <div>{d.phone}</div>
                      </div>
                      <div style={S.drvRow}>
                        <div>Birth Date:</div>
                        <div>{fmtDate(d.birthDate)}</div>
                      </div>
                      <div style={S.drvRow}>
                        <div>License:</div>
                        <div>{d.licenseNo}</div>
                      </div>
                      <div style={S.drvRow}>
                        <div>Address:</div>
                        <div>{d.address}</div>
                      </div>
                      <div style={S.drvRow}>
                        <div>Vehicle:</div>
                        <div>{d.vehicleType}</div>
                      </div>
                      <div style={S.drvRow}>
                        <div>Bus Number:</div>
                        <div>{d.busNo}</div>
                      </div>
                      <div style={S.drvRow}>
                        <div>Plate Number:</div>
                        <div>{d.plateNumber}</div>
                      </div>
                      <div style={S.drvRow}>
                        <div>Applied:</div>
                        <div>{fmtDate(d.createdAt)}</div>
                      </div>
                    </div>

                    <div style={S.drvActions}>
                      <button
                        style={S.btnGhost}
                        onClick={() => openQr(d)}
                      >
                        <Eye size={16} /> View
                      </button>
                      {d.active ? (
                        <button
                          style={S.btnRed}
                          onClick={() => askDeactivate(d)}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          style={S.btnGreen}
                          onClick={() => toggleDriverActive(d, true)}
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* QR MODAL */}
      {qrOpen && (
        <div
          style={S.overlay}
          onMouseDown={() => setQrOpen(false)}
        >
          <div
            style={S.modal}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div style={S.modalHeader}>
              <strong>Driver QR Code</strong>
              <button
                style={S.iconBtn}
                onClick={() => setQrOpen(false)}
              >
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
                  border: "1px solid rgba(255,255,255,0.1)",
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

            <form
              onSubmit={saveEdit}
              style={{ display: "grid", gap: 12 }}
            >
              <div style={S.grid2}>
                <div style={S.field}>
                  <label style={S.label}>Full Name</label>
                  <input
                    style={S.input}
                    value={editForm.fullName}
                    onChange={(e) =>
                      eupd("fullName", e.target.value)
                    }
                    required
                  />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Phone Number</label>
                  <input
                    style={S.input}
                    value={editForm.phone}
                    onChange={(e) =>
                      eupd("phone", e.target.value)
                    }
                    required
                    inputMode="tel"
                  />
                </div>
              </div>

              <div style={S.grid2}>
                <div style={S.field}>
                  <label style={S.label}>Email</label>
                  <input
                    style={S.input}
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      eupd("email", e.target.value)
                    }
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

              <div style={S.grid2}>
                <div style={S.field}>
                  <label style={S.label}>Birth Date</label>
                  <input
                    style={S.input}
                    type="date"
                    value={editForm.birthDate}
                    onChange={(e) =>
                      eupd("birthDate", e.target.value)
                    }
                    required
                  />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Address</label>
                  <input
                    style={S.input}
                    value={editForm.address}
                    onChange={(e) =>
                      eupd("address", e.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div style={S.grid3}>
                <div style={S.field}>
                  <label style={S.label}>Vehicle Type</label>
                  <NiceSelect
                    ariaLabel="Vehicle Type"
                    value={editForm.vehicleType}
                    onChange={(v) =>
                      setEditForm((s) => ({
                        ...s,
                        vehicleType: v,
                        busId: "",
                        busPlate: "",
                      }))
                    }
                    options={[
                      { value: "AIRCON", label: "Ceres Bus (AC)" },
                      {
                        value: "NON_AIRCON",
                        label: "Ceres Bus (Non-AC)",
                      },
                    ]}
                    placeholder="Select vehicle type"
                    listMaxHeight={300}
                  />
                </div>

                <div style={S.field}>
                  <label style={S.label}>Bus Number</label>
                  <NiceSelect
                    ariaLabel="Bus Number"
                    value={editForm.busId}
                    onChange={(v) => eupd("busId", v)}
                    options={
                      (editForm.vehicleType
                        ? BUS_CATALOG[editForm.vehicleType] || []
                        : []
                      )
                        .filter((b) =>
                          usedBusNumbers.has(String(b.number))
                            ? false
                            : true
                        )
                        .sort(byBusNumber)
                        .map((b) => ({ value: b.id, label: b.number }))

                    }
                    placeholder={
                      editForm.vehicleType
                        ? "Select bus number"
                        : "Select vehicle first"
                    }
                    disabled={!editForm.vehicleType}
                    listMaxHeight={300}
                  />
                </div>

                <div style={S.field}>
                  <label style={S.label}>Plate Number</label>
                  <input
                    style={{
                      ...S.input,
                      background: "rgba(255,255,255,0.03)",
                    }}
                    placeholder="Auto-filled"
                    value={
                      (editForm.vehicleType &&
                        editForm.busId &&
                        (BUS_CATALOG[editForm.vehicleType] || []).find(
                          (b) =>
                            String(b.id) === String(editForm.busId)
                        )?.plate) || ""
                    }
                    readOnly
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
          onMouseDown={() =>
            setConfirm({ open: false, driver: null })
          }
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
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
