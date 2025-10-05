"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../../components/AdminSidebar"; // ✅ correct path from (admin)/layout.js

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export default function AdminLayout({ children }) {
  const router = useRouter();

  useEffect(() => {
    const t = getToken();
    if (!t) router.replace("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen bg-[#E9F1FA] text-[#0B1526]">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main content area */}
      <main className="flex-1 ml-64 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
