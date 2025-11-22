// apps/web-admin/src/app/(protected)/feedback/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { listFeedback } from "@/lib/api";
import { Star, X as XIcon } from "lucide-react";

export default function FeedbackPage() {
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState({ type: "", text: "" });

  const [feedback, setFeedback] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  // sort + pagination (same pattern as buses)
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest" | "az"
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5; // minimum of 5 per page

  function showFlash(type, text) {
    setFlash({ type, text });
    setTimeout(() => setFlash({ type: "", text: "" }), 1600);
  }

  async function loadFeedback() {
    try {
      setLoading(true);
      const res = await listFeedback();
      const items = Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res)
        ? res
        : [];
      setFeedback(items);
      setPage(1); // reset page whenever we reload
    } catch (err) {
      console.error("LOAD FEEDBACK ERROR:", err);
      showFlash("error", err.message || "Failed to load feedback.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeedback();
  }, []);

  // reset page if search or sort changes
  useEffect(() => {
    setPage(1);
  }, [search, sortOrder]);

  const normalizedSearch = search.trim().toLowerCase();

  // search
  const searched = useMemo(() => {
    if (!normalizedSearch) return feedback;
    return feedback.filter((f) => {
      const target = [
        f.authorName,
        f.driverName,
        f.comment,
        String(f.score),
        f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return target.includes(normalizedSearch);
    });
  }, [normalizedSearch, feedback]);

  // sort (newest / oldest / A-Z)
  const sorted = useMemo(() => {
    const arr = [...searched];

    // A–Z by author name
    if (sortOrder === "az") {
      return arr.sort((a, b) => {
        const aa = (a.authorName || "").toLowerCase();
        const bb = (b.authorName || "").toLowerCase();
        return aa.localeCompare(bb);
      });
    }

    // date-based sorting
    return arr.sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortOrder === "newest" ? bDate - aDate : aDate - bDate;
    });
  }, [searched, sortOrder]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(startIndex, startIndex + PAGE_SIZE);

  const S = styles;

  return (
    <div style={S.page}>
      {/* Header */}
      <div>
        <h1 style={S.title}>User Feedback Management</h1>
        <p style={S.sub}>Monitor and manage passenger feedback and ratings.</p>
      </div>

      {/* Main card */}
      <section style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>Feedback List</div>

          {/* Search + sort (no refresh button) */}
          <div style={S.toolbar}>
            <div style={S.searchWrapper}>
              <input
                style={S.searchInput}
                placeholder="Search feedback..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={S.toolbarRight}>
              <select
                style={S.sortSelect}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="newest">Newest to oldest</option>
                <option value="oldest">Oldest to newest</option>
                <option value="az">A–Z (Author name)</option>
              </select>
            </div>
          </div>
        </div>

        {flash.text && (
          <div aria-live="polite" role="status" style={S.flash(flash.type)}>
            {flash.text}
          </div>
        )}

        {/* List */}
        {loading && feedback.length === 0 ? (
          <p style={S.muted}>Loading feedback…</p>
        ) : pageItems.length === 0 ? (
          <p style={S.muted}>No feedback found.</p>
        ) : (
          <>
            <div style={S.list}>
              {pageItems.map((f) => (
                <article key={f.id} style={S.item}>
                  <div style={S.itemMain}>
                    <div style={S.itemHeader}>
                      <div style={S.itemAuthor}>{f.authorName}</div>
                      <div style={S.itemMeta}>
                        <span style={S.metaLabel}>Driver:</span>{" "}
                        <span>{f.driverName}</span>
                      </div>
                    </div>

                    <p style={S.commentPreview}>
                      {f.comment || "No comment provided."}
                    </p>

                    <div style={S.itemFooter}>
                      <div style={S.ratingRow}>
                        <StarRating score={f.score} />
                        <span style={S.scoreText}>{f.score}/5</span>
                        <span style={S.dot}>•</span>
                        <span style={S.dateText}>
                          {f.createdAt
                            ? new Date(f.createdAt).toLocaleDateString()
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={S.itemSide}>
                    <button
                      type="button"
                      style={S.viewBtn}
                      onClick={() => setSelected(f)}
                    >
                      View
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* pagination (same pattern as buses) */}
            <div style={S.paginationRow}>
              <span style={S.paginationText}>
                Showing{" "}
                {sorted.length === 0
                  ? 0
                  : `${startIndex + 1}-${Math.min(
                      startIndex + PAGE_SIZE,
                      sorted.length
                    )}`}{" "}
                of {sorted.length} feedback
              </span>
              <div style={S.paginationBtns}>
                <button
                  type="button"
                  style={S.pageBtn}
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span style={S.paginationText}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  style={S.pageBtn}
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Modal */}
      {selected && (
        <div style={S.modalBackdrop}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div style={S.modalTitle}>Feedback Details</div>
              <button
                type="button"
                style={S.modalClose}
                onClick={() => setSelected(null)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <div style={S.modalBody}>
              <Row label="Author" value={selected.authorName} />
              <Row label="Driver" value={selected.driverName} />
              <Row
                label="Date"
                value={
                  selected.createdAt
                    ? new Date(selected.createdAt).toLocaleDateString()
                    : "—"
                }
              />
              <Row
                label="Rating"
                value={
                  <div style={S.modalRating}>
                    <StarRating score={selected.score} />
                    <span style={S.scoreText}>{selected.score}/5</span>
                  </div>
                }
              />
              <div style={{ marginTop: 10 }}>
                <div style={S.modalLabel}>Comment</div>
                <div style={S.modalCommentBox}>
                  {selected.comment || "No comment provided."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* small helpers */

function StarRating({ score = 0 }) {
  const s = Math.max(0, Math.min(5, Number(score) || 0));
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          style={{
            fill: i < s ? "#facc15" : "transparent",
            color: i < s ? "#facc15" : "#e5e7eb",
          }}
        />
      ))}
    </div>
  );
}

function Row({ label, value }) {
  const S = styles;
  return (
    <div style={S.row}>
      <div style={S.modalLabel}>{label}:</div>
      <div style={S.rowValue}>{value ?? "—"}</div>
    </div>
  );
}

/* inline styles to match your existing admin theme */

const styles = {
  page: {
    display: "grid",
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    margin: 0,
  },
  sub: {
    margin: "6px 0 0",
    color: "var(--muted)",
  },
  card: {
    background: "var(--card)",
    borderRadius: 16,
    border: "1px solid var(--line)",
    padding: 20,
  },
  cardHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 10,
  },
  cardTitle: {
    fontWeight: 700,
    fontSize: 18,
  },

  /* toolbar (search + sort) */
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  searchWrapper: {
    flex: 1,
  },
  searchInput: {
    width: "100%",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,.45)",
    padding: "10px 14px",
    fontSize: 14,
    outline: "none",
    background: "#f9fafb",
  },
  toolbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  sortSelect: {
    borderRadius: 999,
    border: "1px solid #D4DBE7",
    padding: "8px 12px",
    fontSize: 13,
    background: "#FFFFFF",
    color: "var(--text)",
    outline: "none",
  },
  // refreshBtn style left here unused; you can remove if you want super-clean
  refreshBtn: {
    whiteSpace: "nowrap",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,.5)",
    padding: "8px 16px",
    background: "white",
    fontSize: 13,
    cursor: "pointer",
  },

  flash: (type) => ({
    marginTop: 6,
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 13,
    background:
      type === "error" ? "rgba(239,68,68,.08)" : "rgba(34,197,94,.08)",
    color: type === "error" ? "#b91c1c" : "#166534",
    border:
      type === "error"
        ? "1px solid rgba(248,113,113,.7)"
        : "1px solid rgba(74,222,128,.7)",
  }),
  muted: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 4,
  },
  list: {
    display: "grid",
    gap: 10,
    marginTop: 4,
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "stretch",
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(203,213,225,.8)",
    background: "#ffffff",
  },
  itemMain: {
    display: "grid",
    gap: 6,
    flex: 1,
  },
  itemHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  itemAuthor: {
    fontWeight: 700,
    fontSize: 15,
    color: "#0f172a",
  },
  itemMeta: {
    fontSize: 13,
    color: "#6b7280",
  },
  metaLabel: {
    fontWeight: 600,
  },
  commentPreview: {
    margin: 0,
    fontSize: 13,
    color: "#4b5563",
  },
  itemFooter: {
    marginTop: 2,
  },
  ratingRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#6b7280",
  },
  scoreText: {
    fontWeight: 600,
  },
  dateText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  dot: {
    fontSize: 14,
    color: "#d1d5db",
  },
  itemSide: {
    display: "flex",
    alignItems: "center",
  },
  viewBtn: {
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,.7)",
    padding: "6px 16px",
    background: "#ffffff",
    fontSize: 13,
    cursor: "pointer",
  },

  /* pagination (same style family as buses) */
  paginationRow: {
    marginTop: 14,
    paddingTop: 10,
    borderTop: "1px solid var(--line)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 13,
    color: "#6B7280",
  },
  paginationText: {
    fontSize: 13,
    color: "#6B7280",
  },
  paginationBtns: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  pageBtn: {
    borderRadius: 999,
    border: "1px solid #D4DBE7",
    padding: "6px 12px",
    background: "#FFFFFF",
    color: "#0F172A",
    cursor: "pointer",
    fontSize: 13,
  },

  /* modal */
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(15,23,42,.45)",
    zIndex: 40,
  },
  modal: {
    width: "min(520px, 96vw)",
    borderRadius: 16,
    border: "1px solid rgba(203,213,225,.9)",
    background: "#ffffff",
    padding: 16,
    boxShadow: "0 20px 60px rgba(15,23,42,.28)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: {
    fontWeight: 700,
    fontSize: 14,
  },
  modalClose: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 4,
    borderRadius: 999,
  },
  modalBody: {
    marginTop: 4,
    fontSize: 13,
    color: "#374151",
    display: "grid",
    gap: 6,
  },
  row: {
    display: "flex",
    gap: 8,
    alignItems: "baseline",
  },
  modalLabel: {
    fontWeight: 600,
    fontSize: 12,
    color: "#6b7280",
    minWidth: 70,
  },
  rowValue: {
    fontSize: 13,
  },
  modalRating: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  modalCommentBox: {
    marginTop: 4,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid rgba(209,213,219,.9)",
    background: "#f9fafb",
    fontSize: 13,
    color: "#374151",
  },
};
