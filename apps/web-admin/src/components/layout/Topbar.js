"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, LogOut, User } from "lucide-react";
import { useAuth } from "@/store/auth";

export default function Topbar() {
  const { logout } = useAuth();

  /* ---------------- Fetch admin data ---------------- */
  const [admin, setAdmin] = useState(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API ||
    "http://localhost:4000";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("lc_token") : null;
        const res = await fetch(`${API_URL}/admins/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch admin");
        const data = await res.json();
        if (alive) setAdmin(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoadingAdmin(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [API_URL]);

  const adminName = admin?.fullName || "Admin User";
  const adminRole = "Administrator";

  /* ---------------- Notifications ---------------- */
  const [openNotif, setOpenNotif] = useState(false);
  const [items, setItems] = useState(DUMMY_NOTIFS);
  const notifRef = useRef(null);

  /* ---------------- Profile dropdown ---------------- */
  const [openProfile, setOpenProfile] = useState(false);
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside or pressing ESC
  useEffect(() => {
    function onClick(e) {
      if (openNotif && notifRef.current && !notifRef.current.contains(e.target))
        setOpenNotif(false);
      if (openProfile && profileRef.current && !profileRef.current.contains(e.target))
        setOpenProfile(false);
    }
    function onKey(e) {
      if (e.key === "Escape") {
        setOpenNotif(false);
        setOpenProfile(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openNotif, openProfile]);

  const unread = items.filter((i) => !i.read).length;

  function markAllRead() {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  }
  function clearAll() {
    setItems([]);
  }

  // Generate initials from admin name
  const initials = adminName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-[#e5edf2] bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 px-6 flex items-center justify-end shadow-sm">
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            aria-label="Notifications"
            onClick={() => setOpenNotif((v) => !v)}
            className="relative grid place-items-center h-10 w-10 rounded-full hover:bg-[#f4f7fa] transition"
          >
            <Bell size={20} className="text-[#0D658B]" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid place-items-center h-4 min-w-4 px-[2px] rounded-full bg-red-500 text-white text-[10px] leading-none">
                {unread}
              </span>
            )}
          </button>

          {openNotif && (
            <div className="absolute right-0 mt-2 w-[340px] rounded-xl border border-[#e5edf2] bg-white shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#eef3f6]">
                <div className="font-semibold text-[15px] text-[#101929]">
                  Notifications
                </div>
                <button
                  onClick={markAllRead}
                  className="text-xs text-[#64748b] hover:text-[#0D658B] inline-flex items-center gap-1"
                >
                  <Check size={14} /> Mark all read
                </button>
              </div>

              <div className="max-h-72 overflow-auto">
                {items.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-[#64748b] text-center">
                    No notifications
                  </div>
                ) : (
                  items.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 text-sm border-b border-[#f1f5f9] last:border-0 ${
                        n.type === "incident"
                          ? "bg-[#e8f4f8]/60"
                          : "bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <span className="inline-block h-2 w-2 rounded-full bg-[#1e90ff]" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-[#0b1220]">
                            {n.title}
                          </div>
                          <div className="text-[#334155]">{n.message}</div>
                          <div className="text-[12px] text-[#8594a6] mt-1">
                            {n.timeAgo}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-3 border-t border-[#eef3f6]">
                <button
                  onClick={clearAll}
                  className="w-full h-9 rounded-md border border-[#e5edf2] text-[13px] text-[#0b1220] hover:bg-[#f7fafc]"
                >
                  Clear all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin info + initials button */}
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight min-w-[120px]">
            <div className="text-[14px] font-semibold text-[#0b1220]">
              {loadingAdmin ? "Loading..." : adminName}
            </div>
            <div className="text-[12px] text-[#64748b]">{adminRole}</div>
          </div>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setOpenProfile((v) => !v)}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-[#0D658B] text-white font-semibold text-[15px] hover:bg-[#0a5573] transition"
              aria-label="Open profile menu"
            >
              {initials}
            </button>

            {openProfile && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-[#e5edf2] shadow-xl rounded-lg overflow-hidden">
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#101929] hover:bg-[#f4f7fa]"
                  onClick={() => setOpenProfile(false)}
                >
                  <User size={16} /> Profile
                </Link>
                <button
                  onClick={() => {
                    setOpenProfile(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-[#fbeaea]"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/* --------- Dummy notifications --------- */
const DUMMY_NOTIFS = [
  {
    id: "n1",
    type: "feedback",
    title: "Feedback Received",
    message: "New commuter feedback submitted",
    timeAgo: "5 mins ago",
    read: false,
  },
  {
    id: "n2",
    type: "incident",
    title: "Incident Report",
    message: "A new incident has been reported on Route 15",
    timeAgo: "1 hour ago",
    read: false,
  },
  {
    id: "n3",
    type: "feedback",
    title: "Feedback Received",
    message: "New commuter feedback submitted",
    timeAgo: "1 hour ago",
    read: true,
  },
  {
    id: "n4",
    type: "feedback",
    title: "Feedback Received",
    message: "New commuter feedback submitted",
    timeAgo: "2 hours ago",
    read: true,
  },
];
