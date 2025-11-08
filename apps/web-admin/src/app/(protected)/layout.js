"use client";
import RequireAdmin from "@/lib/guards";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function ProtectedLayout({ children }) {
  return (
    <RequireAdmin>
      {/* App shell */}
      <div className="flex min-h-[100dvh] bg-[#F7FAFC]">
        {/* sticky sidebar */}
        <Sidebar />

        {/* main column */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* sticky topbar */}
          <Topbar />

          {/* scrollable page content */}
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </RequireAdmin>
  );
}
