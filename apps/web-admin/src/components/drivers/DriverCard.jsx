// src/components/drivers/DriverCard.jsx
"use client";

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString();
}

function routeSideLabel(side) {
  if (side === "EAST") return "East route (via Oslob)";
  if (side === "WEST") return "West route (via Barili)";
  return "—";
}

/* Small helper component for label + value */
function Field({ label, value }) {
  return (
    <div style={S.field}>
      <div style={S.fieldLabel}>{label}</div>
      <div style={S.fieldValue}>{value || "—"}</div>
    </div>
  );
}

export default function DriverCard({ d }) {
  const code = d?.id ? `DRV-${String(d.id).slice(-5).toUpperCase()}` : "DRV—";

  // Normalize props in case data shape changes a bit
  const busNumber = d.busNo || d.busNumber || "—";
  const plateNumber = d.plateNumber || d.plate || "—";
  const vehicle = d.vehicleType || d.vehicle || "—";

  const sideRaw = d.routeSide || d.corridor || "";
  const routeSide = routeSideLabel(sideRaw);

  const route =
    d.routeName ||
    (d.forwardRoute && d.returnRoute
      ? `${d.forwardRoute} — ${d.returnRoute}`
      : "—");

  return (
    <div style={S.card}>
      {/* Top row: name + code */}
      <div style={S.rowTop}>
        <div style={S.name}>{d.fullName || "Unnamed Driver"}</div>
        <div style={S.badge}>{code}</div>
      </div>

      {/* Two-column details */}
      <div style={S.grid}>
        {/* Personal info column */}
        <div style={S.col}>
          <div style={S.sectionLabel}>PERSONAL INFORMATION</div>

          <Field label="Email" value={d.email} />
          <Field label="Phone" value={d.phone} />
          <Field label="Birth date" value={fmtDate(d.birthDate)} />
          <Field label="License" value={d.licenseNo} />
          <Field label="Address" value={d.address} />
          <Field label="Applied on" value={fmtDate(d.createdAt)} />
        </div>

        {/* Bus & route column */}
        <div style={S.col}>
          <div style={S.sectionLabel}>BUS & ROUTE</div>

          <Field label="Vehicle" value={vehicle} />
          <Field label="Bus number" value={busNumber} />
          <Field label="Plate number" value={plateNumber} />
          <Field label="Route side" value={routeSide} />
          <Field label="Route" value={route} />
        </div>
      </div>

      {/* Actions (generic for now; parent page can handle real actions) */}
      <div style={S.actions}>
        <button type="button" style={S.btnGhost}>
          View details
        </button>
        <button type="button" style={S.btnPrimary}>
          {d.status === "ACTIVE" ? "Active" : "Activate"}
        </button>
      </div>
    </div>
  );
}

const S = {
  card: {
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: 24,
    padding: 20,
    boxShadow: "0 20px 40px rgba(15,23,42,0.06)",
  },
  rowTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  name: {
    fontWeight: 700,
    fontSize: 18,
    color: "var(--accent)", // same blue as theme
  },
  badge: {
    background: "#EEF2FF",
    color: "#4B5563",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 600,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 24,
    marginTop: 8,
  },
  col: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "var(--muted)",
    fontWeight: 600,
    marginBottom: 4,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  fieldLabel: {
    fontSize: 12,
    color: "var(--muted)",
  },
  fieldValue: {
    fontSize: 13,
    color: "var(--text)",
    fontWeight: 500,
  },
  actions: {
    marginTop: 16,
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  },
  btnGhost: {
    height: 34,
    padding: "0 14px",
    background: "transparent",
    border: "1px solid var(--line)",
    borderRadius: 999,
    color: "var(--accent)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  btnPrimary: {
    height: 34,
    padding: "0 18px",
    background: "var(--accent)",
    border: "1px solid var(--accent)",
    borderRadius: 999,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
};
