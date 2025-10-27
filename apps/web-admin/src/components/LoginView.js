"use client";
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { apiLogin } from "@/lib/api"; // ✅ make sure you have the updated api.js from earlier

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

      // ✅ call API login (fetches real JWT and stores it)
      const data = await apiLogin({ email, password });

      // optional: store admin info for display
      localStorage.setItem(
        "lc_admin",
        JSON.stringify({ email, role: data.role || "ADMIN" })
      );

      // redirect to dashboard
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
        <h1 style={S.title}>ADMIN</h1>

        <form onSubmit={onSubmit} style={S.form}>
          {/* Email Field */}
          <div style={S.fieldWrap}>
            <div style={S.leftIcon}>
              <Mail size={16} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="username"
              style={{ ...S.input, paddingLeft: 44 }}
            />
          </div>

          {/* Password Field */}
          <div style={S.fieldWrap}>
            <div style={S.leftIcon}>
              <Lock size={16} />
            </div>
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              style={{ ...S.input, paddingLeft: 44, paddingRight: 48 }}
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

          {/* Forgot password */}
          <a href="/forgot" style={S.forgot}>
            Forgot password?
          </a>

          {/* Error message */}
          {err && <div style={S.error}>{err}</div>}

          {/* Submit button */}
          <button type="submit" disabled={loading} style={S.btn}>
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}

/* ---------- Inline Styles ---------- */
const S = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0B1220",
    color: "#fff",
    fontFamily:
      'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    background: "#0B132B",
    border: "1px solid rgba(14,107,143,0.2)",
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    padding: 32,
  },
  title: {
    textAlign: "center",
    fontWeight: 800,
    fontSize: 40,
    letterSpacing: 0.5,
    margin: "0 0 24px",
  },
  form: { display: "grid", gap: 16 },
  fieldWrap: { position: "relative" },
  input: {
    height: 52,
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(14,107,143,0.25)",
    background: "rgba(11,19,43,0.85)",
    color: "#fff",
    outline: "none",
    padding: "0 16px",
    fontSize: 15,
    transition: "border-color .2s ease, background .2s ease, box-shadow .2s",
  },
  leftIcon: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    opacity: 0.8,
    pointerEvents: "none",
  },
  eyeBtn: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    width: 36,
    height: 36,
    display: "grid",
    placeItems: "center",
    borderRadius: 8,
    border: "1px solid rgba(14,107,143,0.2)",
    background: "rgba(14,107,143,0.05)",
    color: "rgba(255,255,255,0.9)",
    cursor: "pointer",
    transition: "background .15s ease, border-color .15s ease",
  },
  forgot: {
    marginTop: -6,
    textAlign: "right",
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    textDecoration: "underline",
  },
  error: {
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.35)",
    color: "#fecaca",
    fontSize: 13,
    padding: "10px 12px",
    borderRadius: 10,
    textAlign: "center",
  },
  btn: {
    height: 50,
    width: "100%",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    background: "#0E6B8F",
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: 0.2,
    boxShadow: "0 6px 18px rgba(14,107,143,0.35)",
    transition: "transform .06s ease, filter .15s ease, box-shadow .15s ease",
  },
};

const css = `
input::placeholder { 
  color: rgba(255,255,255,0.68); 
  font-size: 15px; 
  letter-spacing: .2px; 
}
input:hover {
  border-color: rgba(14,107,143,0.45);
  background: rgba(17,24,39,0.75);
}
input:focus {
  border-color: #0E6B8F;
  background: rgba(14,107,143,0.10);
  box-shadow: 0 0 0 3px rgba(14,107,143,0.35);
}
button[aria-label="Toggle password visibility"]:hover {
  background: rgba(14,107,143,0.15);
  border-color: rgba(14,107,143,0.4);
}
button[type="submit"]:hover { 
  filter: brightness(1.04); 
  box-shadow: 0 8px 24px rgba(14,107,143,0.45); 
}
button[type="submit"]:active { transform: translateY(1px); }
button[type="submit"]:disabled { 
  opacity: .65; 
  cursor: not-allowed; 
  box-shadow: none; 
}
`;
