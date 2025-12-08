"use client";

import { useEffect, useState } from "react";
import { Poppins } from "next/font/google";
import { listTrips } from "@/lib/api";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

function formatDate(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatTimeRange(start, end) {
  if (!start) return "—";
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  if (Number.isNaN(s.getTime())) return "—";
  const opts = { hour: "2-digit", minute: "2-digit" };
  const startStr = s.toLocaleTimeString(undefined, opts);
  if (!e || Number.isNaN(e.getTime())) return `${startStr} – Ongoing`;
  const endStr = e.toLocaleTimeString(undefined, opts);
  return `${startStr} – ${endStr}`;
}

function formatDuration(start, end) {
  if (!start || !end) return "—";
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "—";
  const diffMs = e.getTime() - s.getTime();
  if (diffMs <= 0) return "—";
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 60) return `${diffMinutes} mins`;
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (mins === 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
  return `${hours}h ${mins}m`;
}

function formatStatus(status) {
  if (!status) return "—";
  const up = String(status).toUpperCase();
  if (up === "ONGOING") return "Ongoing";
  if (up === "COMPLETED") return "Completed";
  if (up === "CANCELLED") return "Cancelled";
  return up.charAt(0) + up.slice(1).toLowerCase();
}

function statusStyles(status) {
  const up = String(status || "").toUpperCase();
  if (up === "COMPLETED") {
    return {
      background: "rgba(16, 185, 129, 0.08)",
      color: "#047857",
      borderColor: "rgba(16, 185, 129, 0.45)",
    };
  }
  if (up === "ONGOING") {
    return {
      background: "rgba(59, 130, 246, 0.08)",
      color: "#1D4ED8",
      borderColor: "rgba(59, 130, 246, 0.45)",
    };
  }
  if (up === "CANCELLED") {
    return {
      background: "rgba(239, 68, 68, 0.08)",
      color: "#B91C1C",
      borderColor: "rgba(239, 68, 68, 0.4)",
    };
  }
  return null;
}

const PAGE_SIZE = 10;

export default function TripHistoryPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setErrorMsg("");
        const data = await listTrips();
        if (!cancelled) {
          const items = Array.isArray(data) ? data : data?.items || [];
          setTrips(items);
          setPage(1);
        }
      } catch (err) {
        console.error("LOAD TRIPS ERROR:", err);
        if (!cancelled) {
          setErrorMsg(err?.message || "Failed to load trip history.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, sortOrder]);

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = trips.filter((trip) => {
    if (!normalizedSearch) return true;
    const driverLabel =
      trip.driverName || trip.driverProfile?.fullName || "Unknown driver";
    const busLabel = trip.busNumber || trip.bus?.number || "";
    const plateLabel = trip.busPlate || trip.bus?.plate || "";
    const startingPoint = trip.originLabel || "";
    const destination = trip.destLabel || "";
    const statusLabel = formatStatus(trip.status);
    const target = [
      driverLabel,
      busLabel,
      plateLabel,
      startingPoint,
      destination,
      statusLabel,
      formatDate(trip.startedAt),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return target.includes(normalizedSearch);
  });

  const sorted = [...filtered].sort((a, b) => {
    const aDate = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const bDate = b.startedAt ? new Date(b.startedAt).getTime() : 0;
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

  return (
    <main className={poppins.className} style={S.page}>
      <div style={S.headerRow}>
        <div>
          <h1 style={S.title}>Trip History</h1>
          <p style={S.subtitle}>
            Overview of completed and ongoing trips across all drivers.
          </p>
        </div>
      </div>

      <section style={S.card}>
        {loading ? (
          <div style={S.loadingWrap}>
            <div style={S.spinner} />
            <span style={S.loadingText}>Loading trips…</span>
          </div>
        ) : errorMsg ? (
          <div style={S.errorBox}>{errorMsg}</div>
        ) : sorted.length === 0 ? (
          <div style={S.emptyState}>
            <p style={S.emptyTitle}>No trips found</p>
            <p style={S.emptyText}>
              Trips will appear here once commuters start and finish their rides.
            </p>
          </div>
        ) : (
          <>
            <div style={S.toolbar}>
              <div style={S.searchWrapper}>
                <input
                  style={S.searchInput}
                  placeholder="Search by driver, bus, plate, starting point, destination, status…"
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

            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Driver</th>
                    <th style={S.th}>Bus</th>
                    <th style={S.th}>Starting point</th>
                    <th style={S.th}>Destination</th>
                    <th style={S.th}>Time</th>
                    <th style={S.th}>Duration</th>
                    <th style={S.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((trip) => {
                    const {
                      id,
                      startedAt,
                      endedAt,
                      status,
                      driverName,
                      driverProfile,
                      busNumber,
                      busPlate,
                      bus,
                      originLabel,
                      destLabel,
                    } = trip;

                    const driverLabel =
                      driverName ||
                      driverProfile?.fullName ||
                      "Unknown driver";

                    const busLabel = busNumber || bus?.number || "—";
                    const plateLabel = busPlate || bus?.plate || "";
                    const startingPoint = originLabel || "—";
                    const destination = destLabel || "—";

                    return (
                      <tr key={id}>
                        <td style={S.td}>{formatDate(startedAt)}</td>
                        <td style={S.td}>{driverLabel}</td>
                        <td style={S.td}>
                          {busLabel}
                          {plateLabel ? (
                            <span style={S.subMuted}> · {plateLabel}</span>
                          ) : null}
                        </td>
                        <td style={S.td}>{startingPoint}</td>
                        <td style={S.td}>{destination}</td>
                        <td style={S.td}>
                          {formatTimeRange(startedAt, endedAt)}
                        </td>
                        <td style={S.td}>
                          {formatDuration(startedAt, endedAt)}
                        </td>
                        <td style={S.td}>
                          <span
                            style={{
                              ...S.statusBadge,
                              ...(statusStyles(status) || {}),
                            }}
                          >
                            {formatStatus(status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
              >
                ›
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

const S = {
  page: {
    padding: "20px 24px 32px",
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, #eff6ff 0, #f9fafb 40%, #ffffff 100%)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: 0.1,
    color: "#0F172A",
    margin: 0,
  },
  subtitle: {
    margin: 0,
    marginTop: 2,
    fontSize: 13,
    color: "#6B7280",
  },
  card: {
    marginTop: 8,
    background: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    border: "1px solid rgba(226,232,240,0.9)",
    boxShadow:
      "0 18px 45px rgba(15,23,42,0.06), 0 1px 0 rgba(148,163,184,0.3)",
    padding: 16,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
    marginBottom: 10,
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
    color: "#111827",
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
    color: "#111827",
    outline: "none",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    fontWeight: 600,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.04,
    color: "#6B7280",
    borderBottom: "1px solid #E5E7EB",
    background:
      "linear-gradient(180deg, rgba(248,250,252,0.9), rgba(241,245,249,0.9))",
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  td: {
    padding: "9px 12px",
    borderBottom: "1px solid #E5E7EB",
    color: "#111827",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  subMuted: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "3px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 500,
    border: "1px solid transparent",
    background: "rgba(148,163,184,0.1)",
    color: "#4B5563",
  },
  loadingWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "16px 8px",
  },
  spinner: {
    width: 16,
    height: 16,
    borderRadius: 999,
    border: "2px solid rgba(148,163,184,0.4)",
    borderTopColor: "#0D658B",
    animation: "spin 0.7s linear infinite",
  },
  loadingText: {
    fontSize: 13,
    color: "#4B5563",
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    border: "1px solid rgba(248,113,113,0.5)",
    background: "rgba(254,242,242,0.9)",
    color: "#991B1B",
    fontSize: 13,
  },
  emptyState: {
    padding: "24px 8px",
    textAlign: "center",
  },
  emptyTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: "#111827",
  },
  emptyText: {
    margin: 0,
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
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
};
