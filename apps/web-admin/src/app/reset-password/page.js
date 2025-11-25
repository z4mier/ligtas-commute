"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API ||
  "http://localhost:4000";

export default function ResetPasswordPage() {
  const r = useRouter();
  const sp = useSearchParams();
  const initialEmail = sp.get("email") || "";

  const [email] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  function validate() {
    if (!email) {
      setErr("Missing email. Please request a reset again.");
      return false;
    }
    if (!code || code.trim().length !== 6) {
      setErr("Enter the 6-digit code from your email.");
      return false;
    }
    if (!password || password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return false;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return false;
    }
    setErr("");
    return true;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setInfo("");
    setErr("");

    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          code: code.trim(),
          newPassword: password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.message || "Unable to reset password. Please try again."
        );
      }

      setInfo(
        "Password updated successfully. Redirecting you back to the login page…"
      );

      setTimeout(() => {
        r.replace("/login?reset=1");
      }, 2000);
    } catch (ex) {
      console.error("Reset password failed:", ex);
      setErr(ex.message || "Unable to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={S.page}>
      <style>{css}</style>
      <div style={S.cardWrap}>
        <div style={S.card}>
          {/* Brand line – same style as LoginView */}
          <div style={S.brandRow}>
            <span style={S.brandMain}>LigtasCommute</span>
            <span style={S.brandDot}>•</span>
            <span style={S.brandSub}>Admin</span>
          </div>

          <h1 style={S.heading}>Enter reset code</h1>
          <p style={S.sub}>
            We sent a 6-digit reset code to{" "}
            <strong>{email || "your email"}</strong>. Enter the code and choose
            a new password.
          </p>

          {info && <div style={S.info}>{info}</div>}
          {err && <div style={S.error}>{err}</div>}

          {!email && (
            <p style={S.missingEmailText}>
              Missing email address.{" "}
              <button
                type="button"
                onClick={() => r.push("/forgot")}
                style={S.inlineLink}
              >
                Request a new reset code
              </button>
              .
            </p>
          )}

          <form style={S.form} onSubmit={onSubmit} noValidate>
            <div style={S.field}>
              <label style={S.label}>Reset code</label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                style={S.input}
              />
            </div>

            <div style={S.field}>
              <label style={S.label}>New password</label>
              <div style={S.passwordWrap}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={{ ...S.input, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password visibility"
                  style={S.eyeBtn}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={S.field}>
              <label style={S.label}>Confirm password</label>
              <div style={S.passwordWrap}>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  style={{ ...S.input, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label="Toggle password visibility"
                  style={S.eyeBtn}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || !email} style={S.btn}>
              {loading ? "Updating password…" : "Reset password"}
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

/* ---- Match LoginView styles (Poppins, gradient, card, etc.) ---- */

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
  linkBtn: {
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
  inlineLink: {
    border: "none",
    background: "transparent",
    padding: 0,
    fontSize: 12,
    color: "#0D658B",
    cursor: "pointer",
    textDecoration: "underline",
  },
  error: {
    background: "#FEF2F2",
    border: "1px solid #FCA5A5",
    color: "#B91C1C",
    fontSize: 13,
    padding: "8px 10px",
    borderRadius: 10,
    textAlign: "center",
    marginBottom: 6,
  },
  info: {
    background: "#ECFDF5",
    border: "1px solid #6EE7B7",
    color: "#065F46",
    fontSize: 13,
    padding: "8px 10px",
    borderRadius: 10,
    textAlign: "center",
    marginBottom: 6,
  },
  missingEmailText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 10,
  },
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

input::placeholder { color: #9CA3AF; }
input:hover { border-color: #C2CBE2; }
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
