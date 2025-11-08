"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileWarning, MessageSquare, Settings } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/reports", label: "Incident Reports", icon: FileWarning },
  { href: "/feedbacks", label: "Feedback", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="sticky top-0 h-[100dvh] w-64 shrink-0 overflow-y-auto border-r border-[#e5edf2] bg-gradient-to-b from-white to-[#f9fbfc] shadow-sm">
      {/* ---------- Brand Section ---------- */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-[#e5edf2]">
        <Image
          src="/logo.jpeg"
          alt="LigtasCommute Logo"
          width={36}
          height={36}
          className="rounded-md object-cover"
          priority
        />
        <div>
          <div className="text-[#0D658B] font-extrabold text-xl tracking-tight">
            LigtasCommute
          </div>
          <p className="text-xs text-[#757575]">Admin Portal</p>
        </div>
      </div>

      {/* ---------- Navigation Links ---------- */}
      <nav className="mt-5 px-3 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-[15px] transition
                ${
                  active
                    ? "bg-[#e8f4f8] text-[#0D658B] font-semibold shadow-inner"
                    : "text-[#101929] hover:bg-[#f3f8fa] hover:text-[#0D658B]"
                }`}
            >
              <Icon
                size={18}
                className={active ? "text-[#0D658B]" : "text-[#757575]"}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ---------- Footer ---------- */}
      <div className="px-6 py-5 mt-6 border-t border-[#e5edf2] text-[11px] text-[#757575]">
        © {new Date().getFullYear()} LigtasCommute
      </div>
    </aside>
  );
}
