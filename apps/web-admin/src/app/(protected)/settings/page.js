// src/app/(protected)/settings/page.js
"use client";

import { useEffect, useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { authHeaders } from "@/lib/api";
import { Poppins } from "next/font/google";

/* ---------- FONT ---------- */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

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

  /* show/hide password */
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* ---------- MODALS ---------- */
  const [showTerms, setShowTerms] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const S = styles;

  /* ---------- LOAD CURRENT PROFILE ---------- */
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setProfileLoading(true);
        setProfileMsg({ type: "", text: "" });

        const headers = await authHeaders();
        const res = await fetch(`${API_URL}/admin/profile`, {
          headers,
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

      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/admin/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...headers,
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

      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/admin/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...headers,
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
      setShowNew(false);
      setShowConfirm(false);
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
    <div className={poppins.className} style={S.page}>
      {/* Header */}
      <div>
        <h1 style={S.title}>System settings</h1>
        <p style={S.subtitle}>
          Manage your admin account details and security preferences.
        </p>
      </div>

      {/* Main card */}
      <section style={S.card}>
        <div style={S.cardHeader}>
          <div>
            <h2 style={S.sectionTitle}>Admin account</h2>
            <p style={S.sectionSub}>
              This information is used for login and system notifications.
            </p>
          </div>
          <div style={S.chip}>
            <span style={S.chipDot} /> Primary administrator
          </div>
        </div>

        <hr style={S.divider} />

        {profileMsg.text && (
          <div style={S.flash(profileMsg.type)}>{profileMsg.text}</div>
        )}

        {/* PROFILE FORM */}
        <form onSubmit={onSaveProfile} style={{ display: "grid", gap: 16 }}>
          <div style={S.grid2}>
            <div style={S.field}>
              <label style={S.label}>Email address</label>
              <input
                style={S.input}
                type="email"
                placeholder="admin@ligtas.com"
                value={profile.email}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, email: e.target.value }))
                }
              />
              <p style={S.helper}>
                This email receives alerts about incidents and account activity.
              </p>
            </div>
            <div style={S.field}>
              <label style={S.label}>Phone number</label>
              <input
                style={S.input}
                placeholder="09871234567"
                value={profile.phone}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, phone: e.target.value }))
                }
              />
              <p style={S.helper}>
                Use an active mobile number for urgent SMS notifications.
              </p>
            </div>
          </div>

          <div style={S.actionsRow}>
            <button
              type="submit"
              style={S.primaryBtn}
              disabled={profileLoading}
            >
              {profileLoading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>

        {/* PASSWORD SECTION */}
        <div style={S.passwordBlock}>
          <div style={S.passwordHeader}>
            <div>
              <h3 style={S.sectionTitle}>Security</h3>
              <p style={S.sectionSub}>
                Set a strong password to protect the admin portal.
              </p>
            </div>
          </div>

          {passwordMsg.text && (
            <div style={S.flash(passwordMsg.type)}>{passwordMsg.text}</div>
          )}

          {/* PASSWORD FORM */}
          <form
            onSubmit={onChangePassword}
            style={{ display: "grid", gap: 20 }}
          >
            <div style={S.grid2}>
              {/* New password */}
              <div style={S.field}>
                <label style={S.label}>New password</label>
                <div style={S.inputWrapper}>
                  <input
                    style={S.inputPassword}
                    type={showNew ? "text" : "password"}
                    placeholder="Enter a new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    style={S.eyeIcon}
                    aria-label={showNew ? "Hide password" : "Show password"}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p style={S.helper}>
                  Minimum 8 characters. Use a mix of letters and numbers.
                </p>
              </div>

              {/* Confirm password */}
              <div style={S.field}>
                <label style={S.label}>Confirm new password</label>
                <div style={S.inputWrapper}>
                  <input
                    style={S.inputPassword}
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    style={S.eyeIcon}
                    aria-label={
                      showConfirm ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={S.actionsRow}>
              <button
                type="submit"
                style={S.primaryBtn}
                disabled={passwordSaving}
              >
                {passwordSaving ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Bottom cards: Terms & Help */}
      <div style={S.bottomGrid}>
        {/* Terms & Privacy Policy */}
        <section style={S.smallCard}>
          <div style={S.smallTitleRow}>
            <span style={S.smallTitle}>Terms &amp; privacy</span>
            <span style={S.smallPill}>Policy</span>
          </div>
          <p style={S.smallText}>
            Review how LigtasCommute handles commuter, driver, and trip data.
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
          <div style={S.smallTitleRow}>
            <span style={S.smallTitle}>Help &amp; support</span>
            <span style={S.smallPillMuted}>Admin guide</span>
          </div>
          <p style={S.smallText}>
            Need assistance? Browse common admin tasks or contact the dev team.
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
          <h3 style={S.modalHeading}>LigtasCommute Terms &amp; Privacy</h3>
          <p style={S.modalMeta}>
            <strong>Last updated:</strong> November 26, 2025
          </p>
          <p style={S.modalBody}>
            As an administrator, you are responsible for handling commuter and
            driver information securely. Use data only for operational and
            safety-related purposes and avoid exporting or sharing records
            outside official channels.
          </p>
          <p style={S.modalBody}>
            The system logs changes to driver profiles, bus assignments, and
            incidents for auditing. Do not share your admin account with other
            users. If additional admins are needed, request that a separate
            account be created for them.
          </p>
          <p style={S.modalBody}>
            For questions about data retention and privacy, contact{" "}
            <strong>support@ligtascommute.com</strong>.
          </p>
        </Modal>
      )}

      {/* HELP MODAL */}
      {showHelp && (
        <Modal onClose={() => setShowHelp(false)}>
          <h3 style={S.modalHeading}>Help &amp; Support</h3>
          <p style={S.modalBody}>
            You can use the admin portal to register drivers, manage buses,
            review commuter feedback, and monitor incident reports sent from the
            devices and mobile apps.
          </p>
          <p style={S.modalBody}>
            If something looks incorrect (for example, a driver is assigned to
            the wrong bus or incidents are not appearing), capture a screenshot
            and send it together with the approximate time of the issue to{" "}
            <strong>support@ligtascommute.com</strong>.
          </p>
          <p style={S.modalBody}>
            For urgent safety concerns, always follow your organization’s
            on-ground escalation procedure first before relying on the system.
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
    gap: 18,
    maxWidth: 1120,
    margin: "0 auto",
    padding: "0 16px 24px",
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
    border: "1px solid var(--line)",
    padding: 24,
    boxShadow: "0 20px 45px rgba(15,23,42,0.06)",
    display: "grid",
    gap: 18,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    margin: 0,
  },
  sectionSub: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    color: "#1D4ED8",
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: "999px",
    background: "#22C55E",
  },
  divider: {
    border: "none",
    borderTop: "1px solid #E5E7EB",
    margin: "4px 0 8px",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 20,
    alignItems: "start",
  },
  field: {
    display: "grid",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#4B5563",
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
  helper: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  inputWrapper: {
    position: "relative",
    width: "100%",
  },
  inputPassword: {
    width: "100%",
    borderRadius: 10,
    border: "1px solid #D4DBE7",
    padding: "10px 40px 10px 12px",
    fontSize: 14,
    background: "#F9FBFF",
    color: "var(--text)",
    outline: "none",
  },
  eyeIcon: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    background: "transparent",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#6B7280",
  },
  actionsRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  primaryBtn: {
    borderRadius: 999,
    border: "none",
    background: "#0D658B",
    color: "#FFFFFF",
    padding: "8px 20px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  flash: (type) => ({
    marginTop: 4,
    marginBottom: 4,
    padding: "8px 12px",
    borderRadius: 10,
    fontSize: 13,
    color: type === "error" ? "#B91C1C" : "#166534",
    background: type === "error" ? "#FEF2F2" : "#ECFDF3",
    border:
      type === "error" ? "1px solid #FCA5A5" : "1px solid #86EFAC",
  }),
  passwordBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px dashed #E5E7EB",
  },
  passwordHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
  },
  smallCard: {
    background: "var(--card)",
    borderRadius: 20,
    border: "1px solid var(--line)",
    padding: 18,
    boxShadow: "0 10px 25px rgba(15,23,42,0.04)",
  },
  smallTitleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  smallTitle: {
    fontSize: 14,
    fontWeight: 700,
  },
  smallPill: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#EFF6FF",
    color: "#1D4ED8",
  },
  smallPillMuted: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#F3F4F6",
    color: "#4B5563",
  },
  smallText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
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
    borderRadius: 16,
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
