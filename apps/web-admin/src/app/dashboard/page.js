"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export default function AdminDashboard() {
  const router = useRouter();

  // --- auth gate ---
  const [checked, setChecked] = useState(false); // we finished checking
  const [authed, setAuthed] = useState(false);   // there IS a token

  // --- form state ---
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    licenseNo: "",
  });
  const [msg, setMsg] = useState("");
  const [created, setCreated] = useState(null);

  // Protect route (don’t render until we know)
  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/login");
      return;
    }
    setAuthed(true);
    setChecked(true);
  }, [router]);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function createDriver(e) {
    e.preventDefault();
    setMsg("Creating driver...");
    setCreated(null);

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/create-driver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      // Try to parse JSON even on error for a helpful message
      let data = null;
      try { data = await res.json(); } catch {}

      if (!res.ok) {
        // If auth error, force logout
        if (res.status === 401 || res.status === 403) {
          logout(true);
          return;
        }
        throw new Error(data?.message || `Request failed (HTTP ${res.status})`);
      }

      setCreated(data);
      setMsg("✅ Driver created (default password: driver123)");
      setForm({ fullName: "", email: "", phone: "", licenseNo: "" });
    } catch (err) {
      setMsg("❌ " + (err instanceof Error ? err.message : String(err)));
    }
  }

  function logout(silent = false) {
    // clear localStorage + cookie (if you set it on login)
    try {
      localStorage.removeItem("token");
      document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
    } catch {}
    if (!silent) setMsg("Logged out");
    router.replace("/login");
  }

  // ---- styles (same palette as login) ----
  const card = { maxWidth: 560, margin: "24px auto", padding: 16, background: "#14243A", borderRadius: 12 };
  const label = { color: "#cdd9e3", fontSize: 13, marginBottom: 6, display: "block" };
  const input = {
    width: "100%", height: 42, borderRadius: 10, border: "1px solid #2a3b52",
    background: "#0f1b2b", color: "#eaf2f8", padding: "0 12px", marginBottom: 8,
  };
  const btn = { height: 42, borderRadius: 10, border: 0, background: "#1e6f9f", color: "white", cursor: "pointer" };

  // --- gate the render ---
  if (!checked) {
    return (
      <main style={{ minHeight: "100vh", background: "#0f1b2b", color: "#eaf2f8",
                     display: "grid", placeItems: "center" }}>
        Checking…
      </main>
    );
  }
  if (!authed) return null; // we’re redirecting

  // ---- actual dashboard ----
  return (
    <main style={{ minHeight: "100vh", background: "#0f1b2b", color: "#eaf2f8", padding: 24 }}>
      <header style={{ maxWidth: 960, margin: "0 auto", display: "flex",
                       justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
        <button onClick={() => logout(false)} style={{ ...btn, width: 110, background: "#314a60" }}>
          Logout
        </button>
      </header>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Create Driver</h2>
        <form onSubmit={createDriver} style={{ display: "grid", gap: 8 }}>
          <label style={label}>Full name</label>
          <input
            required style={input} value={form.fullName}
            onChange={(e)=>setField("fullName", e.target.value)}
            placeholder="John Doe"
          />

          <label style={label}>Email</label>
          <input
            required type="email" style={input} value={form.email}
            onChange={(e)=>setField("email", e.target.value)}
            placeholder="driver@email.com"
          />

          <label style={label}>Phone</label>
          <input
            required style={input} value={form.phone}
            onChange={(e)=>setField("phone", e.target.value)}
            placeholder="09xxxxxxxxx"
          />

          <label style={label}>License No</label>
          <input
            required style={input} value={form.licenseNo}
            onChange={(e)=>setField("licenseNo", e.target.value)}
            placeholder="ABC-1234-5678"
          />

          <button type="submit" style={btn}>Create Driver</button>
        </form>

        <p style={{ marginTop: 10 }}>{msg}</p>

        {created && (
          <div style={{ marginTop: 12, border: "1px solid #2a3b52", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Driver Created</h3>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(created, null, 2)}</pre>
          </div>
        )}
      </section>
    </main>
  );
}
