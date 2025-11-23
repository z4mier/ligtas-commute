// apps/web-admin/src/app/login/page.jsx (or wherever your LoginView lives)
"use client";
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { apiLogin } from "@/lib/api";

export default function LoginView() {
  const r = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";

  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (!email || !password) throw new Error("Please fill in all fields.");

      const data = await apiLogin({ email, password });

      localStorage.setItem(
        "lc_admin",
        JSON.stringify({ email, role: data.role || "ADMIN" })
      );

      r.replace(next);
    } catch (ex) {
      console.error("Login failed:", ex);
      setErr(ex.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={S.page}>
      <style>{css}</style>
      <div style={S.card}>
        {/* Brand line */}
        <div style={S.brandRow}>
          <span style={S.brandMain}>Ligtas</span>
          <span style={S.brandAccent}>Commute</span>
          <span style={S.brandSub}>Admin</span>
        </div>

        {/* Heading */}
        <h1 style={S.heading}>Welcome back</h1>
        <p style={S.sub}>
          Sign in with your admin account to manage drivers &amp; reports.
        </p>

        <form onSubmit={onSubmit} style={S.form} noValidate>
          {/* Email / Phone */}
          <div style={S.field}>
            <label style={S.label}>Email or Phone</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ligtascommute.com"
              autoComplete="username"
              style={S.input}
            />
          </div>

          {/* Password */}
          <div style={S.field}>
            <label style={S.label}>Password</label>
            <div style={S.passwordWrap}>
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ ...S.input, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label="Toggle password visibility"
                style={S.eyeBtn}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {err && <div style={S.error}>{err}</div>}

          {/* Login button */}
          <button type="submit" disabled={loading} style={S.btn}>
            {loading ? "Logging in…" : "Login"}
          </button>

          {/* Forgot password */}
          <button
            type="button"
            onClick={() => r.push("/forgot")}
            style={S.forgot}
          >
            Forgot password?
          </button>
        </form>
      </div>
    </main>
  );
}

/* ---- Styles to match the light card layout ---- */

const S = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#EDF3FA",
    fontFamily:
      'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    background: "#FFFFFF",
    borderRadius: 24,
    border: "1px solid #E2E8F0",
    boxShadow: "0 24px 60px rgba(15,23,42,0.08)",
    padding: 32,
  },
  brandRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 4,
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 18,
  },
  brandMain: {
    color: "#0D658B",
  },
  brandAccent: {
    color: "#0D658B",
  },
  brandSub: {
    fontWeight: 500,
    color: "#6B7280",
    marginLeft: 4,
  },
  heading: {
    fontSize: 26,
    fontWeight: 800,
    margin: "0 0 4px",
    color: "#111827",
  },
  sub: {
    margin: "0 0 20px",
    fontSize: 13,
    color: "#6B7280",
  },
  form: {
    display: "grid",
    gap: 16,
  },
  field: {
    display: "grid",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#4B5563",
  },
  input: {
    height: 44,
    width: "100%",
    borderRadius: 10,
    border: "1px solid #D4DCEB",
    background: "#F3F6FD",
    padding: "0 12px",
    fontSize: 14,
    color: "#111827",
    outline: "none",
  },
  passwordWrap: {
    position: "relative",
  },
  eyeBtn: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    width: 32,
    height: 32,
    display: "grid",
    placeItems: "center",
    borderRadius: 999,
    border: "none",
    background: "transparent",
    color: "#6B7280",
    cursor: "pointer",
  },
  error: {
    background: "#FEF2F2",
    border: "1px solid #FCA5A5",
    color: "#B91C1C",
    fontSize: 13,
    padding: "8px 10px",
    borderRadius: 10,
    textAlign: "center",
  },
  btn: {
    marginTop: 4,
    height: 44,
    width: "100%",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background: "#0D658B",
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  forgot: {
    marginTop: 4,
    border: "none",
    background: "transparent",
    padding: 0,
    fontSize: 12,
    color: "#6B7280",
    cursor: "pointer",
    textDecoration: "underline",
    alignSelf: "flex-start",
  },
};

const css = `
input::placeholder {
  color: #9CA3AF;
}
input:hover {
  border-color: #C2CBE2;
}
input:focus {
  border-color: #0D658B;
  background: #FFFFFF;
  box-shadow: 0 0 0 1px rgba(13,101,139,0.15);
}
button[type="submit"]:hover:not(:disabled) {
  filter: brightness(1.03);
}
button[type="submit"]:active:not(:disabled) {
  transform: translateY(1px);
}
button[type="submit"]:disabled {
  opacity: .7;
  cursor: not-allowed;
}
`;
