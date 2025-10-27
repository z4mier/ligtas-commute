// src/components/layout/Topbar.jsx
"use client";
import { Bell } from "lucide-react";

export default function Topbar(){
  return (
    <header style={S.bar}>
      <div style={S.brand}>ADMIN</div>
      <button aria-label="Notifications" style={S.iconBtn}>
        <Bell size={18}/>
      </button>
    </header>
  );
}

const S = {
  bar: {
    height: 64,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "var(--card)",
    borderBottom: "1px solid var(--line)",
    padding: "0 20px",
    position: "sticky",
    top: 0,
    zIndex: 50,            // ensure it stays above content/scroll
  },
  brand: { fontWeight: 800, letterSpacing: .6, fontSize: 18 },
  iconBtn: {
    height: 36, width: 36, display: "grid", placeItems: "center",
    background: "rgba(14,107,143,.08)", border: "1px solid var(--line)",
    borderRadius: 10, color: "var(--text)", cursor: "pointer"
  }
};
