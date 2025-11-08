// apps/admin/src/components/feedbacks/FeedbackCard.js
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Tiny stars renderer (1..5) */
function Stars({ value = 0 }) {
  const n = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={i < n ? "text-yellow-500" : "text-gray-300"}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
      <span className="ml-2 text-[#757575]">{n}/5</span>
    </span>
  );
}

function fmtDate(d) {
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
}

/**
 * item shape (from API):
 * {
 *   id, rating, comment, createdAt,
 *   createdBy: { id, fullName, role },
 *   driver: { id, user: { id, fullName } }
 * }
 */
export default function FeedbackCard({ item }) {
  const [open, setOpen] = useState(false);

  const author = item?.createdBy?.fullName || "Commuter";
  const driverName = item?.driver?.user?.fullName || "—";
  const comment = item?.comment || "—";
  const date = fmtDate(item?.createdAt);

  return (
    <>
      <div className="rounded-xl border border-[#e9eef2] bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-semibold text-[#101929] truncate">
              {author}
            </div>
            <div className="text-sm text-[#6b7280] mt-0.5">
              Driver: {driverName}
            </div>

            {comment && (
              <p className="text-sm text-[#101929] mt-2 line-clamp-2">
                {comment}
              </p>
            )}

            <div className="flex items-center gap-3 mt-3 text-sm">
              <Stars value={item?.rating} />
              <span className="text-[#9aa3af]">{date}</span>
            </div>
          </div>

          <Button variant="outline" onClick={() => setOpen(true)}>
            View
          </Button>
        </div>
      </div>

      {/* Quick view dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0D658B]">Feedback Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-[#101929]">Author:</span>{" "}
              <span className="text-[#374151]">{author}</span>
            </div>
            <div>
              <span className="font-medium text-[#101929]">Driver:</span>{" "}
              <span className="text-[#374151]">{driverName}</span>
            </div>
            <div>
              <span className="font-medium text-[#101929]">Date:</span>{" "}
              <span className="text-[#374151]">{date}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#101929]">Rating:</span>
              <Stars value={item?.rating} />
            </div>
            <div className="pt-2">
              <div className="font-medium text-[#101929] mb-1">Comment</div>
              <p className="rounded-md border border-[#e9eef2] bg-[#f9fbfd] p-3 text-[#374151] whitespace-pre-wrap">
                {comment}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
