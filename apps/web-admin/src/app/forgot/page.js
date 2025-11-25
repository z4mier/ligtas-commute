// apps/web-admin/src/app/forgot/page.js (or wherever this file lives)
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API ||
  "http://localhost:4000";

export default function ForgotPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setInfo("");
    const trimmed = email.trim();

    if (!trimmed) {
      setErr("Please enter your admin email.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message || "Unable to send reset code. Please try again."
        );
      }

      setInfo(
        `We sent a 6-digit reset code to ${trimmed}. You’ll be redirected to enter the code.`
      );

      setTimeout(() => {
        r.push(`/reset-password?email=${encodeURIComponent(trimmed)}`);
      }, 1500);
    } catch (ex) {
      console.error("Forgot password failed:", ex);
      setErr(ex.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={S.page}>
      <style>{css}</style>
      <div style={S.cardWrap}>
        <div style={S.card}>
          {/* Brand line – same as LoginView */}
          <div style={S.brandRow}>
            <span style={S.brandMain}>LigtasCommute</span>
            <span style={S.brandDot}>•</span>
            <span style={S.brandSub}>Admin</span>
          </div>

          {/* Heading + copy */}
          <h1 style={S.heading}>Forgot password</h1>
          <p style={S.sub}>
            Enter the admin email linked to your account. We’ll send a 6-digit
            code so you can reset your password.
          </p>

          {info && <div style={S.info}>{info}</div>}
          {err && <div style={S.error}>{err}</div>}

          <form style={S.form} onSubmit={onSubmit} noValidate>
            <div style={S.field}>
              <label style={S.label}>Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                style={S.input}
              />
            </div>

            <button type="submit" disabled={loading} style={S.btn}>
              {loading ? "Sending code…" : "Send reset code"}
            </button>

            <button
              type="button"
              onClick={() => r.push("/login")}
              style={S.forgot}
            >
              Back to login
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

/* ---- Same style system as LoginView ---- */

const S = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    background:
      "radial-gradient(circle at top left, #F3F6FD 0, #E7F0FA 36%, #E4EDF8 100%)",
    fontFamily:
      'Poppins, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  cardWrap: {
    width: "100%",
    maxWidth: 480,
  },
  card: {
    width: "100%",
    background: "#FFFFFF",
    borderRadius: 28,
    border: "1px solid #E2E8F0",
    boxShadow:
      "0 22px 60px rgba(15,23,42,0.06), 0 2px 8px rgba(15,23,42,0.03)",
    padding: "32px 32px 28px",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 16,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "#6B7280",
  },
  brandMain: {
    color: "#0D658B",
    fontWeight: 700,
  },
  brandDot: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  brandSub: {
    fontWeight: 500,
    color: "#6B7280",
  },
  heading: {
    fontSize: 24,
    fontWeight: 800,
    margin: "0 0 6px",
    color: "#0F172A",
    letterSpacing: 0.1,
  },
  sub: {
    margin: "0 0 20px",
    fontSize: 13,
    lineHeight: 1.6,
    color: "#6B7280",
  },
  form: {
    display: "grid",
    gap: 16,
    marginTop: 4,
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
    height: 46,
    width: "100%",
    borderRadius: 12,
    border: "1px solid #D4DCEB",
    background: "#F5F7FC",
    padding: "0 14px",
    fontSize: 14,
    color: "#111827",
    outline: "none",
    transition:
      "border-color 120ms ease, box-shadow 120ms ease, background 120ms ease",
  },
  btn: {
    marginTop: 4,
    height: 46,
    width: "100%",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background:
      "linear-gradient(135deg, #0D658B 0%, #075575 50%, #0D658B 100%)",
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: 0.3,
    boxShadow: "0 14px 30px rgba(13,101,139,0.35)",
    transition:
      "transform 120ms ease, box-shadow 120ms ease, filter 120ms ease, opacity 120ms ease",
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
    alignSelf: "center",
  },
  error: {
    background: "#FEF2F2",
    border: "1px solid #FCA5A5",
    color: "#B91C1C",
    fontSize: 13,
    padding: "8px 10px",
    borderRadius: 10,
    textAlign: "center",
    marginBottom: 4,
  },
  info: {
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    color: "#1E3A8A",
    fontSize: 13,
    padding: "8px 10px",
    borderRadius: 10,
    textAlign: "center",
    marginBottom: 4,
  },
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

input::placeholder {
  color: #9CA3AF;
}
input:hover {
  border-color: #C2CBE2;
}
input:focus {
  border-color: #0D658B;
  background: #FFFFFF;
  box-shadow: 0 0 0 1px rgba(13,101,139,0.16);
}

button[type="submit"]:hover:not(:disabled) {
  filter: brightness(1.04);
  box-shadow: 0 18px 38px rgba(13,101,139,0.45);
  transform: translateY(-1px);
}
button[type="submit"]:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 10px 24px rgba(13,101,139,0.35);
}
button[type="submit"]:disabled {
  opacity: .7;
  cursor: not-allowed;
  box-shadow: none;
}
`;
