// src/app/(protected)/dashboard/page.js
export const metadata = { title: "Dashboard" };

const STATS = [
  ["48", "Total Incidents", "Last 30 Days"],
  ["4.4", "Average per day", "Last 30 Days"],
  ["0%", "Change", "vs previous period"],
];

export default function Dashboard() {
  return (
    <div style={{ width: "100%", maxWidth: 960, display: "grid", gap: 24 }}>
      {/* Page title & subtext */}
      <div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Dashboard Overview
        </h1>
        <p
          style={{
            marginTop: 6,
            fontSize: 14,
            color: "var(--muted)",
          }}
        >
          Welcome back! Here’s what’s happening today.
        </p>
      </div>

      {/* Main analytics card */}
      <section style={card}>
        {/* Header */}
        <header style={{ marginBottom: 16 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--muted)",
              margin: 0,
            }}
          >
            Incident Reports
          </p>
          <h2
            style={{
              margin: "4px 0 0",
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            Incident Reports Over Time
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            Track incident trends across time with detailed analytics.
          </p>
        </header>

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {STATS.map(([big, title, sub]) => (
            <div key={title} style={tile}>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  marginBottom: 4,
                  lineHeight: 1,
                }}
              >
                {big}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  marginTop: 2,
                }}
              >
                {sub}
              </div>
            </div>
          ))}
        </div>

        {/* Chart placeholder */}
        <div
          style={{
            marginTop: 20,
            height: 260,
            border: "1px dashed var(--line)",
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            color: "var(--muted)",
            fontSize: 14,
            background: "var(--surface-soft)",
          }}
        >
          Chart goes here
        </div>
      </section>
    </div>
  );
}

const card = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.06)",
};

const tile = {
  background: "#FFFFFF",
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: 12,
};
