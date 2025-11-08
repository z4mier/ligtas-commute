// src/app/(protected)/reports/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { listReports } from "@/lib/reports";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Clock4,
  Bus,
  UserRound,
  Info,
  Search,
  Download,
  Printer,
} from "lucide-react";

/* ---------- helpers ---------- */
function fmtDT(s) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString();
}
function ymd(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* ---------- one report card ---------- */
function ReportCard({ item, onView }) {
  const hasTitle = !!item.title;

  return (
    <div className="rounded-xl border border-[#e6ebf0] bg-white p-4 shadow-sm">
      {hasTitle && (
        <div className="mb-1.5 text-[14px] font-semibold text-[#0b1220]">
          {item.title}
        </div>
      )}

      {/* top row */}
      <div className="flex items-start justify-between gap-3 pb-2 border-b border-[#eef3f6]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#374151]">
          <div className="flex items-center gap-1">
            <Bus className="h-4 w-4 text-[#0D658B]" />
            <span className="font-medium">{item.busNumber || "—"}</span>
          </div>
          <span className="text-[#9CA3AF]">•</span>
          <div>{item.route || "—"}</div>
          <span className="text-[#9CA3AF]">•</span>
          <div className="flex items-center gap-1">
            <UserRound className="h-4 w-4" />
            <span>Driver: {item.driverName || "—"}</span>
          </div>
        </div>

        <Button size="sm" variant="outline" className="h-8 gap-2" onClick={() => onView?.(item)}>
          <Info className="h-4 w-4" />
          View Details
        </Button>
      </div>

      {/* meta */}
      <div className="mt-2 grid grid-cols-1 gap-2 text-[13px] text-[#374151] sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#6B7280]" />
          <span>{item.location || "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock4 className="h-4 w-4 text-[#6B7280]" />
          <span>{fmtDT(item.createdAt)}</span>
        </div>
      </div>

      {item.message ? (
        <p className="mt-3 text-[13px] leading-relaxed text-[#4B5563]">{item.message}</p>
      ) : null}

      <div className="mt-3 text-[12px] text-[#6B7280]">
        Reported by: {item.source || "Commuter App"}
      </div>
    </div>
  );
}

/* ---------- page ---------- */
export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  // filters
  const [q, setQ] = useState("");
  const today = ymd();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(today);

  async function load() {
    setLoading(true);
    try {
      const data = await listReports({ q: "" }); // load all; filter client-side
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // prevent future-date export
  const badRange =
    (fromDate && toDate && fromDate > toDate) || (toDate && toDate > today);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((r) => {
      if (fromDate || toDate) {
        const d = new Date(r.createdAt);
        const dYmd = ymd(d);
        if (fromDate && dYmd < fromDate) return false;
        if (toDate && dYmd > toDate) return false; // no advance
      }
      if (!term) return true;
      const s = [r.title, r.busNumber, r.route, r.driverName, r.location, r.message, r.source]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return s.includes(term);
    });
  }, [items, q, fromDate, toDate]);

  /* ---------- export ---------- */
  function exportCSV() {
    const header = [
      "Title",
      "Bus Number",
      "Route",
      "Driver",
      "Location",
      "Created At",
      "Source",
      "Message",
    ];
    const rows = filtered.map((r) => [
      r.title || "",
      r.busNumber || "",
      r.route || "",
      r.driverName || "",
      r.location || "",
      fmtDT(r.createdAt),
      r.source || "",
      (r.message || "").replace(/\n/g, " "),
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const v = String(cell ?? "");
            return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const labelFrom = fromDate || "ALL";
    const labelTo = toDate || "ALL";
    a.href = url;
    a.download = `reports_${labelFrom}_to_${labelTo}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function printList() {
    const win = window.open("", "_blank");
    if (!win) return;
    const rows = filtered
      .map(
        (r) => `
      <tr>
        <td>${r.title || ""}</td>
        <td>${r.busNumber || ""}</td>
        <td>${r.route || ""}</td>
        <td>${r.driverName || ""}</td>
        <td>${r.location || ""}</td>
        <td>${fmtDT(r.createdAt)}</td>
        <td>${r.source || ""}</td>
        <td>${(r.message || "").replace(/</g, "&lt;")}</td>
      </tr>`
      )
      .join("");

    win.document.write(`
      <html>
        <head>
          <title>Reports</title>
          <meta charset="utf-8"/>
          <style>
            body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;padding:16px}
            table{border-collapse:collapse;width:100%}
            th,td{border:1px solid #e5e7eb;padding:8px;font-size:12px;text-align:left;vertical-align:top}
            th{background:#f8fafc}
            h2{margin:0 0 8px 0}
            .muted{color:#64748b;font-size:12px;margin-bottom:12px}
          </style>
        </head>
        <body>
          <h2>Reports</h2>
          <div class="muted">Range: ${fromDate || "ALL"} → ${toDate || "ALL"} | Generated: ${new Date().toLocaleString()}</div>
          <table>
            <thead>
              <tr>
                <th>Title</th><th>Bus #</th><th>Route</th><th>Driver</th>
                <th>Location</th><th>Created At</th><th>Source</th><th>Message</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#101929]">Reports</h1>
        <p className="text-sm text-[#6b7280]">
          Review commuter reports.
        </p>
      </div>

      {/* Filters / Search / Export */}
      <div className="rounded-2xl border border-[#e9eef2] bg-white p-4 sm:p-5 shadow-sm">
        {/* Single row that wraps nicely */}
        <div className="flex flex-wrap items-end gap-2">
          {/* From */}
          <div className="flex flex-col">
            <label className="text-xs text-[#64748b] mb-1">From</label>
            <Input
              type="date"
              value={fromDate}
              max={toDate || ymd()}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 w-[150px] focus-visible:ring-2 focus-visible:ring-[#0D658B]/30 focus-visible:border-[#0D658B]"
            />
          </div>

          {/* To */}
          <div className="flex flex-col">
            <label className="text-xs text-[#64748b] mb-1">To</label>
            <Input
              type="date"
              value={toDate}
              max={ymd()} // block future
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 w-[150px] focus-visible:ring-2 focus-visible:ring-[#0D658B]/30 focus-visible:border-[#0D658B]"
            />
          </div>

          {/* Refresh / Reset */}
          <Button type="button" onClick={load} variant="outline" className="h-10">
            Refresh
          </Button>
          <Button
            type="button"
            onClick={() => {
              setFromDate("");
              setToDate(ymd());
              setQ("");
            }}
            variant="outline"
            className="h-10"
          >
            Reset
          </Button>

          {/* Search grows to fill */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <Input
              placeholder="Search incidents..."
              className="h-10 pl-9 w-full focus-visible:ring-2 focus-visible:ring-[#0D658B]/30 focus-visible:border-[#0D658B]"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Export / Print */}
          <Button
            onClick={exportCSV}
            disabled={badRange || loading || filtered.length === 0}
            className="h-10 bg-[#0D658B] hover:bg-[#0a5573]"
            title={badRange ? "Fix date range first" : "Export CSV"}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-[#e9eef2] bg-white p-4 sm:p-5 shadow-sm">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-[#6b7280]">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 text-center">
            <div className="text-base font-medium text-[#101929]">No reports found</div>
            <div className="text-sm text-[#6b7280]">Try different filters.</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((item) => (
              <ReportCard key={item.id} item={item} onView={() => {}} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
