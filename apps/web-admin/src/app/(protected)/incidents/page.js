// apps/web-admin/src/app/(protected)/incidents/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { listIncidents, authHeaders } from "@/lib/api";
import { X as XIcon, Pencil } from "lucide-react";
import { Poppins } from "next/font/google";

/* ---------- FONT ---------- */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API ||
  "http://localhost:4000";

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

  const [statusDraft, setStatusDraft] = useState("PENDING");
  const [savingStatus, setSavingStatus] = useState(false);

  const maxDate = todayInput();

  function showFlash(type, text) {
    setFlash({ type, text });
    setTimeout(() => setFlash({ type: "", text: "" }), 1600);
  }

  async function loadIncidents() {
    try {
      setLoading(true);
      const res = await listIncidents(); // wire to /admin/incidents or fallback
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

  // whenever selected changes, sync statusDraft
  useEffect(() => {
    if (selected) {
      setStatusDraft((selected.status || "PENDING").toUpperCase());
    }
  }, [selected]);

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

    // date range filter
    if (fromObj || toObj) {
      list = list.filter((item) => inRange(item.createdAt, fromObj, toObj));
    }

    // search filter
    if (normalizedSearch) {
      list = list.filter((i) => {
        const categoriesText = Array.isArray(i.categories)
          ? i.categories
              .map((c) => (c && (c.name || c)) || "")
              .filter(Boolean)
              .join(" ")
          : "";

        const target = [
          i.driverName,
          i.busNumber,
          i.status,
          i.note,
          i.reporterName,
          categoriesText,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return target.includes(normalizedSearch);
      });
    }

    // default sort: newest first
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

  // Export as CSV (clean for Excel)
  function exportExcel() {
    if (!filtered.length) {
      showFlash("error", "No reports to export.");
      return;
    }

    const header = [
      "Report ID",
      "Driver",
      "Bus Number",
      "Reporter",
      "Status",
      "Categories",
      "Created At",
      "Note",
    ];

    const rows = filtered.map((i) => {
      const categoriesText =
        Array.isArray(i.categories) && i.categories.length > 0
          ? i.categories
              .map((c) => (c && (c.name || c)) || "")
              .filter(Boolean)
              .join(" / ")
          : "";

      return [
        i.id || "",
        i.driverName || "",
        i.busNumber || "",
        i.reporterName || "",
        i.status || "",
        categoriesText,
        i.createdAt ? new Date(i.createdAt).toLocaleString() : "",
        (i.note || "").replace(/\r?\n/g, " "),
      ];
    });

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const v = String(cell ?? "");
            if (v.includes(",") || v.includes('"') || v.includes("\n")) {
              return `"${v.replace(/"/g, '""')}"`;
            }
            return v;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "incident-reports.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 🔧 HANDLE STATUS (called from modal "Update status" button)
  async function handleStatusChange(nextStatus) {
    if (!selected) return;

    const newStatus = (nextStatus || "").toUpperCase();
    const prevStatus = (selected.status || "PENDING").toUpperCase();

    // if walay actual change, close modal nalang
    if (!newStatus || newStatus === prevStatus) {
      setSelected(null);
      return;
    }

    try {
      setSavingStatus(true);

      const id = encodeURIComponent(selected.id);
      const body = JSON.stringify({ status: newStatus });
      const headers = {
        "Content-Type": "application/json",
        ...(await authHeaders()),
      };

      // try /:id/status first
      let res = await fetch(`${API_URL}/admin/incidents/${id}/status`, {
        method: "PATCH",
        headers,
        body,
      });

      // if 404, try plain /:id (maybe mao ni imo route)
      if (res.status === 404) {
        console.warn(
          "[incidents] /:id/status returned 404, trying /:id instead"
        );
        res = await fetch(`${API_URL}/admin/incidents/${id}`, {
          method: "PATCH",
          headers,
          body,
        });
      }

      const text = await res.text();
      if (!res.ok) {
        console.warn(
          "UPDATE INCIDENT STATUS ERROR:",
          res.status,
          text || "no body"
        );
        throw new Error(`Failed to update status (code ${res.status})`);
      }

      let payload = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = null;
      }

      const updated =
        (payload && (payload.incident || payload)) || {
          ...selected,
          status: newStatus,
        };

      // update list
      setIncidents((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );

      // flash + close modal
      showFlash("success", "Status updated.");
      setSelected(null);
    } catch (err) {
      console.warn("UPDATE INCIDENT STATUS ERROR (catch):", err?.message || err);
      showFlash("error", err?.message || "Failed to update status.");
      // balik sa previous value sa dropdown
      setStatusDraft(prevStatus);
    } finally {
      setSavingStatus(false);
    }
  }

  const S = styles;

  return (
    <div className={poppins.className} style={S.page}>
      {/* Header */}
      <div>
        <h1 style={S.title}>Reports</h1>
        <p style={S.sub}>Review commuter reports.</p>
      </div>

      {/* Filters card */}
      <section style={S.card}>
        <div style={S.filterRow}>
          {/* Search FIRST */}
          <div style={S.searchWrapper}>
            <input
              style={S.searchInput}
              placeholder="Search incidents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

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

          {/* Reset */}
          <button type="button" onClick={resetFilters} style={S.resetBtn}>
            Reset
          </button>

          {/* Export CSV */}
          <button type="button" style={S.exportBtn} onClick={exportExcel}>
            Export CSV
          </button>
        </div>
      </section>

      {/* Reports list card */}
      <section style={S.listCard}>
        {flash.text && (
          <div aria-live="polite" role="status" style={S.flash(flash.type)}>
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
              {pageItems.map((r) => {
                const categoriesText =
                  Array.isArray(r.categories) && r.categories.length > 0
                    ? r.categories
                        .map((c) => (c && (c.name || c)) || "")
                        .filter(Boolean)
                        .join(" / ")
                    : "";

                return (
                  <article key={r.id} style={S.item}>
                    <div style={S.itemMain}>
                      {/* header row similar to bus title + status */}
                      <div style={S.itemHeaderRow}>
                        <div style={S.itemTitleRow}>
                          <span style={S.itemTitle}>
                            {r.driverName || "Unknown driver"}
                          </span>
                        </div>
                        <div style={S.statusPill(r.status)}>
                          {r.status || "PENDING"}
                        </div>
                      </div>

                      {/* info grid similar to bus card */}
                      <div style={S.infoGrid}>
                        <div>
                          <div style={S.sectionHeader}>REPORT INFORMATION</div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Driver</span>
                            <span style={S.infoValue}>
                              {r.driverName || "Unknown driver"}
                            </span>
                          </div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Bus number</span>
                            <span style={S.infoValue}>
                              {r.busNumber || "—"}
                            </span>
                          </div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Reporter</span>
                            <span style={S.infoValue}>
                              {r.reporterName || "—"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div style={S.sectionHeader}>DETAILS</div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Filed at</span>
                            <span style={S.infoValue}>
                              {r.createdAt
                                ? new Date(r.createdAt).toLocaleString()
                                : "—"}
                            </span>
                          </div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Categories</span>
                            <span style={S.infoValue}>
                              {categoriesText || "None"}
                            </span>
                          </div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Summary</span>
                            <span style={S.infoValue}>
                              {r.note && r.note.trim().length > 0
                                ? r.note
                                : "No note provided."}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* footer: explicit Edit button, info not clickable */}
                    <div style={S.cardFooter}>
                      <button
                        type="button"
                        style={S.editBtn}
                        onClick={() => setSelected(r)}
                      >
                        <Pencil size={14} />
                        <span>Edit</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* bottom-right pagination with arrows */}
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
                value={selected.driverName || "Unknown driver"}
              />
              <ModalRow label="Bus" value={selected.busNumber || "—"} />
              <ModalRow
                label="Reporter"
                value={selected.reporterName || "—"}
              />

              {/* Status dropdown – clean, minimal, saved via button */}
              <div style={S.modalRow}>
                <div style={S.modalLabel}>Status:</div>
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value)}
                  disabled={savingStatus}
                  style={S.statusSelect}
                >
                  <option value="PENDING">Pending</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>

              <ModalRow
                label="Date"
                value={
                  selected.createdAt
                    ? new Date(selected.createdAt).toLocaleString()
                    : "—"
                }
              />

              <ModalRow
                label="Categories"
                value={
                  Array.isArray(selected.categories) &&
                  selected.categories.length > 0
                    ? selected.categories
                        .map((c) => (c && (c.name || c)) || "")
                        .filter(Boolean)
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

              <div style={S.modalActions}>
                <button
                  type="button"
                  style={S.modalCancel}
                  onClick={() => setSelected(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  style={S.modalSave}
                  onClick={() => handleStatusChange(statusDraft)}
                  disabled={savingStatus}
                >
                  {savingStatus ? "Updating…" : "Update status"}
                </button>
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
  page: {
    display: "grid",
    gap: 16,
    maxWidth: 1120,
    margin: "0 auto",
    padding: "0 16px 24px",
  },
  title: { fontSize: 22, fontWeight: 800, margin: 0 },
  sub: { margin: "6px 0 0", color: "var(--muted)" },
  card: {
    background: "var(--card)",
    borderRadius: 16,
    border: "1px solid #9CA3AF",
    padding: 16,
  },
  filterRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr auto auto",
    gap: 10,
    alignItems: "end",
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
  searchWrapper: {
    width: "100%",
  },
  searchInput: {
    width: "100%",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,.45)",
    padding: "8px 12px",
    fontSize: 13,
    outline: "none",
    background: "#F9FBFF",
  },
  resetBtn: {
    borderRadius: 999,
    border: "1px solid #D4DBE7",
    padding: "8px 16px",
    fontSize: 13,
    background: "#FFFFFF",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  exportBtn: {
    borderRadius: 999,
    border: "1px solid #0D658B",
    padding: "8px 18px",
    fontSize: 13,
    background: "#FFFFFF",
    color: "#0D658B",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },

  listCard: {
    background: "var(--card)",
    borderRadius: 24,
    border: "1px solid var(--line)",
    padding: 20,
    minHeight: 260,
    boxShadow: "0 20px 45px rgba(15,23,42,0.06)",
  },

  flash: (type) => ({
    marginBottom: 8,
    padding: "8px 12px",
    borderRadius: 10,
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

  // scrollable list of cards
  list: {
    display: "grid",
    gap: 10,
    maxHeight: 360,
    overflowY: "auto",
    paddingRight: 4,
  },

  item: {
    border: "1px solid #E2E8F0",
    borderRadius: 24,
    padding: 20,
    background: "#FFFFFF",
    boxShadow: "0 18px 40px rgba(15,23,42,0.05)",
  },
  itemMain: { display: "grid", gap: 10 },
  itemHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  itemTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  itemTitle: { fontWeight: 800, fontSize: 16, color: "#0D658B" },

  infoGrid: {
    marginTop: 6,
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

  cardFooter: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 14,
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
    }
    return {
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

  // pagination bottom-right with arrows
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
  modalActions: {
    marginTop: 14,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
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

  statusSelect: {
    borderRadius: 8,
    border: "1px solid #D4DBE7",
    padding: "6px 10px",
    fontSize: 13,
    background: "#FFFFFF",
    color: "#111827",
    outline: "none",
  },
};
