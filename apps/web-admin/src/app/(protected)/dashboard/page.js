// apps/web-admin/src/app/(protected)/dashboard/page.js
"use client";

import { useEffect, useState } from "react";
import { listIotEmergencies, resolveEmergency } from "@/lib/api";
import { Poppins } from "next/font/google";

/* ---------- FONT ---------- */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

/* ---------- small helpers ---------- */
function timeAgo(dateString) {
  if (!dateString) return "—";
  const created = new Date(dateString);
  if (Number.isNaN(created.getTime())) return "—";

  const diffMs = Date.now() - created.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin === 1) return "1 min ago";
  if (diffMin < 60) return `${diffMin} mins ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "1 hour ago";
  if (diffHr < 24) return `${diffHr} hrs ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "1 day ago";
  return `${diffDay} days ago`;
}

function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

/* code (YELLOW / ORANGE / RED) -> severity label */
function mapSeverityFromCode(codeRaw) {
  const c = (codeRaw || "").toString().toUpperCase();
  if (c === "RED" || c === "CODE_RED") return "CRITICAL";
  if (c === "ORANGE") return "HIGH";
  if (c === "YELLOW") return "MEDIUM";
  return "UNKNOWN";
}

/* ---------- main component ---------- */
export default function EmergencyDashboardPage() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [flash, setFlash] = useState({ type: "", text: "" });

  const S = styles;

  function showFlash(type, text) {
    setFlash({ type, text });
    setTimeout(() => setFlash({ type: "", text: "" }), 1400);
  }

  async function loadEmergencies() {
    try {
      setLoading(true);

      // ✅ Get IoT emergencies from /iot/emergencies (via lib/api)
      const data = await listIotEmergencies({});

      // support both: array or { items: [...] } or { ok, items }
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.incidents)
        ? data.incidents
        : [];

      // PENDING (and similar) = active IoT emergency
      const active = arr.filter((e) => {
        const st = (e.status || "").toString().toUpperCase();
        return (
          st === "PENDING" ||
          st === "ACTIVE" ||
          st === "OPEN" ||
          st === "ONGOING"
        );
      });

      setEmergencies(active);
    } catch (err) {
      console.error("LOAD EMERGENCIES ERROR:", err);
      showFlash("error", err?.message || "Failed to load emergencies.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmergencies();
  }, []);

  async function handleResolve(incident) {
    const id = incident?.id ?? incident?.incidentId;
    if (!id) return;

    try {
      setResolvingId(id);
      await resolveEmergency(id);
      setEmergencies((prev) =>
        prev.filter((e) => (e.id ?? e.incidentId) !== id)
      );
      showFlash("success", "Incident marked as resolved.");
    } catch (err) {
      console.error("RESOLVE EMERGENCY ERROR:", err);
      showFlash("error", err?.message || "Failed to resolve incident.");
    } finally {
      setResolvingId(null);
    }
  }

  function severityPill(severityRaw, fallbackCode) {
    const Sx = S;
    // support both direct severity + derived from code
    const baseSeverity =
      (severityRaw || "").toString().toUpperCase() ||
      mapSeverityFromCode(fallbackCode);

    let base = Sx.sevMedium;
    let label = "MEDIUM";

    if (baseSeverity === "LOW") {
      base = Sx.sevLow;
      label = "LOW";
    } else if (baseSeverity === "HIGH") {
      base = Sx.sevHigh;
      label = "HIGH";
    } else if (baseSeverity === "CRITICAL" || baseSeverity === "CODE_RED") {
      base = Sx.sevCritical;
      label = "CRITICAL";
    } else if (baseSeverity === "MEDIUM" || baseSeverity === "MODERATE") {
      base = Sx.sevMedium;
      label = "MEDIUM";
    } else {
      base = Sx.sevUnknown;
      label = baseSeverity || "UNKNOWN";
    }

    return <span style={base}>{label}</span>;
  }

  return (
    <div className={poppins.className} style={S.page}>
      {/* header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
          Emergency Dashboard
        </h1>
        <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 14 }}>
          Live monitoring of active emergency alerts from LigtasCommute devices.
        </p>
      </div>

      {/* top meta row – LIVE FEED only (no last updated) */}
      <div style={S.topMetaRow}>
        <div style={S.livePill}>
          <span style={S.liveDot} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>LIVE FEED</span>
          <span style={S.liveCount}>
            {loading
              ? "Loading…"
              : `${emergencies.length} active incident${
                  emergencies.length === 1 ? "" : "s"
                }`}
          </span>
        </div>
      </div>

      {/* flash */}
      {flash.text && (
        <div aria-live="polite" role="status" style={S.flash(flash.type)}>
          {flash.text}
        </div>
      )}

      {/* main card */}
      <section style={S.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "flex-start",
            marginBottom: 8,
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 18,
                marginBottom: 2,
              }}
            >
              Active Emergencies
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              Incidents will disappear here once marked as resolved and will
              move to Emergency Reports.
            </div>
          </div>
          <button
            type="button"
            style={S.refreshBtn}
            onClick={loadEmergencies}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {loading && emergencies.length === 0 ? (
          <p style={S.muted}>Loading active emergencies…</p>
        ) : emergencies.length === 0 ? (
          <div style={S.emptyState}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              No active emergencies
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              All recent incidents are already resolved. This panel will update
              automatically whenever a new alert is triggered.
            </div>
          </div>
        ) : (
          <div style={S.incidentList}>
            {emergencies.map((e) => {
              const id = e?.id ?? e?.incidentId;

              const busNumber =
                e?.busNumber || e?.bus_no || e?.bus?.number || "Unknown bus";

              const busPlate =
                e?.busPlate ||
                e?.bus_plate ||
                e?.plateNumber ||
                e?.bus?.plate ||
                null;

              const driverName =
                e?.driverName ||
                e?.driverFullName ||
                e?.driver?.fullName ||
                "Unknown driver";

              const deviceId =
                e?.deviceId ||
                e?.device_id ||
                e?.deviceCode ||
                e?.iotDeviceId ||
                "N/A";

              const locationLabel =
                e?.locationLabel ||
                e?.locationText ||
                e?.nearestLandmark ||
                (e?.lat && e?.lng
                  ? `${e.lat}, ${e.lng}`
                  : e?.latitude && e?.longitude
                  ? `${e.latitude}, ${e.longitude}`
                  : "Location not available");

              const createdAt =
                e?.createdAt || e?.timestamp || e?.reportedAt || null;

              const severity = e?.severity || mapSeverityFromCode(e?.code);

              return (
                <div key={id || Math.random()} style={S.incidentCard}>
                  {/* top row: bus + driver + severity + time ago */}
                  <div style={S.incidentHeader}>
                    <div style={S.incidentTitleCol}>
                      <div style={S.incidentLabel}>Bus &amp; Driver</div>
                      <div style={S.incidentTitle}>
                        Bus {busNumber} · {driverName}
                      </div>
                    </div>

                    <div style={S.incidentRightCol}>
                      {severityPill(severity, e?.code)}
                      <div style={S.incidentTime}>{timeAgo(createdAt)}</div>
                    </div>
                  </div>

                  {/* info grid */}
                  <div style={S.infoGrid}>
                    <div>
                      <div style={S.infoRow}>
                        <span style={S.infoLabel}>Device ID</span>
                        <span style={S.infoValue}>{deviceId}</span>
                      </div>
                      <div style={S.infoRow}>
                        <span style={S.infoLabel}>Reported at</span>
                        <span style={S.infoValue}>
                          {fmtDateTime(createdAt)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div style={S.infoRow}>
                        <span style={S.infoLabel}>Location</span>
                        <span style={S.infoValue}>{locationLabel}</span>
                      </div>
                      <div style={S.infoRow}>
                        <span style={S.infoLabel}>
                          {busPlate ? "Plate / Incident" : "Incident ID"}
                        </span>
                        <span style={S.infoValue}>
                          {busPlate
                            ? `${busPlate} · ${id}`
                            : id || "Not available"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* footer: Resolve button */}
                  <div style={S.incidentFooter}>
                    <button
                      type="button"
                      style={{
                        ...S.resolveBtn,
                        ...(resolvingId === id ? { opacity: 0.6 } : {}),
                      }}
                      disabled={resolvingId === id}
                      onClick={() => handleResolve(e)}
                    >
                      {resolvingId === id ? "Resolving…" : "Mark as Resolved"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- styles ---------- */

const styles = {
  page: {
    display: "grid",
    gap: 16,
    maxWidth: 1120,
    margin: "0 auto",
    padding: "0 16px 24px",
  },

  topMetaRow: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 4,
    gap: 12,
    flexWrap: "wrap",
  },
  livePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid #FCA5A5",
    background: "#FEF2F2",
    color: "#B91C1C",
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: "999px",
    background: "#EF4444",
    boxShadow: "0 0 0 3px rgba(239,68,68,0.35)",
  },
  liveCount: {
    fontSize: 12,
    color: "#7F1D1D",
  },

  card: {
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: 24,
    padding: 20,
    boxShadow: "0 20px 45px rgba(15,23,42,0.06)",
    marginTop: 4,
  },

  muted: { color: "#6B7280", fontSize: 14 },

  flash: (type) => ({
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 14,
    marginTop: 8,
    color: type === "error" ? "#B91C1C" : "#166534",
    background: type === "error" ? "#FEE2E2" : "#DCFCE7",
    border: type === "error" ? "1px solid #FCA5A5" : "1px solid #86EFAC",
  }),

  refreshBtn: {
    borderRadius: 999,
    border: "1px solid #D4DBE7",
    background: "#FFFFFF",
    padding: "8px 14px",
    fontSize: 13,
    cursor: "pointer",
    color: "#0F172A",
    fontWeight: 500,
  },

  emptyState: {
    padding: "24px 12px",
    textAlign: "center",
  },

  incidentList: {
    display: "grid",
    gap: 10,
    marginTop: 10,
  },

  incidentCard: {
    border: "1px solid #E2E8F0",
    borderRadius: 24,
    padding: 18,
    background: "#FFFFFF",
    boxShadow: "0 18px 40px rgba(15,23,42,0.05)",
  },

  incidentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  incidentTitleCol: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  incidentLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.08,
    color: "#9CA3AF",
  },
  incidentTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0D658B",
  },
  incidentRightCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
  },
  incidentTime: {
    fontSize: 12,
    color: "#6B7280",
  },

  infoGrid: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 24,
  },
  infoRow: {
    display: "flex",
    gap: 12,
    fontSize: 13,
    marginTop: 4,
  },
  infoLabel: {
    width: 90,
    color: "#6B7280",
  },
  infoValue: {
    color: "#111827",
    fontWeight: 500,
  },

  incidentFooter: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 14,
  },
  resolveBtn: {
    borderRadius: 999,
    border: "none",
    background: "#B91C1C",
    color: "#F9FAFB",
    padding: "8px 16px",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 600,
  },

  // severity pills
  sevLow: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.08,
    background: "#ECFDF3",
    color: "#166534",
    border: "1px solid #86EFAC",
  },
  sevMedium: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.08,
    background: "#FEF9C3",
    color: "#854D0E",
    border: "1px solid #FACC15",
  },
  sevHigh: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.08,
    background: "#FEF2F2",
    color: "#B91C1C",
    border: "1px solid #FCA5A5",
  },
  sevCritical: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.08,
    background: "#FEE2E2",
    color: "#7F1D1D",
    border: "1px solid #F87171",
  },
  sevUnknown: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.08,
    background: "#E5E7EB",
    color: "#374151",
    border: "1px solid #CBD5F5",
  },
};
