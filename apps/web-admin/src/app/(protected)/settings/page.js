// src/app/(protected)/settings/page.js
"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { authHeaders } from "@/lib/api";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API ||
  "http://localhost:4000";

/* Simple validators */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_DIGITS_RE = /^\d{11}$/; // 11 digits only

export default function SettingsPage() {
  /* ---------- PROFILE STATE (email + phone only) ---------- */
  const [profile, setProfile] = useState({
    email: "",
    phone: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });

  /* ---------- PASSWORD STATE ---------- */
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);

  /* ---------- MODALS ---------- */
  const [showTerms, setShowTerms] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const S = styles;

  /* ---------- LOAD CURRENT PROFILE ---------- */
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        console.log("SETTINGS API_URL =", API_URL);
        setProfileLoading(true);
        setProfileMsg({ type: "", text: "" });

        const res = await fetch(`${API_URL}/admin/profile`, {
          headers: authHeaders(),
        });

        let data = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }

        if (!res.ok) {
          throw new Error(data?.message || "Failed to load profile.");
        }

        if (!cancelled) {
          setProfile({
            email: data.email || "",
            phone: data.phone || "",
          });
        }
      } catch (err) {
        console.error("LOAD PROFILE ERROR:", err);
        if (!cancelled) {
          setProfileMsg({
            type: "error",
            text: err.message || "Failed to load profile.",
          });
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- VALIDATE & SAVE PROFILE ---------- */
  async function onSaveProfile(e) {
    e.preventDefault();
    setProfileMsg({ type: "", text: "" });

    const { email, phone } = profile;

    if (!EMAIL_RE.test(email.trim())) {
      setProfileMsg({ type: "error", text: "Please enter a valid email." });
      return;
    }

    const digitsOnly = phone.replace(/\D/g, "");
    if (!PHONE_DIGITS_RE.test(digitsOnly)) {
      setProfileMsg({
        type: "error",
        text: "Phone number must be 11 digits (e.g. 09123456789).",
      });
      return;
    }

    try {
      setProfileLoading(true);

      const res = await fetch(`${API_URL}/admin/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          email: email.trim(),
          phone: digitsOnly,
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data?.message || "Failed to update profile.");
      }

      setProfileMsg({
        type: "success",
        text: data?.message || "Profile updated successfully.",
      });
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err);
      setProfileMsg({
        type: "error",
        text: err.message || "Failed to update profile.",
      });
    } finally {
      setProfileLoading(false);
    }
  }

  /* ---------- VALIDATE & SAVE PASSWORD ---------- */
  async function onChangePassword(e) {
    e.preventDefault();
    setPasswordMsg({ type: "", text: "" });

    if (!newPassword) {
      setPasswordMsg({ type: "error", text: "New password is required." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({
        type: "error",
        text: "Password must be at least 8 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({
        type: "error",
        text: "New password and confirm password must match.",
      });
      return;
    }

    try {
      setPasswordSaving(true);

      const res = await fetch(`${API_URL}/admin/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ newPassword }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data?.message || "Failed to update password.");
      }

      setPasswordMsg({
        type: "success",
        text: data?.message || "Password updated successfully.",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("UPDATE PASSWORD ERROR:", err);
      setPasswordMsg({
        type: "error",
        text: err.message || "Failed to update password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  /* ---------- RENDER ---------- */
  return (
    <div style={S.page}>
      {/* Header */}
      <div>
        <h1 style={S.title}>System Settings</h1>
        <p style={S.subtitle}>Configure system preferences and settings.</p>
      </div>

      {/* Main card */}
      <section style={S.card}>
        <h2 style={S.sectionTitle}>Admin Account</h2>
        <hr style={S.divider} />

        {profileMsg.text && (
          <div style={S.flash(profileMsg.type)}>{profileMsg.text}</div>
        )}

        <form onSubmit={onSaveProfile} style={{ display: "grid", gap: 12 }}>
          <div style={S.grid2}>
            <div style={S.field}>
              <label style={S.label}>Email</label>
              <input
                style={S.input}
                type="email"
                placeholder="admin@example.com"
                value={profile.email}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div style={S.field}>
              <label style={S.label}>Phone Number</label>
              <input
                style={S.input}
                placeholder="09123456789"
                value={profile.phone}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>
          </div>

          <div
            style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}
          >
            <button
              type="submit"
              style={S.primaryBtnSm}
              disabled={profileLoading}
            >
              {profileLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Password section */}
        <div style={{ marginTop: 24 }}>
          {passwordMsg.text && (
            <div style={S.flash(passwordMsg.type)}>{passwordMsg.text}</div>
          )}

          <form
            onSubmit={onChangePassword}
            style={{ display: "grid", gap: 12 }}
          >
            <div style={S.grid2}>
              <div style={S.field}>
                <label style={S.label}>New Password</label>
                <input
                  style={S.input}
                  type="password"
                  placeholder="**********"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>Confirm Password</label>
                <input
                  style={S.input}
                  type="password"
                  placeholder="**********"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <div
              style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}
            >
              <button
                type="submit"
                style={S.primaryBtnSm}
                disabled={passwordSaving}
              >
                {passwordSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Bottom cards: Terms & Help */}
      <div style={S.bottomGrid}>
        {/* Terms & Privacy Policy */}
        <section style={S.smallCard}>
          <div style={S.smallTitle}>Terms & Privacy Policy</div>
          <p style={S.smallText}>
            Review the system terms and privacy practices.
          </p>
          <button
            type="button"
            onClick={() => setShowTerms(true)}
            style={S.linkBtn}
          >
            View documents
          </button>
        </section>

        {/* Help & Support */}
        <section style={S.smallCard}>
          <div style={S.smallTitle}>Help & Support</div>
          <p style={S.smallText}>
            Need assistance? Browse help topics or contact support.
          </p>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            style={S.linkBtn}
          >
            Open help center
          </button>
        </section>
      </div>

      {/* TERMS MODAL */}
      {showTerms && (
        <Modal onClose={() => setShowTerms(false)}>
          <h3 style={S.modalHeading}>LigtasCommute Terms &amp; Privacy Policy</h3>
          <p style={S.modalMeta}>
            <strong>Last Updated:</strong> June 17, 2025
          </p>
          <p style={S.modalBody}>
            Welcome, Admin! This policy outlines your responsibilities and how
            data is handled in LigtasCommute. Please ensure that any commuter
            or driver information you access is used only for official purposes.
          </p>
          <p style={S.modalBody}>
            By continuing to use the LigtasCommute Admin Portal, you agree to
            keep account credentials secure, avoid sharing sensitive data
            outside authorized channels, and promptly report any suspected
            security issues to the system maintainer.
          </p>
        </Modal>
      )}

      {/* HELP MODAL */}
      {showHelp && (
        <Modal onClose={() => setShowHelp(false)}>
          <h3 style={S.modalHeading}>Help &amp; Support</h3>
          <p style={S.modalBody}>
            For assistance, check the <strong>Driver Management</strong> or{" "}
            <strong>Incident Reports</strong> sections for common admin tasks
            like registering drivers, viewing QR codes, and monitoring
            emergency incidents.
          </p>
          <p style={S.modalBody}>
            If you encounter issues such as failed logins, missing data, or
            incorrect bus assignments, please contact your system coordinator
            or send a report to the LigtasCommute development team with a
            screenshot of the error and the time it occurred.
          </p>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Reusable Modal ---------- */
function Modal({ children, onClose }) {
  const S = styles;
  return (
    <div style={S.backdrop} onMouseDown={onClose}>
      <div
        style={S.modal}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={S.modalClose}
        >
          <X size={16} />
        </button>
        <div>{children}</div>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */
const styles = {
  page: {
    display: "grid",
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    margin: 0,
  },
  subtitle: {
    margin: "6px 0 0",
    color: "var(--muted)",
    fontSize: 14,
  },
  card: {
    background: "var(--card)",
    borderRadius: 24,
    border: "1px solid #9CA3AF",
    padding: 24,
    boxShadow: "0 20px 45px rgba(15,23,42,0.06)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    margin: 0,
  },
  divider: {
    border: "none",
    borderTop: "1px solid #9CA3AF",
    margin: "14px 0 18px",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  field: {
    display: "grid",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--muted)",
  },
  input: {
    width: "100%",
    borderRadius: 10,
    border: "1px solid #D4DBE7",
    padding: "10px 12px",
    fontSize: 14,
    background: "#F9FBFF",
    color: "var(--text)",
    outline: "none",
  },
  primaryBtnSm: {
    borderRadius: 999,
    border: "none",
    background: "#0D658B",
    color: "#FFFFFF",
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  flash: (type) => ({
    marginBottom: 10,
    padding: "8px 12px",
    borderRadius: 10,
    fontSize: 13,
    color: type === "error" ? "#B91C1C" : "#166534",
    background: type === "error" ? "#FEE2E2" : "#DCFCE7",
    border:
      type === "error" ? "1px solid #FCA5A5" : "1px solid #86EFAC",
  }),
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  smallCard: {
    background: "var(--card)",
    borderRadius: 20,
    border: "1px solid #9CA3AF",
    padding: 18,
    boxShadow: "0 10px 25px rgba(15,23,42,0.04)",
  },
  smallTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 4,
  },
  smallText: {
    fontSize: 13,
    color: "var(--muted)",
    marginBottom: 10,
  },
  linkBtn: {
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    color: "#0D658B",
    fontSize: 13,
    cursor: "pointer",
    textDecoration: "underline",
    fontWeight: 500,
  },

  /* Modal */
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.45)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 60,
  },
  modal: {
    position: "relative",
    width: "min(640px, 96vw)",
    background: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    boxShadow: "0 24px 60px rgba(15,23,42,0.25)",
    border: "1px solid #CBD5F5",
  },
  modalClose: {
    position: "absolute",
    top: 10,
    right: 10,
    height: 28,
    width: 28,
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#FFFFFF",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },
  modalHeading: {
    fontSize: 15,
    fontWeight: 700,
    margin: "0 0 8px",
  },
  modalMeta: {
    fontSize: 12,
    color: "#6B7280",
    margin: "0 0 10px",
  },
  modalBody: {
    fontSize: 13,
    color: "#111827",
    lineHeight: 1.5,
    marginBottom: 8,
  },
};
