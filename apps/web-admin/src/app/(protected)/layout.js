// src/app/(protected)/layout.js
"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function ProtectedLayout({ children }) {
  const r = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;

    const token =
      typeof window !== "undefined" && localStorage.getItem("lc_token");
    if (!token) {
      const next = encodeURIComponent(path || "/dashboard");
      r.replace(`/login?next=${next}`);
      return;
    }
    setReady(true);
  }, [r, path]);

  if (!ready) return null;

  return (
    // Topbar full width; sidebar + content below
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <Topbar />

      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, padding: "20px 24px" }}>{children}</main>
      </div>
    </div>
  );
}
