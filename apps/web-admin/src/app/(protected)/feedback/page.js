// src/app/(protected)/feedbacks/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { listAllFeedbacks } from "@/lib/feedbacks";
import FeedbackCard from "@/components/feedbacks/FeedbackCard";
import { Input } from "@/components/ui/input";

/* Helper: normalize a row to be search-friendly */
function normalizeFeedback(row) {
  const author = row?.createdBy?.fullName || "";
  const driverName =
    row?.driver?.fullName ||
    row?.driver?.user?.fullName ||
    "";
  const busNumber = row?.driver?.busNumber || row?.busNumber || "";
  const comment = row?.comment ?? row?.message ?? "";

  const searchBlob = [author, driverName, busNumber, comment]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return { ...row, _searchBlob: searchBlob };
}

export default function FeedbackPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await listAllFeedbacks();
        const safe = Array.isArray(data) ? data : [];
        // If API returns nothing, fall back to dummies
        const base = safe.length > 0 ? safe : DUMMY_FEEDBACKS;
        setItems(base.map(normalizeFeedback));
        if (safe.length === 0) setErr("Showing sample feedback (no data yet).");
      } catch (e) {
        console.error("Feedback load failed:", e);
        setErr("Showing sample feedback (could not load from server).");
        setItems(DUMMY_FEEDBACKS.map(normalizeFeedback));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((f) => f._searchBlob?.includes(term));
  }, [items, q]);

  return (
    <div className="space-y-5">
      {/* Page title + subtitle */}
      <div>
        <h1 className="text-2xl font-semibold text-[#101929]">
          User Feedback Management
        </h1>
        <p className="text-sm text-[#6b7280]">
          Monitor and manage passenger feedback and ratings.
        </p>
      </div>

      {/* Container card */}
      <section className="rounded-2xl border border-[#e9eef2] bg-white overflow-hidden shadow-sm">
        {/* Card header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 border-b border-[#eef3f6]">
          <div className="text-lg font-semibold text-[#101929]">Feedback List</div>

          {/* Search (right) */}
          <div className="relative w-full sm:w-80">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.386a1 1 0 01-1.414 1.415l-4.387-4.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z"
                clipRule="evenodd"
              />
            </svg>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search feedback..."
              className="h-10 pl-9"
            />
          </div>
        </div>

        {/* Card body: list */}
        <div className="p-4 sm:p-5">
          {/* Info / error state */}
          {err && (
            <div className="mb-3 text-sm text-[#0D658B] bg-[#e8f4f8] px-4 py-2 rounded border border-[#bfe1ec]">
              {err}
            </div>
          )}

          <div className="grid gap-3">
            {filtered.map((fb) => (
              <FeedbackCard key={fb.id} item={fb} />
            ))}

            {!loading && filtered.length === 0 && (
              <div className="text-center text-[#757575] py-8 border rounded-xl bg-[#f7fafc]">
                No feedback found.
              </div>
            )}

            {loading && (
              <div className="text-center text-[#757575] py-8">Loading…</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------- Dummy data (used when API is empty/unavailable) -------- */
const DUMMY_FEEDBACKS = [
  {
    id: "fb-001",
    rating: 5,
    comment: "Smooth ride and very courteous driver.",
    createdAt: new Date().toISOString(),
    createdBy: { id: "u-1", fullName: "Liezl Tumbaga" },
    driver: {
      id: "drv-1",
      fullName: "Eduardo Sanchez",
      user: { fullName: "Eduardo Sanchez" },
      busNumber: "BUS-5000",
    },
    route: "Cebu – Argao",
    source: "Commuter App",
  },
  {
    id: "fb-002",
    rating: 3,
    comment:
      "Aircon was weak; please check the unit. Otherwise okay and safe driving.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    createdBy: { id: "u-2", fullName: "Ramon Diaz" },
    driver: {
      id: "drv-2",
      fullName: "Pedro Garcia",
      user: { fullName: "Pedro Garcia" },
      busNumber: "BUS-3205",
    },
    route: "Cebu – Oslob",
    source: "Commuter App",
  },
  {
    id: "fb-003",
    rating: 4,
    comment: "On time and clean bus. Thank you!",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    createdBy: { id: "u-3", fullName: "Maria Santos" },
    driver: {
      id: "drv-3",
      fullName: "Danide Mendez",
      user: { fullName: "Danide Mendez" },
      busNumber: "BUS-6000",
    },
    route: "Cebu – Argao",
    source: "Commuter App",
  },
];
