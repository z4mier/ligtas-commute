"use client";
import React, { useState } from "react";
import styles from "./driver.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export default function DriverRegistrationPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    licenseNo: "",
    birthDate: "",        // yyyy-mm-dd
    address: "",
    vehicleType: "AIRCON", // default option
    busNo: "",
    vehiclePlate: "",
    driverIdNo: "",
    route: "",
  });

  const [msg, setMsg] = useState("");
  const [created, setCreated] = useState(null);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function createDriver(e) {
    e.preventDefault();
    setMsg("Creating driver...");
    setCreated(null);

    const token = getToken();
    if (!token) {
      window.location.href = "/login";
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

      let data = null;
      try { data = await res.json(); } catch {}

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }
        throw new Error(data?.message || `Request failed (HTTP ${res.status})`);
      }

      setCreated(data);
      setMsg("✅ Driver created (default password: driver123)");
      setForm({
        fullName: "", email: "", phone: "", licenseNo: "",
        birthDate: "", address: "", vehicleType: "AIRCON",
        busNo: "", vehiclePlate: "", driverIdNo: "", route: "",
      });
    } catch (err) {
      setMsg("❌ " + (err instanceof Error ? err.message : String(err)));
    }
  }

  return (
    <section className={styles.panel}>
      <h2 className={styles.h2}>Driver Management</h2>
      <p className={styles.subtle}>Register new drivers and manage applications.</p>

      <div className={styles.tabs}>
        <button className={styles.tab} disabled>Informations</button>
        <button className={`${styles.tab} ${styles.tabActive}`}>Register Driver</button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <div className={styles.cardIcon}>➕</div>
          <h3 className={styles.h3}>Register New Driver</h3>
        </div>

        <form className={styles.formGrid} onSubmit={createDriver}>
          {/* Row 1 */}
          <FormField label="Full Name">
            <input className={styles.input} placeholder="Pedro Garcia"
                   value={form.fullName} onChange={(e)=>setField("fullName", e.target.value)} />
          </FormField>
          <FormField label="Phone Number">
            <input className={styles.input} placeholder="+63 9xx xxx xxxx"
                   value={form.phone} onChange={(e)=>setField("phone", e.target.value)} />
          </FormField>

          {/* Row 2 */}
          <FormField label="Email">
            <input className={styles.input} type="email" placeholder="pedro@gmail.com"
                   value={form.email} onChange={(e)=>setField("email", e.target.value)} />
          </FormField>
          <FormField label="Driver’s License Number">
            <input className={styles.input} placeholder="DL115823798"
                   value={form.licenseNo} onChange={(e)=>setField("licenseNo", e.target.value)} />
          </FormField>

          {/* Row 3 */}
          <FormField label="Birth Date">
            <input className={styles.input} type="date"
                   value={form.birthDate} onChange={(e)=>setField("birthDate", e.target.value)} />
          </FormField>
          <FormField label="Address">
            <input className={styles.input} placeholder="Cebu City"
                   value={form.address} onChange={(e)=>setField("address", e.target.value)} />
          </FormField>

          {/* Row 4 */}
          <FormField label="Vehicle Type">
            <select className={styles.input}
                    value={form.vehicleType}
                    onChange={(e)=>setField("vehicleType", e.target.value)}>
              <option value="AIRCON">Aircon</option>
              <option value="NON_AIRCON">Non-Aircon</option>
            </select>
          </FormField>
          <FormField label="Bus Number">
            <input className={styles.input} placeholder="Bus 123"
                   value={form.busNo} onChange={(e)=>setField("busNo", e.target.value)} />
          </FormField>

          {/* Row 5 */}
          <FormField label="Plate Number">
            <input className={styles.input} placeholder="ABC-1234"
                   value={form.vehiclePlate} onChange={(e)=>setField("vehiclePlate", e.target.value)} />
          </FormField>
          <FormField label="Driver ID No">
            <input className={styles.input} placeholder="DR-001234"
                   value={form.driverIdNo} onChange={(e)=>setField("driverIdNo", e.target.value)} />
          </FormField>

          {/* Row 6 */}
          <FormField label="Route" full>
            <input className={styles.input} placeholder="Minglanilla ↔ IT Park"
                   value={form.route} onChange={(e)=>setField("route", e.target.value)} />
          </FormField>

          <div className={styles.fullRow}>
            <button className={styles.primaryBtn}>Register Driver &amp; Generate QR Code</button>
          </div>
        </form>

        {msg && <p className={styles.statusMsg}>{msg}</p>}
        {created && (
          <div className={styles.resultBox}>
            <h4>Driver Created</h4>
            <pre>{JSON.stringify(created, null, 2)}</pre>
          </div>
        )}
      </div>
    </section>
  );
}

function FormField({ label, full = false, children }) {
  return (
    <label className={`${styles.field} ${full ? styles.fullRow : ""}`}>
      <span className={styles.labelTxt}>{label}</span>
      {children}
    </label>
  );
}
