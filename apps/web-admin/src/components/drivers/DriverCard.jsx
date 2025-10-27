// src/components/drivers/DriverCard.jsx
"use client";

export default function DriverCard({ d }) {
  return (
    <div style={S.card}>
      <div style={S.rowTop}>
        <div style={S.name}>{d.fullName || "Unnamed Driver"}</div>
        <div style={S.badge}>DRV-{String(d.id).slice(-5).toUpperCase()}</div>
      </div>

      <div style={S.grid}>
        <div><b>Email:</b> {d.email || "—"}</div>
        <div><b>Phone:</b> {d.phone || "—"}</div>
        <div><b>Birth Date:</b> {d.birthDate ? new Date(d.birthDate).toLocaleDateString() : "—"}</div>
        <div><b>License:</b> {d.licenseNo || "—"}</div>
        <div><b>Address:</b> {d.address || "—"}</div>
        <div><b>Vehicle:</b> {d.vehicleType || "—"}</div>
        <div><b>Bus Number:</b> {d.busNumber || "—"}</div>
        <div><b>Plate Number:</b> {d.plateNumber || "—"}</div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button style={S.btnGhost}>View</button>
        <button style={S.btnPrimary}>Activate</button>
      </div>
    </div>
  );
}

const S = {
  card: {
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: 12,
    padding: 16,
  },
  rowTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  name: { fontWeight: 700, fontSize: 16 },
  badge: {
    background: "var(--muted-2)",
    color: "var(--text)",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
    color: "var(--muted)",
    marginTop: 8,
  },
  btnGhost: {
    height: 34,
    padding: "0 12px",
    background: "transparent",
    border: "1px solid var(--line)",
    borderRadius: 8,
    color: "var(--text)",
  },
  btnPrimary: {
    height: 34,
    padding: "0 12px",
    background: "var(--brand, #0E4371)",
    border: "1px solid transparent",
    borderRadius: 8,
    color: "white",
    fontWeight: 600,
  },
};
