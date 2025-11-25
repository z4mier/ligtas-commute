"use client";

import { Bell, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { listFeedback, listIncidents } from "@/lib/api";

/* small helper: relative time like "5 mins ago" */
function formatRelativeTime(dateInput) {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";

  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

/* helper: get initials from email (before @) */
function getInitialsFromEmail(email) {
  if (!email) return "AU";
  const [namePart = ""] = email.split("@");
  const clean = namePart.replace(/[^a-zA-Z0-9]/g, "");
  if (!clean) return "AU";
  if (clean.length === 1) return clean[0].toUpperCase();
  return (clean[0] + clean[1]).toUpperCase();
}

/* helpers: cleared notifications persisted in localStorage */
function getClearedNotifIds() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("lc_cleared_notifs");
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr);
  } catch (e) {
    console.warn("Failed to read lc_cleared_notifs:", e);
    return new Set();
  }
}

function saveClearedNotifIds(ids) {
  if (typeof window === "undefined") return;
  try {
    const current = getClearedNotifIds();
    ids.forEach((id) => current.add(id));
    localStorage.setItem("lc_cleared_notifs", JSON.stringify([...current]));
  } catch (e) {
    console.warn("Failed to write lc_cleared_notifs:", e);
  }
}

export default function Topbar() {
  const r = useRouter();

  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [user, setUser] = useState({ email: "", role: "" });

  const menuRef = useRef(null);

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lc_token");
      localStorage.removeItem("lc_user");
    }
    setUserOpen(false);
    setNotifOpen(false);
    r.replace("/login");
  }

  // load user from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("lc_user");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setUser({
        email: parsed?.email || "",
        role: parsed?.role || "",
      });
    } catch (err) {
      console.warn("Failed to read lc_user:", err);
    }
  }, []);

  // close dropdowns when clicking outside
  useEffect(() => {
    function onClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) {
        setUserOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function loadNotifications() {
    if (notifLoading) return;
    setNotifLoading(true);

    try {
      let fbItems = [];
      let incidentItems = [];

      // 1) Feedback
      try {
        const fb = await listFeedback({ limit: 10 });
        fbItems = Array.isArray(fb?.items)
          ? fb.items
          : Array.isArray(fb)
          ? fb
          : [];
      } catch (err) {
        if (err.status !== 404) {
          console.warn("Feedback notifications error:", err);
        }
      }

      // 2) Incidents
      try {
        const inc = await listIncidents({ limit: 10 });
        incidentItems = Array.isArray(inc?.items)
          ? inc.items
          : Array.isArray(inc)
          ? inc
          : [];
      } catch (err) {
        if (err.status !== 404) {
          console.warn("Incident notifications error:", err);
        }
      }

      const fbNotifs = fbItems.map((f) => ({
        id: `fb-${f.id}`,
        type: "feedback",
        title: "Feedback received",
        body: "New commuter feedback submitted",
        createdAt: f.createdAt,
        read: false,
      }));

      const incidentNotifs = incidentItems.map((i) => ({
        id: `ir-${i.id}`,
        type: "incident",
        title: "Report received",
        body: "New commuter report submitted",
        createdAt: i.createdAt,
        read: false,
      }));

      let combined = [...fbNotifs, ...incidentNotifs].sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bd - ad;
      });

      const cleared = getClearedNotifIds();
      combined = combined.filter((n) => !cleared.has(n.id));

      setNotifications(combined);
      setUnreadCount(combined.filter((n) => !n.read).length);
    } finally {
      setNotifLoading(false);
    }
  }

  // load notifications on mount
  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleBellClick() {
    const willOpen = !notifOpen;
    setNotifOpen(willOpen);
    setUserOpen(false);

    if (willOpen) {
      loadNotifications();
    }
  }

  function handleNotificationClick(n) {
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev - (n.read ? 0 : 1)));

    if (n.type === "feedback") {
      r.push("/feedback");
    } else if (n.type === "incident") {
      r.push("/incidents");
    }
    setNotifOpen(false);
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function clearAll() {
    if (!notifications.length) return;
    const ids = notifications.map((n) => n.id);
    saveClearedNotifIds(ids);
    setNotifications([]);
    setUnreadCount(0);
  }

  const hasNotifs = notifications.length > 0;

  const displayEmail = user.email || "admin@example.com";
  const displayRole =
    user.role && user.role.toUpperCase() === "ADMIN"
      ? "Administrator"
      : user.role
      ? user.role.charAt(0) + user.role.slice(1).toLowerCase()
      : "Administrator";
  const initials = getInitialsFromEmail(displayEmail);

  return (
    <>
      <style>{css}</style>
      <header className="admin-topbar" style={S.bar}>
        {/* Left brand */}
        <div style={S.left}>
          <img src="/logo.png" alt="LigtasCommute logo" style={S.logoImg} />
          <div>
            <div style={S.brandText}>LigtasCommute</div>
            <div style={S.brandSub}>Admin Portal</div>
          </div>
        </div>

        {/* Right actions */}
        <div style={S.right} ref={menuRef}>
          {/* Notification bell */}
          <button
            aria-label="Notifications"
            style={S.iconBtn}
            type="button"
            onClick={handleBellClick}
            className="admin-icon-btn"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={S.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </button>

          {/* Notifications dropdown */}
          {notifOpen && (
            <div style={S.notifMenu}>
              <div style={S.notifHeader}>
                <span style={S.notifTitle}>Notifications</span>
                {hasNotifs && (
                  <button
                    type="button"
                    style={S.markAllBtn}
                    onClick={markAllRead}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={S.notifList}>
                {notifLoading && !hasNotifs ? (
                  <div style={S.notifEmpty}>Loading…</div>
                ) : !hasNotifs ? (
                  <div style={S.notifEmpty}>No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      style={S.notifItem(!n.read)}
                      onClick={() => handleNotificationClick(n)}
                      className="admin-notif-item"
                    >
                      <div style={S.notifItemTop}>
                        <span style={S.notifItemTitle}>{n.title}</span>
                        {!n.read && <span style={S.unreadDot} />}
                      </div>
                      <div style={S.notifItemBody}>{n.body}</div>
                      <div style={S.notifItemTime}>
                        {formatRelativeTime(n.createdAt)}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <button
                type="button"
                style={S.clearBtn}
                onClick={clearAll}
                disabled={!hasNotifs}
              >
                Clear all notifications
              </button>
            </div>
          )}

          {/* User chip with email + initials */}
          <button
            type="button"
            onClick={() => {
              setUserOpen((v) => !v);
              setNotifOpen(false);
            }}
            style={S.userChip}
            className="admin-user-chip"
          >
            <div style={S.userText}>
              <span style={S.userName}>{displayEmail}</span>
              <span style={S.userRole}>{displayRole}</span>
            </div>
            <div style={S.initialCircle}>{initials}</div>
          </button>

          {userOpen && (
            <div style={S.menu}>
              <button
                type="button"
                onClick={handleLogout}
                style={S.menuItem}
                className="admin-menu-item"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
}

const S = {
  bar: {
    height: 64,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#FFFFFF",
    borderBottom: "1px solid #E5E7EB",
    padding: "0 24px",
    position: "sticky",
    top: 0,
    zIndex: 30,
    boxShadow: "0 6px 16px rgba(15,23,42,0.06)",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoImg: {
    height: 40,
    width: 40,
    borderRadius: 12,
    objectFit: "cover",
  },
  brandText: {
    fontWeight: 700,
    fontSize: 18,
    color: "#0D658B",
    letterSpacing: 0.2,
  },
  brandSub: {
    fontSize: 12,
    color: "#6B7280",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    position: "relative",
  },
  iconBtn: {
    position: "relative",
    height: 36,
    width: 36,
    display: "grid",
    placeItems: "center",
    background: "#F3F4F6",
    border: "1px solid #E5E7EB",
    borderRadius: "999px",
    color: "#4B5563",
    cursor: "pointer",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    background: "#EF4444",
    color: "#FFF",
    fontSize: 10,
    display: "grid",
    placeItems: "center",
    padding: "0 4px",
    fontWeight: 700,
  },
  userChip: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 10px 6px 12px",
    background: "#FFFFFF",
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    cursor: "pointer",
  },
  userText: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
  },
  userRole: {
    fontSize: 11,
    color: "#6B7280",
  },
  initialCircle: {
    height: 28,
    width: 28,
    borderRadius: "999px",
    background: "#0D658B",
    color: "#FFFFFF",
    display: "grid",
    placeItems: "center",
    fontSize: 12,
    fontWeight: 700,
  },
  menu: {
    position: "absolute",
    right: 0,
    top: 52,
    background: "#FFFFFF",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
    padding: 6,
    minWidth: 140,
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    width: "100%",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    fontSize: 13,
    color: "#DC2626",
    cursor: "pointer",
  },

  /* notif dropdown */
  notifMenu: {
    position: "absolute",
    right: 64,
    top: 52,
    width: 260,
    background: "#FFFFFF",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    boxShadow: "0 16px 40px rgba(15,23,42,0.15)",
    display: "flex",
    flexDirection: "column",
    maxHeight: 360,
  },
  notifHeader: {
    padding: "8px 10px 4px",
    borderBottom: "1px solid #E5E7EB",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: 600,
  },
  markAllBtn: {
    border: "none",
    background: "transparent",
    fontSize: 11,
    color: "#0D658B",
    cursor: "pointer",
  },
  notifList: {
    padding: "4px 0",
    overflowY: "auto",
    flex: 1,
  },
  notifEmpty: {
    padding: "12px 10px",
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
  notifItem: (unread) => ({
    width: "100%",
    textAlign: "left",
    border: "none",
    background: unread ? "rgba(219, 234, 254, 0.6)" : "#FFFFFF",
    padding: "8px 10px",
    cursor: "pointer",
    borderBottom: "1px solid #E5E7EB",
  }),
  notifItemTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  notifItemTitle: {
    fontSize: 12,
    fontWeight: 600,
  },
  notifItemBody: {
    fontSize: 12,
    color: "#4B5563",
  },
  notifItemTime: {
    marginTop: 2,
    fontSize: 11,
    color: "#9CA3AF",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#0EA5E9",
  },
  clearBtn: {
    borderTop: "1px solid #E5E7EB",
    padding: "6px 10px",
    fontSize: 12,
    background: "#F9FAFB",
    borderRadius: "0 0 12px 12px",
    border: "none",
    cursor: "pointer",
    color: "#4B5563",
  },
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

.admin-topbar {
  font-family: 'Poppins', system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Hover states */
.admin-icon-btn {
  transition: background 140ms ease, border-color 140ms ease, transform 120ms ease, box-shadow 120ms ease;
}
.admin-icon-btn:hover {
  background: #E5F0FF;
  border-color: #C7DDFF;
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.18);
  transform: translateY(-1px);
}

.admin-user-chip {
  transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease, transform 120ms ease;
}
.admin-user-chip:hover {
  border-color: #D0E2FF;
  background: #F9FBFF;
  box-shadow: 0 8px 20px rgba(15,23,42,0.06);
  transform: translateY(-1px);
}

.admin-menu-item {
  transition: background 120ms ease, color 120ms ease;
}
.admin-menu-item:hover {
  background: #FEF2F2;
  color: #B91C1C;
}

/* Notification item hover */
.admin-notif-item {
  transition: background 120ms ease;
}
.admin-notif-item:hover {
  background: #E5F0FF;
}
`;
