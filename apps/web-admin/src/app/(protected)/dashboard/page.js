export const metadata = { title: "Dashboard" };

const STATS = [
  ["48", "Total Incidents", "Last 30 days"],
  ["4.4", "Average per day", "Last 30 days"],
  ["0%", "Change", "vs previous period"],
];

export default function Dashboard() {
  return (
    <>
      <style>{css}</style>
      <div
        className="lc-dashboard-root"
        style={{
          width: "100%",
          maxWidth: 960,
          display: "grid",
          gap: 24,
        }}
      >
        {/* Page title & subtext */}
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1.2,
              margin: 0,
              letterSpacing: 0.15,
              color: "#0F172A",
            }}
          >
            Dashboard Overview
          </h1>
          <p
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            Welcome back! Here’s what’s happening today.
          </p>
        </div>

        {/* Main analytics card */}
        <section style={card}>
          {/* Header */}
          <header style={{ marginBottom: 18 }}>
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
                color: "#0D658B", // 🔵 match card heading to brand blue
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
              <div key={title} style={tile} className="lc-stat-tile">
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    marginBottom: 4,
                    lineHeight: 1,
                    color: "#0D658B", // 🔵 big number in brand blue
                  }}
                >
                  {big}
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: "#1F2937", // softer dark gray, not pure black
                  }}
                >
                  {title}
                </div>
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
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              color: "var(--muted)",
              fontSize: 13,
              background: "var(--surface-soft)",
              border: "1px dashed var(--line)",
            }}
          >
            Chart goes here
          </div>
        </section>
      </div>
    </>
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

const css = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

.lc-dashboard-root {
  font-family: 'Poppins', system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Stat tiles hover effect */
.lc-stat-tile {
  transition:
    transform 120ms ease,
    box-shadow 120ms ease,
    border-color 120ms ease,
    background 120ms ease;
}

.lc-stat-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
  border-color: #D0E2FF;
  background: #F9FBFF;
}
`;
 