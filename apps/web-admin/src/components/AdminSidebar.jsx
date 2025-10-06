"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BusFront,
  MessageSquare,
  AlertTriangle,
  Settings,
  LogOut,
} from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    localStorage.removeItem("token");
    document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
    router.replace("/login");
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-[#C7D8E6] flex flex-col">
      {/* --- Brand --- */}
      <div className="flex items-center gap-3 p-5 border-b border-[#C7D8E6] bg-[#E9F1FA]">
        <div className="h-11 w-11 grid place-items-center rounded-2xl bg-[#00ABE4] text-white shadow-sm">
          <BusFront className="w-6 h-6" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-semibold tracking-wide text-[#0B1526]">
            <span className="text-[#00ABE4]">Ligtas</span>
            <span className="text-[#0B1526]">Commute</span>
          </span>
          <span className="text-xs text-[#4A5A6B] font-medium tracking-wide">
            Admin Panel
          </span>
        </div>
      </div>

      {/* --- Navigation --- */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavItem
          href="/admin/dashboard"
          icon={<LayoutDashboard size={18} />}
          label="Dashboard"
          active={pathname === "/admin/dashboard"}
        />
        <NavItem
          href="/admin/driver-registration"
          icon={<BusFront size={18} />}
          label="Driver Registration"
          active={pathname === "/admin/driver-registration"}
        />
        <NavItem
          href="/admin/user-feedback"
          icon={<MessageSquare size={18} />}
          label="User Feedback"
          active={pathname === "/admin/user-feedback"}
        />
        <NavItem
          href="/admin/incident-reports"
          icon={<AlertTriangle size={18} />}
          label="Incident Reports"
          active={pathname === "/admin/incident-reports"}
        />
        <NavItem
          href="/admin/settings"
          icon={<Settings size={18} />}
          label="Settings"
          active={pathname === "/admin/settings"}
        />
      </nav>

      {/* --- Logout Button --- */}
      <div className="p-4 border-t border-[#C7D8E6]">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-[#FFE9E9] hover:bg-[#FFDCDC] text-[#B42318] font-medium py-2 px-4 rounded-lg transition"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}

/* ---------- Reusable NavItem ---------- */
function NavItem({ href, icon, label, active }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 border ${
        active
          ? "bg-[#F3F9FF] text-[#00ABE4] border-[#B9E6FA]"
          : "text-[#405266] border-transparent hover:bg-[#F6FAFE] hover:text-[#0B1526]"
      }`}
    >
      <div
        className={`${
          active ? "text-[#00ABE4]" : "text-[#5D6E80]"
        } flex items-center justify-center w-5`}
      >
        {icon}
      </div>
      <span className="truncate">{label}</span>
    </Link>
  );
}
