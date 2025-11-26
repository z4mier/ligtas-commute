// apps/web-admin/src/app/(protected)/buses/page.js
"use client";

import { useEffect, useState } from "react";
import { listBuses, createBus, setBusStatus, authHeaders } from "@/lib/api";
import { Pencil, X as XIcon, Eye, Download } from "lucide-react";
import { Poppins } from "next/font/google";

/* ---------- FONT ---------- */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

/* ---------- API URL ---------- */
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API ||
  "http://localhost:4000";

/* ---------- ROUTES (GROUPED) ---------- */
const ROUTE_GROUPS = {
  EAST: [
    { id: "EAST_SBT_OSLOB", label: "SBT → Oslob — Oslob → SBT" },
    {
      id: "EAST_SBT_BATO_OSLOB",
      label: "SBT → Bato (via Oslob) — Bato (via Oslob) → SBT",
    },
    {
      id: "EAST_SBT_SANTANDER_LILOAN",
      label: "SBT → Santander / Lilo-an Port — Santander / Lilo-an Port → SBT",
    },
    { id: "EAST_SBT_SAMBOAN", label: "SBT → Samboan — Samboan → SBT" },
    { id: "EAST_SBT_GINATILAN", label: "SBT → Ginatilan — Ginatilan → SBT" },
    { id: "EAST_SBT_MALABUYOC", label: "SBT → Malabuyoc — Malabuyoc → SBT" },
    { id: "EAST_SBT_ALEGRIA", label: "SBT → Alegria — Alegria → SBT" },
    { id: "EAST_SBT_BADIAN", label: "SBT → Badian — Badian → SBT" },
    { id: "EAST_SBT_MOALBOAL", label: "SBT → Moalboal — Moalboal → SBT" },
  ],
  WEST: [
    {
      id: "WEST_SBT_BATO_BARILI",
      label: "SBT → Bato (via Barili) — Bato (via Barili) → SBT",
    },
    {
      id: "WEST_SBT_MOALBOAL_BARILI",
      label: "SBT → Moalboal (via Barili) — Moalboal (via Barili) → SBT",
    },
    { id: "WEST_SBT_BADIAN", label: "SBT → Badian — Badian → SBT" },
    { id: "WEST_SBT_ALEGRIA", label: "SBT → Alegria — Alegria → SBT" },
    { id: "WEST_SBT_GINATILAN", label: "SBT → Ginatilan — Ginatilan → SBT" },
    { id: "WEST_SBT_SAMBOAN", label: "SBT → Samboan — Samboan → SBT" },
    { id: "WEST_SBT_SANTANDER", label: "SBT → Santander — Santander → SBT" },
  ],
};

/* ---------- QR HELPER ---------- */
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

/* ---------- DRIVER HELPERS (assigned driver per bus) ---------- */

function getAssignedDriver(bus) {
  if (!bus) return null;

  // If backend returns a single driver object
  if (bus.assignedDriver) return bus.assignedDriver;
  if (bus.driver) return bus.driver;

  // If backend returns an array of drivers
  if (Array.isArray(bus.drivers) && bus.drivers.length > 0) {
    const active =
      bus.drivers.find(
        (d) =>
          d.onDuty ||
          d.dutyStatus === "ON_DUTY" ||
          d.status === "ON_DUTY" ||
          d.isActive
      ) || bus.drivers[0];
    return active;
  }

  return null;
}

function driverDisplayName(d) {
  if (!d) return null;
  return (
    d.fullName ||
    d.name ||
    d.driverName ||
    d.displayName ||
    d.code ||
    d.driverId ||
    "Unknown driver"
  );
}

function driverDutyLabel(d) {
  if (!d) return "—";
  const onDuty =
    d.onDuty ||
    d.dutyStatus === "ON_DUTY" ||
    d.status === "ON_DUTY" ||
    d.isOnline;
  return onDuty ? "On duty" : "Off duty";
}

/* ---------- LABEL HELPERS ---------- */

function corridorLabel(corridor) {
  if (!corridor) return "—";
  if (corridor === "EAST") return "EAST (via Oslob)";
  if (corridor === "WEST") return "WEST (via Barili)";
  return corridor;
}

function routeSideLabel(corridor) {
  if (corridor === "EAST") return "East route (via Oslob)";
  if (corridor === "WEST") return "West route (via Barili)";
  return "—";
}

/** Turn "SBT → Ginatilan" + "Ginatilan → SBT" into "SBT — Ginatilan — SBT" */
function friendlyRoute(forwardRoute, returnRoute) {
  if (!forwardRoute || !returnRoute) {
    if (forwardRoute && !returnRoute) return forwardRoute;
    if (!forwardRoute && returnRoute) return returnRoute;
    return "—";
  }

  if (forwardRoute.includes("→")) {
    const parts = forwardRoute.split("→").map((p) => p.trim());
    if (parts.length === 2) {
      const fromRaw = parts[0] || "";
      const to = parts[1] || "";
      const baseFrom = fromRaw.split("(")[0].trim();
      return `${baseFrom} — ${to} — ${baseFrom}`;
    }
  }

  return `${forwardRoute} — ${returnRoute}`;
}

export default function BusManagementPage() {
  const [tab, setTab] = useState("info");
  const [flash, setFlash] = useState({ type: "", text: "" });

  const [form, setForm] = useState({
    busType: "",
    busNumber: "",
    plateNumber: "",
    corridor: "",
    routeId: "",
    forwardRoute: "",
    returnRoute: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [buses, setBuses] = useState([]);

  // search / filter / pagination for info tab
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  // for edit modal
  const [editingBus, setEditingBus] = useState(null);
  const [editForm, setEditForm] = useState({
    busType: "",
    number: "",
    plate: "",
    corridor: "",
    routeId: "",
    forwardRoute: "",
    returnRoute: "",
    status: "",
  });

  // QR modal state
  const [qrOpen, setQrOpen] = useState(false);
  const [qrImg, setQrImg] = useState("");
  const [qrBus, setQrBus] = useState(null);

  const upd = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  /* ---------- helpers ---------- */

  function statusLabel(status) {
    if (status === "ACTIVE") return "Active";
    if (status === "IN_MAINTENANCE") return "In maintenance";
    return "Inactive";
  }

  function showFlash(type, text) {
    setFlash({ type, text });
    setTimeout(() => setFlash({ type: "", text: "" }), 1400);
  }

  function handleCorridorChange(value) {
    setForm((s) => ({
      ...s,
      corridor: value,
      routeId: "",
      forwardRoute: "",
      returnRoute: "",
    }));
  }

  function handleRouteChange(routeId) {
    const list = form.corridor ? ROUTE_GROUPS[form.corridor] || [] : [];
    const route = list.find((r) => r.id === routeId);
    if (!route) {
      setForm((s) => ({
        ...s,
        routeId: "",
        forwardRoute: "",
        returnRoute: "",
      }));
      return;
    }

    const parts = route.label.split("—").map((p) => p.trim());
    const forward = parts[0] || "";
    const back = parts[1] || "";

    setForm((s) => ({
      ...s,
      routeId,
      forwardRoute: forward,
      returnRoute: back,
    }));
  }

  /* ---------- EDIT HELPERS ---------- */

  function handleEditCorridorChange(value) {
    setEditForm((prev) => ({
      ...prev,
      corridor: value,
      routeId: "",
      forwardRoute: "",
      returnRoute: "",
    }));
  }

  function handleEditRouteChange(routeId) {
    setEditForm((prev) => {
      const corridor = prev.corridor;
      const routes = ROUTE_GROUPS[corridor] || [];
      const selected = routes.find((r) => r.id === routeId);

      if (!selected) {
        return {
          ...prev,
          routeId: "",
          forwardRoute: "",
          returnRoute: "",
        };
      }

      const parts = selected.label.split("—").map((p) => p.trim());
      const forward = parts[0] || "";
      const back = parts[1] || "";

      return {
        ...prev,
        routeId,
        forwardRoute: forward,
        returnRoute: back,
      };
    });
  }

  /* ---------- load buses from API ---------- */

  async function loadBuses() {
    try {
      setLoading(true);
      const data = await listBuses(); // GET /buses (includes drivers)
      setBuses(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (err) {
      console.error("LOAD BUSES ERROR:", err);
      showFlash("error", err.message || "Failed to load buses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBuses();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, sortOrder]);

  /* ---------- derived list ---------- */

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = buses.filter((b) => {
    if (!normalizedSearch) return true;

    const driver = getAssignedDriver(b);
    const driverNameText = driverDisplayName(driver) || "";

    const target = [
      b.number,
      b.plate,
      corridorLabel(b.corridor),
      b.forwardRoute,
      b.returnRoute,
      driverNameText,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return target.includes(normalizedSearch);
  });

  const sorted = [...filtered].sort((a, b) => {
    const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    if (sortOrder === "newest") {
      return bDate - aDate;
    } else {
      return aDate - bDate;
    }
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(startIndex, startIndex + PAGE_SIZE);

  /* ---------- QR OPENER ---------- */

  async function openQr(bus) {
    if (!bus) return;

    const payload = JSON.stringify({
      type: "bus",
      id: bus.id,
      number: bus.number,
      plate: bus.plate,
      corridor: bus.corridor,
      routeId: bus.routeId,
      forwardRoute: bus.forwardRoute,
      returnRoute: bus.returnRoute,
    });

    const url = await makeQrDataUrl(payload);
    setQrImg(url);
    setQrBus(bus);
    setQrOpen(true);
  }

  /* ---------- submit (create bus) ---------- */

  async function onSubmit(e) {
    e.preventDefault();

    if (
      !form.busType ||
      !form.busNumber ||
      !form.plateNumber ||
      !form.corridor ||
      !form.routeId
    ) {
      showFlash("error", "Please fill in all fields.");
      return;
    }

    const payload = {
      number: form.busNumber.trim(),
      plate: form.plateNumber.trim(),
      busType: form.busType,
      corridor: form.corridor,
      status: "ACTIVE",
      isActive: true,
      routeId: form.routeId,
      forwardRoute: form.forwardRoute,
      returnRoute: form.returnRoute,
    };

    try {
      setSaving(true);
      const created = await createBus(payload); // POST /buses

      setBuses((prev) => [created, ...prev]);

      setForm({
        busType: "",
        busNumber: "",
        plateNumber: "",
        corridor: "",
        routeId: "",
        forwardRoute: "",
        returnRoute: "",
      });

      showFlash("success", "Bus registered successfully.");
      setTab("info");

      await openQr(created);
    } catch (err) {
      console.error("CREATE BUS ERROR (frontend):", err);
      showFlash("error", err.message || "Failed to register bus.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------- update status only (existing helper) ---------- */

  async function updateBusStatus(id, status) {
    const updated = await setBusStatus(id, status);
    return updated;
  }

  /* ---------- update full bus details (PUT /buses/:id) ---------- */

  async function updateBusDetails(id, body) {
    const res = await fetch(`${API_URL}/buses/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Failed to update bus.");
    }

    return res.json().catch(() => ({}));
  }

  /* ---------- edit modal helpers ---------- */

  function openEditModal(bus) {
    setEditingBus(bus);
    setEditForm({
      busType: bus.busType || "",
      number: bus.number || "",
      plate: bus.plate || "",
      corridor: bus.corridor || "",
      routeId: bus.routeId || "",
      forwardRoute: bus.forwardRoute || "",
      returnRoute: bus.returnRoute || "",
      status: bus.status || "ACTIVE",
    });
  }

  function closeEditModal() {
    setEditingBus(null);
  }

  function updEdit(k, v) {
    setEditForm((prev) => ({ ...prev, [k]: v }));
  }

  async function onSaveEdit(e) {
    e.preventDefault();
    if (!editingBus) return;

    try {
      setSaving(true);

      const detailsBody = {
        busType: editForm.busType,
        number: editForm.number,
        plate: editForm.plate,
        corridor: editForm.corridor,
        routeId: editForm.routeId,
        forwardRoute: editForm.forwardRoute,
        returnRoute: editForm.returnRoute,
      };

      // 1) update main bus fields (PUT /buses/:id)
      let updatedBus = await updateBusDetails(editingBus.id, detailsBody);

      // 2) if status changed, call existing status endpoint
      if (editingBus.status !== editForm.status) {
        try {
          const statusFromApi = await updateBusStatus(
            editingBus.id,
            editForm.status
          );
          updatedBus = { ...updatedBus, ...statusFromApi };
        } catch (err) {
          console.error("UPDATE BUS STATUS ERROR:", err);
          showFlash(
            "error",
            err.message || "Bus details saved, but status update failed."
          );
        }
      }

      // 3) update local list so refresh not needed
      setBuses((prev) =>
  prev.map((b) =>
    b.id === editingBus.id
      // merge result from API into existing bus object
      ? { ...b, ...updatedBus }
      : b
  )
);

      showFlash("success", "Bus details updated.");
      closeEditModal();
    } catch (err) {
      console.error("UPDATE BUS DETAILS ERROR:", err);
      showFlash("error", err.message || "Failed to update bus.");
    } finally {
      setSaving(false);
    }
  }

  const S = styles;
  const availableRoutes =
    form.corridor && ROUTE_GROUPS[form.corridor]
      ? ROUTE_GROUPS[form.corridor]
      : [];

  return (
    <div className={poppins.className} style={S.page}>
      {/* header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
          Bus Management
        </h1>
        <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 14 }}>
          View bus details and register new units.
        </p>
      </div>

      {/* tabs */}
      <div style={S.tabs}>
        <div style={S.tabBtn(tab === "info")} onClick={() => setTab("info")}>
          Informations
        </div>
        <div
          style={S.tabBtn(tab === "register")}
          onClick={() => setTab("register")}
        >
          Register Bus
        </div>
      </div>

      {/* flash */}
      {flash.text && (
        <div aria-live="polite" role="status" style={S.flash(flash.type)}>
          {flash.text}
        </div>
      )}

      {/* REGISTER TAB */}
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
            <span>+ Register New Bus</span>
          </div>

          <form
            onSubmit={onSubmit}
            style={{ display: "grid", gap: 12 }}
            noValidate
          >
            <div style={S.grid3}>
              {/* Bus Type */}
              <div style={S.field}>
                <label style={S.label}>Bus Type</label>
                <select
                  style={S.input}
                  value={form.busType}
                  onChange={(e) => upd("busType", e.target.value)}
                  required
                >
                  <option value="">Select bus type</option>
                  <option value="AIRCON">AIRCON</option>
                  <option value="NON_AIRCON">NON_AIRCON</option>
                </select>
              </div>

              {/* Bus Number */}
              <div style={S.field}>
                <label style={S.label}>Bus Number</label>
                <input
                  style={S.input}
                  placeholder="e.g. 3000"
                  value={form.busNumber}
                  onChange={(e) => upd("busNumber", e.target.value)}
                  required
                />
              </div>

              {/* Plate Number */}
              <div style={S.field}>
                <label style={S.label}>Plate Number</label>
                <input
                  style={S.input}
                  placeholder="e.g. ABC 1234"
                  value={form.plateNumber}
                  onChange={(e) => upd("plateNumber", e.target.value)}
                  required
                />
              </div>

              {/* Corridor */}
              <div style={S.field}>
                <label style={S.label}>Corridor</label>
                <select
                  style={S.input}
                  value={form.corridor}
                  onChange={(e) => handleCorridorChange(e.target.value)}
                  required
                >
                  <option value="">Select corridor</option>
                  <option value="EAST">EAST (via Oslob)</option>
                  <option value="WEST">WEST (via Barili)</option>
                </select>
              </div>

              {/* Forward Route */}
              <div style={S.field}>
                <label style={S.label}>Forward Route</label>
                <select
                  style={S.input}
                  value={form.routeId}
                  onChange={(e) => handleRouteChange(e.target.value)}
                  disabled={!form.corridor}
                  required
                >
                  <option value="">
                    {form.corridor
                      ? "Select forward route"
                      : "Select corridor first"}
                  </option>
                  {availableRoutes.map((r) => {
                    const [forward] = r.label.split("—");
                    return (
                      <option key={r.id} value={r.id}>
                        {forward.trim()}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Return Route (auto-filled) */}
              <div style={S.field}>
                <label style={S.label}>Return Route</label>
                <input
                  style={{ ...S.input, background: "#F3F4F6" }}
                  value={form.returnRoute}
                  readOnly
                  placeholder="Auto-filled after selecting forward route"
                />
              </div>
            </div>

            <button type="submit" style={S.btn} disabled={saving}>
              {saving ? "Saving..." : "Register Bus"}
            </button>
          </form>
        </section>
      ) : (
        /* INFO TAB */
        <section style={S.card}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 18,
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Bus Informations</span>
          </div>

          {/* search + sort */}
          <div style={S.toolbar}>
            <div style={S.searchWrapper}>
              <input
                style={S.searchInput}
                placeholder="Search by bus number, plate, corridor, route, driver…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={S.toolbarRight}>
              <select
                style={S.sortSelect}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="newest">Newest to oldest</option>
                <option value="oldest">Oldest to newest</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p style={S.muted}>Loading buses…</p>
          ) : pageItems.length === 0 ? (
            <p style={S.muted}>No buses found.</p>
          ) : (
            <>
              <div style={S.busList}>
                {pageItems.map((b) => {
                  const driver = getAssignedDriver(b);
                  return (
                    <div key={b.id} style={S.busCard}>
                      {/* HEADER */}
                      <div style={S.busHeader}>
                        <div style={S.busTitleRow}>
                          <span style={S.busTitle}>Bus {b.number}</span>
                          <span style={S.statusPill(b.status)}>
                            {statusLabel(b.status)}
                          </span>
                        </div>
                      </div>

                      {/* BODY */}
                      <div style={S.infoGrid}>
                        <div>
                          <div style={S.sectionHeader}>BUS INFORMATION</div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Vehicle</span>
                            <span style={S.infoValue}>
                              {b.busType || "—"}
                            </span>
                          </div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Bus number</span>
                            <span style={S.infoValue}>
                              {b.number || "—"}
                            </span>
                          </div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Plate number</span>
                            <span style={S.infoValue}>
                              {b.plate || "—"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div style={S.sectionHeader}>BUS & ROUTE</div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Route side</span>
                            <span style={S.infoValue}>
                              {routeSideLabel(b.corridor)}
                            </span>
                          </div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Route</span>
                            <span style={S.infoValue}>
                              {friendlyRoute(b.forwardRoute, b.returnRoute)}
                            </span>
                          </div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Assigned driver</span>
                            <span style={S.infoValue}>
                              {driverDisplayName(driver) || "Unassigned"}
                            </span>
                          </div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Driver duty</span>
                            <span style={S.infoValue}>
                              {driverDutyLabel(driver)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* FOOTER */}
                      <div style={S.busFooter}>
                        <button
                          type="button"
                          style={S.editBtn}
                          onClick={() => openEditModal(b)}
                        >
                          <Pencil size={14} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          style={S.qrBtn}
                          onClick={() => openQr(b)}
                        >
                          <Eye size={14} />
                          <span>View QR</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div style={S.paginationBottom}>
                <button
                  type="button"
                  style={S.pageCircleBtn}
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹
                </button>
                <span style={S.paginationLabel}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  style={S.pageCircleBtn}
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  ›
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* ---------- EDIT MODAL ---------- */}
      {editingBus && (
        <div style={S.modalBackdrop}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Edit Bus</div>
              <button
                type="button"
                onClick={closeEditModal}
                style={S.modalCloseBtn}
              >
                <XIcon size={18} />
              </button>
            </div>

            <form
              onSubmit={onSaveEdit}
              style={{ display: "grid", gap: 14, marginTop: 10 }}
            >
              <div style={S.grid2}>
                {/* Bus Type */}
                <div style={S.field}>
                  <label style={S.label}>Bus Type</label>
                  <select
                    style={S.input}
                    value={editForm.busType}
                    onChange={(e) => updEdit("busType", e.target.value)}
                  >
                    <option value="AIRCON">AIRCON</option>
                    <option value="NON_AIRCON">NON_AIRCON</option>
                  </select>
                </div>

                {/* Bus Number */}
                <div style={S.field}>
                  <label style={S.label}>Bus Number</label>
                  <input
                    style={S.input}
                    value={editForm.number}
                    onChange={(e) => updEdit("number", e.target.value)}
                  />
                </div>

                {/* Plate Number */}
                <div style={S.field}>
                  <label style={S.label}>Plate Number</label>
                  <input
                    style={S.input}
                    value={editForm.plate}
                    onChange={(e) => updEdit("plate", e.target.value)}
                  />
                </div>

                {/* Status */}
                <div style={S.field}>
                  <label style={S.label}>Status</label>
                  <select
                    style={S.input}
                    value={editForm.status}
                    onChange={(e) => updEdit("status", e.target.value)}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="IN_MAINTENANCE">In maintenance</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                {/* Corridor */}
                <div style={S.field}>
                  <label style={S.label}>Corridor</label>
                  <select
                    style={S.input}
                    value={editForm.corridor || ""}
                    onChange={(e) => handleEditCorridorChange(e.target.value)}
                  >
                    <option value="">Select corridor</option>
                    <option value="EAST">EAST (via Oslob)</option>
                    <option value="WEST">WEST (via Barili)</option>
                  </select>
                </div>

                {/* Forward Route */}
                <div style={S.field}>
                  <label style={S.label}>Forward Route</label>
                  <select
                    style={S.input}
                    value={editForm.routeId || ""}
                    onChange={(e) => handleEditRouteChange(e.target.value)}
                    disabled={!editForm.corridor}
                  >
                    <option value="">
                      {editForm.corridor
                        ? "Select forward route"
                        : "Select corridor first"}
                    </option>
                    {(ROUTE_GROUPS[editForm.corridor] || []).map((r) => {
                      const [forward] = r.label.split("—");
                      return (
                        <option key={r.id} value={r.id}>
                          {forward.trim()}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Return Route (auto-filled) */}
                <div style={S.field}>
                  <label style={S.label}>Return Route</label>
                  <input
                    style={{ ...S.input, background: "#F3F4F6" }}
                    value={editForm.returnRoute || ""}
                    readOnly
                  />
                </div>
              </div>

              <div style={S.modalActions}>
                <button
                  type="button"
                  onClick={closeEditModal}
                  style={S.modalCancel}
                >
                  Cancel
                </button>
                <button type="submit" style={S.modalSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- QR MODAL ---------- */}
      {qrOpen && qrBus && (
        <div style={S.modalBackdrop} onMouseDown={() => setQrOpen(false)}>
          <div
            style={{ ...S.modal, maxWidth: 520 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={S.modalHeader}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Bus QR Code</div>
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                style={S.modalCloseBtn}
              >
                <XIcon size={18} />
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
                alt="Bus QR"
                style={{
                  width: 240,
                  height: 240,
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                }}
              />
              <div style={{ fontSize: 14, color: "#4B5563" }}>
                Bus {qrBus.number} • Plate {qrBus.plate}
              </div>
              <a
                href={qrImg}
                download={`BUS-${qrBus.number || "qr"}.png`}
                style={{
                  ...S.btn,
                  width: "auto",
                  padding: "10px 16px",
                  textDecoration: "none",
                  textAlign: "center",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Download size={16} /> Download QR
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- LIGHT THEME STYLES ---------- */

const styles = {
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
  },
  tabBtn: (active) => ({
    padding: "10px 0",
    borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
    fontWeight: 600,
    fontSize: 14,
    color: active ? "var(--accent)" : "var(--muted)",
    cursor: "pointer",
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
  grid3: { display: "grid", gap: 12, gridTemplateColumns: "repeat(3,1fr)" },
  grid2: { display: "grid", gap: 12, gridTemplateColumns: "repeat(2,1fr)" },
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
  },
  muted: { color: "#6B7280", fontSize: 14 },
  flash: (type) => ({
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 14,
    color: type === "error" ? "#B91C1C" : "#166534",
    background: type === "error" ? "#FEE2E2" : "#DCFCE7",
    border: type === "error" ? "1px solid #FCA5A5" : "1px solid #86EFAC",
  }),

  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  searchWrapper: {
    flex: 1,
    minWidth: 260,
  },
  searchInput: {
    width: "100%",
    borderRadius: 999,
    border: "1px solid #9CA3AF",
    padding: "10px 14px",
    fontSize: 14,
    background: "#F9FBFF",
    color: "var(--text)",
    outline: "none",
  },
  toolbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  sortSelect: {
    borderRadius: 999,
    border: "1px solid #9CA3AF",
    padding: "8px 12px",
    fontSize: 13,
    background: "#FFFFFF",
    color: "var(--text)",
    outline: "none",
  },

  busList: {
    display: "grid",
    gap: 10,
    marginTop: 10,
  },

  busCard: {
    border: "1px solid #E2E8F0",
    borderRadius: 24,
    padding: 20,
    background: "#FFFFFF",
    boxShadow: "0 18px 40px rgba(15,23,42,0.05)",
  },
  busHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  busTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  busTitle: { fontWeight: 800, fontSize: 16, color: "#0D658B" },

  infoGrid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 40,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.08,
    textTransform: "uppercase",
    color: "#9CA3AF",
    marginBottom: 6,
  },
  infoRow: {
    display: "flex",
    gap: 16,
    fontSize: 13,
    marginTop: 4,
  },
  infoLabel: {
    width: 110,
    color: "#6B7280",
  },
  infoValue: {
    color: "#111827",
    fontWeight: 500,
  },

  busFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
    flexWrap: "wrap",
  },
  statusPill: (status) => {
    const isActive = status === "ACTIVE";
    const isMaint = status === "IN_MAINTENANCE";
    let bg, border, color;
    if (isActive) {
      bg = "#E8F9F0";
      border = "1px solid #86EFAC";
      color = "#166534";
    } else if (isMaint) {
      bg = "#FEF3C7";
      border = "1px solid #FBBF24";
      color = "#92400E";
    } else {
      bg = "#E5E7EB";
      border = "1px solid #CBD5F5";
      color = "#4B5563";
    }
    return {
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      background: bg,
      color,
      border,
      fontWeight: 600,
    };
  },
  editBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #CBD5F5",
    background: "#FFFFFF",
    color: "#0F172A",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 500,
  },
  qrBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #0D658B",
    background: "#EFF6FF",
    color: "#0D658B",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 500,
  },

  paginationBottom: {
    marginTop: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 14,
  },
  paginationLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: 500,
  },
  pageCircleBtn: {
    width: 30,
    height: 30,
    borderRadius: "999px",
    border: "1px solid #E5E7EB",
    background: "#FFFFFF",
    color: "#4B5563",
    cursor: "pointer",
    fontSize: 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
  },
  modal: {
    width: "min(900px, 96vw)",
    background: "var(--card)",
    borderRadius: 20,
    padding: 20,
    border: "1px solid " + "var(--line)",
    boxShadow: "0 24px 60px rgba(15,23,42,0.18)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalCloseBtn: {
    border: "1px solid #D4DBE7",
    background: "#FFFFFF",
    color: "#0F172A",
    cursor: "pointer",
    padding: 4,
    borderRadius: 999,
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  modalCancel: {
    borderRadius: 999,
    padding: "8px 16px",
    border: "1px solid #D4DBE7",
    background: "#FFFFFF",
    color: "#0F172A",
    cursor: "pointer",
    fontSize: 13,
  },
  modalSave: {
    borderRadius: 999,
    padding: "8px 18px",
    border: "none",
    background: "#0D658B",
    color: "#F9FAFB",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
};
