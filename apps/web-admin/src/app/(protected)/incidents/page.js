// apps/web-admin/src/app/(protected)/incidents/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { listIncidents } from "@/lib/api";
import { X as XIcon } from "lucide-react";

/* small date helpers */
function todayInput() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDate(value) {
  if (!value) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

function inRange(createdAt, from, to) {
  if (!createdAt) return false;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return false;
  if (from && d < from) return false;
  if (to) {
    // make `to` inclusive (end of day)
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
}

export default function IncidentReportsPage() {
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState({ type: "", text: "" });

  const [incidents, setIncidents] = useState([]);

  const [fromDate, setFromDate] = useState(""); // yyyy-mm-dd
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const maxDate = todayInput();

  function showFlash(type, text) {
    setFlash({ type, text });
    setTimeout(() => setFlash({ type: "", text: "" }), 1600);
  }

  async function loadIncidents() {
    try {
      setLoading(true);
      const res = await listIncidents(); // you can wire this to /admin/incidents
      const items = Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res)
        ? res
        : [];
      setIncidents(items);
      setPage(1);
    } catch (err) {
      console.error("LOAD INCIDENTS ERROR:", err);
      showFlash("error", err.message || "Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
  }, []);

  // whenever filter/search changes, reset page
  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, search]);

  // clamp dates so user cannot select future
  function onFromChange(value) {
    if (value && value > maxDate) return; // ignore future
    setFromDate(value);
  }
  function onToChange(value) {
    if (value && value > maxDate) return;
    setToDate(value);
  }

  // derived filtered list
  const normalizedSearch = search.trim().toLowerCase();
  const fromObj = parseDate(fromDate);
  const toObj = parseDate(toDate);

  const filtered = useMemo(() => {
    let list = incidents;

    // date range filter (only previous + today because of max)
    if (fromObj || toObj) {
      list = list.filter((item) =>
        inRange(item.createdAt, fromObj, toObj)
      );
    }

    // search filter
    if (normalizedSearch) {
      list = list.filter((i) => {
        const target = [
          i.driverName,
          i.busNumber,
          i.status,
          i.note,
          i.reporterName,
          Array.isArray(i.categories)
            ? i.categories.map((c) => c.name || c).join(" ")
            : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return target.includes(normalizedSearch);
      });
    }

    // default sort: newest first (like reports page)
    return [...list].sort((a, b) => {
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });
  }, [incidents, normalizedSearch, fromObj, toObj]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  function resetFilters() {
    setFromDate("");
    setToDate("");
    setSearch("");
  }

  // CSV Export (current filtered view)
  function exportCsv() {
    if (!filtered.length) {
      showFlash("error", "No reports to export.");
      return;
    }
    const header = [
      "ID",
      "Driver",
      "Bus",
      "Reporter",
      "Status",
      "Created At",
      "Note",
      "Latitude",
      "Longitude",
    ];
    const rows = filtered.map((i) => [
      i.id || "",
      i.driverName || "",
      i.busNumber || "",
      i.reporterName || "",
      i.status || "",
      i.createdAt
        ? new Date(i.createdAt).toLocaleString()
        : "",
      (i.note || "").replace(/\r?\n/g, " "),
      i.lat ?? "",
      i.lng ?? "",
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const v = String(cell ?? "");
            if (v.includes(",") || v.includes('"')) {
              return `"${v.replace(/"/g, '""')}"`;
            }
            return v;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "incident-reports.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const S = styles;

  return (
    <div style={S.page}>
      {/* Header */}
      <div>
        <h1 style={S.title}>Reports</h1>
        <p style={S.sub}>Review commuter reports</p>
      </div>

      {/* Filters card */}
      <section style={S.card}>
        <div style={S.filterRow}>
          {/* From date */}
          <div style={S.filterField}>
            <div style={S.filterLabel}>From</div>
            <input
              type="date"
              max={maxDate}
              value={fromDate}
              onChange={(e) => onFromChange(e.target.value)}
              style={S.dateInput}
            />
          </div>

          {/* To date */}
          <div style={S.filterField}>
            <div style={S.filterLabel}>To</div>
            <input
              type="date"
              max={maxDate}
              value={toDate}
              onChange={(e) => onToChange(e.target.value)}
              style={S.dateInput}
            />
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={loadIncidents}
            disabled={loading}
            style={S.refreshBtn}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={resetFilters}
            style={S.resetBtn}
          >
            Reset
          </button>

          {/* Search */}
          <div style={S.searchWrapper}>
            <input
              style={S.searchInput}
              placeholder="Search incidents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Export CSV */}
          <button
            type="button"
            style={S.exportBtn}
            onClick={exportCsv}
          >
            Export CSV
          </button>
        </div>
      </section>

      {/* Reports list card */}
      <section style={S.listCard}>
        {flash.text && (
          <div
            aria-live="polite"
            role="status"
            style={S.flash(flash.type)}
          >
            {flash.text}
          </div>
        )}

        {loading && incidents.length === 0 ? (
          <div style={S.emptyWrapper}>
            <div style={S.emptyTitle}>Loading reports…</div>
          </div>
        ) : pageItems.length === 0 ? (
          <div style={S.emptyWrapper}>
            <div style={S.emptyTitle}>No reports found</div>
            <div style={S.emptySub}>Try different filters.</div>
          </div>
        ) : (
          <>
            <div style={S.list}>
              {pageItems.map((r) => (
                <article
                  key={r.id}
                  style={S.item}
                  onClick={() => setSelected(r)}
                >
                  <div style={S.itemMain}>
                    <div style={S.itemHeader}>
                      <div style={S.itemTitle}>
                        {r.driverName || "Unknown driver"}
                      </div>
                      <div style={S.itemMeta}>
                        Bus{" "}
                        <strong>
                          {r.busNumber || "—"}
                        </strong>{" "}
                        •{" "}
                        <span style={{ textTransform: "capitalize" }}>
                          {r.status
                            ? r.status.toLowerCase()
                            : "pending"}
                        </span>
                      </div>
                    </div>

                    <p style={S.itemNote}>
                      {r.note && r.note.trim().length > 0
                        ? r.note
                        : "No note provided."}
                    </p>

                    <div style={S.itemFooter}>
                      <span style={S.smallLabel}>
                        Reporter:
                      </span>{" "}
                      <span>
                        {r.reporterName || "System / anonymous"}
                      </span>
                      <span style={S.dot}>•</span>
                      <span style={S.smallLabel}>
                        Date:
                      </span>{" "}
                      <span>
                        {r.createdAt
                          ? new Date(
                              r.createdAt
                            ).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <div style={S.statusPill(r.status)}>
                    {r.status || "PENDING"}
                  </div>
                </article>
              ))}
            </div>

            {/* pagination */}
            <div style={S.paginationRow}>
              <span style={S.paginationText}>
                Showing{" "}
                {filtered.length === 0
                  ? 0
                  : `${startIndex + 1}-${Math.min(
                      startIndex + PAGE_SIZE,
                      filtered.length
                    )}`}{" "}
                of {filtered.length} reports
              </span>
              <div style={S.paginationBtns}>
                <button
                  type="button"
                  style={S.pageBtn}
                  disabled={currentPage === 1}
                  onClick={() =>
                    setPage((p) => Math.max(1, p - 1))
                  }
                >
                  Previous
                </button>
                <span style={S.paginationText}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  style={S.pageBtn}
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setPage((p) =>
                      Math.min(totalPages, p + 1)
                    )
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* DETAILS MODAL */}
      {selected && (
        <div style={S.modalBackdrop}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div style={S.modalTitle}>Report Details</div>
              <button
                type="button"
                style={S.modalClose}
                onClick={() => setSelected(null)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <div style={S.modalBody}>
              <ModalRow
                label="Driver"
                value={
                  selected.driverName || "Unknown driver"
                }
              />
              <ModalRow
                label="Bus"
                value={selected.busNumber || "—"}
              />
              <ModalRow
                label="Reporter"
                value={
                  selected.reporterName ||
                  "System / anonymous"
                }
              />
              <ModalRow
                label="Status"
                value={selected.status || "PENDING"}
              />
              <ModalRow
                label="Date"
                value={
                  selected.createdAt
                    ? new Date(
                        selected.createdAt
                      ).toLocaleString()
                    : "—"
                }
              />
              <ModalRow
                label="Location"
                value={
                  selected.lat && selected.lng
                    ? `${selected.lat.toFixed(
                        5
                      )}, ${selected.lng.toFixed(5)}`
                    : "Not available"
                }
              />
              <ModalRow
                label="Categories"
                value={
                  Array.isArray(selected.categories) &&
                  selected.categories.length > 0
                    ? selected.categories
                        .map((c) => c.name || c)
                        .join(", ")
                    : "None"
                }
              />
              <div style={{ marginTop: 10 }}>
                <div style={S.modalLabel}>Note</div>
                <div style={S.modalNoteBox}>
                  {selected.note?.trim()
                    ? selected.note
                    : "No note provided."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* small sub components */

function ModalRow({ label, value }) {
  const S = styles;
  return (
    <div style={S.modalRow}>
      <div style={S.modalLabel}>{label}:</div>
      <div style={S.modalValue}>{value ?? "—"}</div>
    </div>
  );
}

/* styles */

const styles = {
  page: { display: "grid", gap: 16 },
  title: { fontSize: 22, fontWeight: 800, margin: 0 },
  sub: { margin: "6px 0 0", color: "var(--muted)" },

  card: {
    background: "var(--card)",
    borderRadius: 16,
    border: "1px solid var(--line)",
    padding: 16,
  },

  filterRow: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(140px, 1fr)) 90px 80px minmax(180px, 1.5fr) 110px",
    gap: 10,
    alignItems: "center",
  },
  filterField: { display: "grid", gap: 4 },
  filterLabel: { fontSize: 12, color: "#6B7280", fontWeight: 600 },
  dateInput: {
    borderRadius: 8,
    border: "1px solid #D4DBE7",
    padding: "8px 10px",
    fontSize: 13,
    background: "#F9FBFF",
    color: "var(--text)",
    outline: "none",
  },
  refreshBtn: {
    marginTop: 18,
    borderRadius: 8,
    border: "1px solid #D4DBE7",
    padding: "8px 12px",
    fontSize: 13,
    background: "#FFFFFF",
    cursor: "pointer",
  },
  resetBtn: {
    marginTop: 18,
    borderRadius: 8,
    border: "1px solid #D4DBE7",
    padding: "8px 12px",
    fontSize: 13,
    background: "#FFFFFF",
    cursor: "pointer",
  },
  searchWrapper: { marginTop: 18 },
  searchInput: {
    width: "100%",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,.45)",
    padding: "8px 12px",
    fontSize: 13,
    outline: "none",
    background: "#F9FBFF",
  },
  exportBtn: {
    marginTop: 18,
    borderRadius: 8,
    border: "none",
    padding: "8px 14px",
    fontSize: 13,
    background: "#0D658B",
    color: "#F9FAFB",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  listCard: {
    background: "var(--card)",
    borderRadius: 16,
    border: "1px solid var(--line)",
    padding: 20,
    minHeight: 260,
  },

  flash: (type) => ({
    marginBottom: 8,
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 13,
    background:
      type === "error" ? "rgba(239,68,68,.08)" : "rgba(34,197,94,.08)",
    color: type === "error" ? "#b91c1c" : "#166534",
    border:
      type === "error"
        ? "1px solid rgba(248,113,113,.7)"
        : "1px solid rgba(74,222,128,.7)",
  }),
  emptyWrapper: {
    height: 240,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 13,
  },
  emptyTitle: { fontWeight: 600 },
  emptySub: { marginTop: 4 },

  list: { display: "grid", gap: 10 },
  item: {
    display: "flex",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(203,213,225,.8)",
    background: "#FFFFFF",
    cursor: "pointer",
  },
  itemMain: { display: "grid", gap: 6, flex: 1 },
  itemHeader: { display: "grid", gap: 2 },
  itemTitle: { fontWeight: 700, fontSize: 15, color: "#0F172A" },
  itemMeta: { fontSize: 13, color: "#6B7280" },
  itemNote: { margin: 0, fontSize: 13, color: "#4B5563" },
  itemFooter: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
  },
  smallLabel: { fontWeight: 600 },
  dot: { fontSize: 14, color: "#D1D5DB", margin: "0 4px" },

  statusPill: (status) => {
    const s = (status || "PENDING").toUpperCase();
    let bg = "#E5E7EB";
    let border = "#CBD5F5";
    let color = "#4B5563";
    if (s === "PENDING") {
      bg = "#FEF3C7";
      border = "#FBBF24";
      color = "#92400E";
    } else if (s === "RESOLVED") {
      bg = "#E8F9F0";
      border = "#86EFAC";
      color = "#166534";
    } else if (s === "ESCALATED") {
      bg = "#FEE2E2";
      border = "#FCA5A5";
      color = "#B91C1C";
    }
    return {
      alignSelf: "center",
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      background: bg,
      border: `1px solid ${border}`,
      color,
      whiteSpace: "nowrap",
    };
  },

  /* pagination */
  paginationRow: {
    marginTop: 14,
    paddingTop: 10,
    borderTop: "1px solid var(--line)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 13,
    color: "#6B7280",
  },
  paginationText: { fontSize: 13, color: "#6B7280" },
  paginationBtns: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  pageBtn: {
    borderRadius: 999,
    border: "1px solid #D4DBE7",
    padding: "6px 12px",
    background: "#FFFFFF",
    color: "#0F172A",
    cursor: "pointer",
    fontSize: 13,
  },

  /* modal */
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(15,23,42,.45)",
    zIndex: 40,
  },
  modal: {
    width: "min(520px, 96vw)",
    borderRadius: 16,
    border: "1px solid rgba(203,213,225,.9)",
    background: "#ffffff",
    padding: 16,
    boxShadow: "0 20px 60px rgba(15,23,42,.28)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: { fontWeight: 700, fontSize: 14 },
  modalClose: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 4,
    borderRadius: 999,
  },
  modalBody: {
    marginTop: 4,
    fontSize: 13,
    color: "#374151",
    display: "grid",
    gap: 6,
  },
  modalRow: {
    display: "flex",
    gap: 8,
    alignItems: "baseline",
  },
  modalLabel: {
    fontWeight: 600,
    fontSize: 12,
    color: "#6b7280",
    minWidth: 80,
  },
  modalValue: { fontSize: 13 },
  modalNoteBox: {
    marginTop: 4,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid rgba(209,213,219,.9)",
    background: "#f9fafb",
    fontSize: 13,
    color: "#374151",
  },
};
