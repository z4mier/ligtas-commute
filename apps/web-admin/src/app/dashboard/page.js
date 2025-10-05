"use client";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  return (
    <section className={styles.panel}>
      <h2 className={styles.h2}>Dashboard Overview</h2>
      <p className={styles.subtle}>Welcome back! Here’s what’s happening today.</p>

      <div className={styles.card}>
        <h3 className={styles.h3}>Incident Reports Over Time</h3>
        <p className={styles.subtle}>
          Track incident trends across different time periods with detailed analytics
        </p>

        <div className={styles.metrics}>
          <Metric value="48" label="Total Incidents" note="Last 30 Days" />
          <Metric value="4.4" label="Average per day" note="Last 30 Days" />
          <Metric value="0%" label="Change from previous" note="period" />
        </div>

        <div className={styles.chartBox}>
          <svg viewBox="0 0 600 240" className={styles.chartSvg} role="img" aria-label="Incident Reports">
            <polyline
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
              points="10,200 80,160 150,140 220,110 290,95 360,140 430,70 500,200"
            />
            <line x1="10" y1="200" x2="590" y2="200" stroke="var(--line)" strokeWidth="1" />
          </svg>
        </div>
      </div>
    </section>
  );
}

function Metric({ value, label, note }) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricNote}>{note}</div>
    </div>
  );
}
