// apps/web-admin/src/app/(protected)/feedback/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { listFeedback } from "@/lib/api";
import { Star } from "lucide-react";
import { Poppins } from "next/font/google";

/* ---------- FONT ---------- */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function FeedbackPage() {
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState({ type: "", text: "" });

  const [feedback, setFeedback] = useState([]);
  const [search, setSearch] = useState("");

  // sort + pagination
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest" | "az" | "za"
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

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
      setPage(1);
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

  // sort (newest / oldest / A-Z / Z-A)
  const sorted = useMemo(() => {
    const arr = [...searched];

    if (sortOrder === "az" || sortOrder === "za") {
      return arr.sort((a, b) => {
        const aa = (a.authorName || "").toLowerCase();
        const bb = (b.authorName || "").toLowerCase();
        return sortOrder === "az" ? aa.localeCompare(bb) : bb.localeCompare(aa);
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
    <div className={poppins.className} style={S.page}>
      {/* Header */}
      <div>
        <h1 style={S.title}>Feedback</h1>
        <p style={S.sub}>Monitor commuter feedback and driver ratings.</p>
      </div>

      {/* Main card */}
      <section style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>Feedback list</div>

          {/* Search + sort */}
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
                <option value="az">A–Z (Author)</option>
                <option value="za">Z–A (Author)</option>
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
          <div style={S.emptyWrapper}>
            <div style={S.emptyTitle}>Loading feedback…</div>
          </div>
        ) : pageItems.length === 0 ? (
          <div style={S.emptyWrapper}>
            <div style={S.emptyTitle}>No feedback found</div>
            <div style={S.emptySub}>Try different search or sorting.</div>
          </div>
        ) : (
          <>
            <div style={S.list}>
              {pageItems.map((f) => {
                const dateText = f.createdAt
                  ? new Date(f.createdAt).toLocaleDateString()
                  : "—";

                return (
                  <article key={f.id} style={S.item}>
                    <div style={S.itemMain}>
                      {/* Header row: author only */}
                      <div style={S.itemHeaderRow}>
                        <div style={S.itemTitleRow}>
                          <span style={S.itemTitle}>
                            {f.authorName || "Unknown passenger"}
                          </span>
                        </div>
                      </div>

                      {/* 2-column info like driver card */}
                      <div style={S.infoGrid}>
                        <div>
                          <div style={S.sectionHeader}>PASSENGER</div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Name</span>
                            <span style={S.infoValue}>
                              {f.authorName || "Unknown passenger"}
                            </span>
                          </div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Date</span>
                            <span style={S.infoValue}>{dateText}</span>
                          </div>
                        </div>

                        <div>
                          <div style={S.sectionHeader}>DRIVER & RATING</div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Driver</span>
                            <span style={S.infoValue}>
                              {f.driverName || "—"}
                            </span>
                          </div>
                          <div style={S.infoRow}>
                            <span style={S.infoLabel}>Rating</span>
                            <span style={S.infoValue}>
                              <StarRating score={f.score} />
                              <span style={S.inlineScore}>
                                {f.score}/5
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Comment block */}
                      <div style={S.commentBlock}>
                        <div style={S.commentLabel}>Comment</div>
                        <div style={S.commentBox}>
                          {f.comment?.trim()
                            ? f.comment
                            : "No comment provided."}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Arrow pagination */}
            <div style={S.paginationBottom}>
              <button
                type="button"
                style={S.pageCircleBtn}
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              <span style={S.paginationLabel}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                style={S.pageCircleBtn}
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </div>
          </>
        )}
      </section>
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

/* styles – aligned with your driver/incidents cards */

const styles = {
  page: {
    display: "grid",
    gap: 16,
    maxWidth: 1120,
    margin: "0 auto",
    padding: "0 16px 24px",
  },
  title: { fontSize: 22, fontWeight: 800, margin: 0 },
  sub: { margin: "6px 0 0", color: "var(--muted)" },

  card: {
    background: "var(--card)",
    borderRadius: 24,
    border: "1px solid var(--line)",
    padding: 20,
    boxShadow: "0 20px 45px rgba(15,23,42,0.06)",
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

  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  searchWrapper: { flex: 1 },
  searchInput: {
    width: "100%",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,.45)",
    padding: "8px 12px",
    fontSize: 13,
    outline: "none",
    background: "#F9FBFF",
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

  flash: (type) => ({
    marginTop: 6,
    marginBottom: 6,
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

  emptyWrapper: {
    height: 200,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 13,
  },
  emptyTitle: { fontWeight: 600 },
  emptySub: { marginTop: 4 },

  list: {
    display: "grid",
    gap: 10,
    maxHeight: 360,
    overflowY: "auto",
    paddingRight: 4,
  },

  item: {
    border: "1px solid #E2E8F0",
    borderRadius: 24,
    padding: 20,
    background: "#FFFFFF",
    boxShadow: "0 18px 40px rgba(15,23,42,0.05)",
  },
  itemMain: { display: "grid", gap: 10 },

  itemHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  itemTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  itemTitle: { fontWeight: 800, fontSize: 16, color: "#0D658B" },

  infoGrid: {
    marginTop: 6,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 40,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.08,
    textTransform: "uppercase",
    color: "#9CA3AF",
    marginBottom: 6,
  },
  infoRow: {
    display: "flex",
    gap: 16,
    fontSize: 13,
    marginTop: 4,
  },
  infoLabel: {
    width: 110,
    color: "#6B7280",
  },
  infoValue: {
    color: "#111827",
    fontWeight: 500,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  inlineScore: {
    fontWeight: 600,
    fontSize: 12,
    color: "#4B5563",
  },

  commentBlock: {
    marginTop: 8,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#6B7280",
    marginBottom: 4,
  },
  commentBox: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(209,213,219,.9)",
    background: "#F9FAFB",
    fontSize: 13,
    color: "#374151",
  },

  // pagination bottom-right with arrows
  paginationBottom: {
    marginTop: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 14,
  },
  paginationLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: 500,
  },
  pageCircleBtn: {
    width: 30,
    height: 30,
    borderRadius: "999px",
    border: "1px solid #E5E7EB",
    background: "#FFFFFF",
    color: "#4B5563",
    cursor: "pointer",
    fontSize: 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
