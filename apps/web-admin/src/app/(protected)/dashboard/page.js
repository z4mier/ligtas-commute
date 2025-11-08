// src/app/(protected)/dashboard/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listEmergencyIncidents } from "@/lib/reports";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Search, RefreshCw } from "lucide-react";

function fmtDate(x) {
  if (!x) return "—";
  const d = new Date(x);
  return d.toLocaleString([], { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await listEmergencyIncidents({ q: "" });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((i) =>
      [i.code, i.busNumber, i.route, i.driverName, i.location, i.message]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(t)
    );
  }, [items, q]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#101929]">Dashboard</h1>
        <p className="text-sm text-[#6b7280]">Emergency incidents only.</p>
      </div>

      {/* Stat + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-[#6b7280]">
            <AlertTriangle className="h-4 w-4 text-[#0D658B]" />
            Open Emergencies
          </div>
          <div className="mt-1 text-3xl font-semibold text-[#101929]">
            {items.length}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-[60vw] sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search emergencies…"
              className="pl-9 h-10"
            />
          </div>
          <Button variant="outline" className="h-10" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* List */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold text-[#101929]">Emergency Incidents</div>

        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="text-sm text-[#6b7280]">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-[#6b7280]">No emergency incidents found.</div>
          ) : (
            filtered.slice(0, 10).map((x) => (
              <div key={x.id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] font-medium text-[#101929] truncate">
                      #{x.code || x.id} • {x.busNumber || "—"} • {x.route || "—"}
                    </div>
                    <div className="mt-1 text-xs text-[#6b7280]">
                      Driver: {x.driverName || "—"} • {x.location || "—"} • {fmtDate(x.updatedAt || x.createdAt)}
                    </div>
                    <div className="mt-2 text-sm text-[#374151]">
                      {x.message || "—"}
                    </div>
                  </div>

                  <Link href="/reports?tab=emergencies" className="shrink-0">
                    <Button className="h-9 bg-[#0D658B] hover:bg-[#0b5676] text-white">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {filtered.length > 10 && (
          <div className="mt-4 flex justify-center">
            <Link href="/reports?tab=emergencies">
              <Button className="h-10 bg-[#0D658B] hover:bg-[#0b5676] text-white">
                View all emergencies
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
