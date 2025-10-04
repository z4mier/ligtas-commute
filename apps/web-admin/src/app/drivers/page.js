"use client";
import { useEffect, useState } from "react";
import { postWithAuth } from "../../lib/api";

export default function DriversPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    licenseNo: ""
  });
  const [msg, setMsg] = useState("");
  const [created, setCreated] = useState(null);

  // Redirect to /login if no token
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) window.location.href = "/login";
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("Creating driver...");
    setCreated(null);
    try {
      const data = await postWithAuth("/admin/create-driver", form);
      setCreated(data);
      setMsg("✅ Driver created");
      setForm({ fullName: "", email: "", phone: "", licenseNo: "" });
    } catch (err) {
      setMsg("❌ " + err.message);
    }
  }

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Create Driver</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, marginTop: 16 }}>
        <input required placeholder="Full name"  value={form.fullName}  onChange={(e)=>set("fullName", e.target.value)} />
        <input required placeholder="Email"      value={form.email}     onChange={(e)=>set("email", e.target.value)} />
        <input required placeholder="Phone"      value={form.phone}     onChange={(e)=>set("phone", e.target.value)} />
        <input required placeholder="License No" value={form.licenseNo} onChange={(e)=>set("licenseNo", e.target.value)} />
        <button type="submit" style={{ padding: 10 }}>Create driver</button>
      </form>

      <p style={{ marginTop: 12 }}>{msg}</p>

      {created && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd" }}>
          <h3>Driver Created</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(created, null, 2)}</pre>
          {created.qrToken && <p><b>QR Token:</b> {created.qrToken}</p>}
        </div>
      )}
    </main>
  );
}
