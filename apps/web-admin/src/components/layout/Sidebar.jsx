"use client";
import Link from "next/link";
import {
  LayoutDashboard,
  FileUser,
  BusFront,
  MessageSquare,
  TriangleAlert,
  Settings,
} from "lucide-react";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/drivers", label: "Driver Registration", icon: FileUser },
  { href: "/buses", label: "Bus Registration", icon: BusFront },
  { href: "/incidents", label: "Incident Reports", icon: TriangleAlert },
  { href: "/feedback", label: "User Feedback", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside style={S.aside}>
      <nav style={S.nav}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              style={{ ...S.item, ...(active ? S.active : {}) }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

const S = {
  aside: {
    width: 250,
    background: "#F9FAFB", // light gray like in Figma
    borderRight: "1px solid #E5E7EB",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    position: "sticky",
    top: 64,
    height: "calc(100vh - 64px)",
  },
  nav: {
    display: "grid",
    gap: 4, // tighter gap
    marginTop: 4,
    paddingTop: 4,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 14px", // smaller vertical padding
    borderRadius: 16,
    textDecoration: "none",
    color: "#4B5563", // gray-700 like Figma sidebar labels
    border: "1px solid transparent",
    background: "transparent",
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
  },
  active: {
    background: "#E4F1FF", // soft blue highlight
    border: "1px solid #D0E2FF",
    color: "#0D658B", // brand blue for active text
  },
};
