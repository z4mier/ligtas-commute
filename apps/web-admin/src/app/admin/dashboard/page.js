"use client";

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      {/* Header */}
      <header>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0B1526]">
          Dashboard Overview
        </h2>
        <p className="text-sm md:text-base text-[#4A5A6B] mt-1">
          Welcome back! Here’s a quick summary of your system.
        </p>
      </header>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI value="48" label="Total Incidents" />
        <KPI value="12" label="Pending Reports" />
        <KPI value="1,204" label="Active Users" />
        <KPI value="98%" label="System Uptime" />
      </div>

      {/* Activity Table */}
      <div className="rounded-2xl border border-[#C7D8E6] bg-white p-5 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg md:text-xl font-semibold text-[#0B1526]">Recent Activity</h3>
          <a
            href="/incident-reports"
            className="text-sm text-[#00ABE4] hover:underline"
          >
            View All
          </a>
        </div>
        <p className="text-sm text-[#4A5A6B] mb-4">
          Latest system actions within the last 7 days.
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[#5D6E80] border-b border-[#C7D8E6]">
                <Th>Date</Th>
                <Th>Action</Th>
                <Th>User</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EEF7]">
              {RECENT_ACTIVITY.map((item) => (
                <tr key={item.id} className="hover:bg-[#F3F9FF] transition">
                  <Td>{item.date}</Td>
                  <Td>{item.action}</Td>
                  <Td>{item.user}</Td>
                  <Td>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                        item.status === "Success"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                      }`}
                    >
                      {item.status}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ---------- Components ---------- */
function KPI({ value, label }) {
  return (
    <div className="rounded-2xl border border-[#C7D8E6] bg-white p-5 text-center shadow-sm">
      <div className="text-3xl font-extrabold text-[#0B1526]">{value}</div>
      <div className="text-sm text-[#4A5A6B] mt-1">{label}</div>
    </div>
  );
}

function Th({ children }) {
  return <th className="py-2 pr-4 font-medium">{children}</th>;
}

function Td({ children }) {
  return <td className="py-2 pr-4 text-[#0B1526]">{children}</td>;
}

/* ---------- Mock Data ---------- */
const RECENT_ACTIVITY = [
  { id: 1, date: "Oct 05, 14:22", action: "Driver account approved", user: "Admin A", status: "Success" },
  { id: 2, date: "Oct 05, 13:05", action: "Incident report reviewed", user: "Admin B", status: "Success" },
  { id: 3, date: "Oct 04, 19:40", action: "System backup initiated", user: "System", status: "Success" },
  { id: 4, date: "Oct 04, 11:12", action: "Password reset request", user: "Driver M.", status: "Pending" },
];
