"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./AdminLoginPage.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function AdminSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Use useEffect directly (not React.useEffect)
  useEffect(() => {
    // Force sign-out whenever /login is opened
    try {
      localStorage.removeItem("token");
      document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
    } catch {}
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    if (!email.trim() || !pw) {
      setMsg("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: pw,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) throw new Error(data?.message || `Login failed (HTTP ${res.status})`);
      if (data.role !== "ADMIN") throw new Error("This account is not an admin.");

      localStorage.setItem("token", data.token);
      document.cookie = `token=${data.token}; Path=/; Max-Age=604800; SameSite=Lax`;
      router.replace("/dashboard");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.screen}>
      <div className={styles.wrap}>
        <h1 className={styles.title}>ADMIN</h1>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.field}>
            <input
              className={styles.input}
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className={styles.field}>
            <input
              className={styles.input}
              placeholder="Password"
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              aria-label={show ? "Hide password" : "Show password"}
              className={styles.eye}
              onClick={() => setShow((s) => !s)}
              tabIndex={-1}
            >
              {show ? "🙈" : "👁️"}
            </button>
          </div>

          <div className={styles.forgot}>
            <button
              type="button"
              className={styles.forgotBtn}
              onClick={() => alert("Forgot password flow coming soon.")}
            >
              Forgot password?
            </button>
          </div>

          {msg && <p className={styles.error}>{msg}</p>}

          <button className={styles.cta} disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}
