"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [showPolicies, setShowPolicies] = useState(false);
  const [policyTab, setPolicyTab] = useState("terms");
  const [showHelp, setShowHelp] = useState(false);

  // fetch profile
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data) {
          setFullName(data.fullName || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
          setAddress(data.address || "");
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  function onPickAvatar(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  }

  async function onSave(e) {
    e.preventDefault();
    setMsg("");

    if (newPw || confirmPw) {
      if (newPw.length < 6) return setMsg("Password must be at least 6 characters.");
      if (newPw !== confirmPw) return setMsg("Passwords do not match.");
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      const form = new FormData();
      form.append("fullName", fullName.trim());
      form.append("email", email.trim().toLowerCase());
      form.append("phone", phone.trim());
      form.append("address", address.trim());
      if (newPw) form.append("newPassword", newPw);
      if (avatarFile) form.append("avatar", avatarFile);

      const res = await fetch(`${API_BASE}/admin/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save changes.");

      setMsg("Saved successfully.");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      {/* ---------- Header ---------- */}
      <header>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0B1526]">
          Settings
        </h2>
        <p className="text-[#5D6E80] mt-1">
          Manage your profile, security, and preferences.
        </p>
      </header>

      {/* ---------- Profile Card ---------- */}
      <div className="rounded-2xl border border-[#C7D8E6] bg-white p-6 shadow-sm">
        <h3 className="text-lg md:text-xl font-semibold text-[#0B1526]">
          Admin Information
        </h3>
        <p className="text-sm text-[#5D6E80] mt-1">
          Update your profile details and password.
        </p>

        <form
          onSubmit={onSave}
          className="mt-6 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6"
        >
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <img
                src={avatarPreview || "/avatar-placeholder.png"}
                alt="Profile"
                className="h-28 w-28 rounded-2xl object-cover border border-[#C7D8E6] bg-[#F3F9FF]"
              />
              <label
                className="absolute -bottom-2 -right-2 cursor-pointer rounded-xl bg-[#00ABE4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0098CB]"
                title="Upload new photo"
              >
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickAvatar}
                />
              </label>
            </div>
            <p className="text-xs text-[#5D6E80]">PNG/JPG up to ~2 MB</p>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full name">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-[#C7D8E6] bg-[#F7FBFF] px-3 py-2 outline-none focus:ring-2 focus:ring-[#00ABE4]/50"
                placeholder="Your name"
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#C7D8E6] bg-[#F7FBFF] px-3 py-2 outline-none focus:ring-2 focus:ring-[#00ABE4]/50"
                placeholder="you@example.com"
                autoComplete="username"
              />
            </Field>

            <Field label="Phone number">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-[#C7D8E6] bg-[#F7FBFF] px-3 py-2 outline-none focus:ring-2 focus:ring-[#00ABE4]/50"
                placeholder="09XXXXXXXXX"
              />
            </Field>

            <Field label="Address">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border border-[#C7D8E6] bg-[#F7FBFF] px-3 py-2 outline-none focus:ring-2 focus:ring-[#00ABE4]/50"
                placeholder="City / Barangay / Street"
              />
            </Field>

            <Field label="New password">
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full rounded-lg border border-[#C7D8E6] bg-[#F7FBFF] px-3 py-2 outline-none focus:ring-2 focus:ring-[#00ABE4]/50"
                placeholder="••••••••"
              />
            </Field>

            <Field label="Confirm password">
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full rounded-lg border border-[#C7D8E6] bg-[#F7FBFF] px-3 py-2 outline-none focus:ring-2 focus:ring-[#00ABE4]/50"
                placeholder="••••••••"
              />
            </Field>

            {msg && (
              <div className="md:col-span-2 rounded-md bg-[#E9F1FA] border border-[#C7D8E6] px-3 py-2 text-sm text-[#0B1526]">
                {msg}
              </div>
            )}

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={saving || loading}
                className="rounded-lg bg-[#00ABE4] px-4 py-2 font-semibold text-white transition hover:bg-[#0098CB] disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg border border-[#C7D8E6] bg-white px-4 py-2 text-[#0B1526] hover:bg-[#F3F9FF]"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ---------- Links ---------- */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowPolicies(true)}
          className="rounded-lg border border-[#C7D8E6] bg-white px-3 py-2 text-[#0B1526] hover:bg-[#F3F9FF]"
        >
          Terms & Privacy
        </button>
        <button
          onClick={() => setShowHelp(true)}
          className="rounded-lg border border-[#C7D8E6] bg-white px-3 py-2 text-[#0B1526] hover:bg-[#F3F9FF]"
        >
          Help & Support
        </button>
      </div>

      {/* ---------- Modals ---------- */}
      {showPolicies && (
        <PoliciesModal
          tab={policyTab}
          setTab={setPolicyTab}
          onClose={() => setShowPolicies(false)}
        />
      )}
      {showHelp && (
        <Modal title="Help & Support" onClose={() => setShowHelp(false)}>
          <ul className="list-disc pl-5 space-y-2 text-[#0B1526]">
            <li>Email: support@ligtascommute.example</li>
            <li>Hotline: (02) 1234 5678</li>
            <li>Hours: 9 AM – 6 PM PHT, Mon–Fri</li>
          </ul>
        </Modal>
      )}
    </section>
  );
}

/* ---------- Subcomponents ---------- */

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-[#405266]">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-[#C7D8E6] bg-white p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-[#0B1526]">{title}</h4>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-[#5D6E80] hover:bg-[#F3F9FF]"
          >
            ✕
          </button>
        </div>
        <div className="text-[#0B1526]">{children}</div>
        <div className="mt-5 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-[#00ABE4] px-4 py-2 font-semibold text-white hover:bg-[#0098CB]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PoliciesModal({ tab, setTab, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-[#C7D8E6] bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-[#0B1526]">Terms & Privacy</h4>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-[#5D6E80] hover:bg-[#F3F9FF]"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setTab("terms")}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === "terms"
                ? "bg-[#E9F1FA] text-[#0B1526] border border-[#C7D8E6]"
                : "text-[#5D6E80] hover:bg-[#F3F9FF]"
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setTab("privacy")}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === "privacy"
                ? "bg-[#E9F1FA] text-[#0B1526] border border-[#C7D8E6]"
                : "text-[#5D6E80] hover:bg-[#F3F9FF]"
            }`}
          >
            Privacy Policy
          </button>
        </div>

        <div className="text-[#0B1526] leading-relaxed">
          {tab === "terms" ? (
            <>
              <h5 className="font-semibold mb-1">Terms of Service</h5>
              <p>
                These are sample Terms. Replace with your actual terms covering acceptable use,
                accounts, prohibited conduct, service availability, disclaimers, and governing law.
              </p>
              <ul className="list-disc pl-5 mt-2">
                <li>Use the service responsibly.</li>
                <li>No unlawful or harmful content.</li>
                <li>We may update terms with prior notice.</li>
              </ul>
            </>
          ) : (
            <>
              <h5 className="font-semibold mb-1">Privacy Policy</h5>
              <p>
                This is a sample Privacy Policy. Describe the data you collect, how you use it,
                retention, third-party processors, and how users can request access or deletion.
              </p>
              <ul className="list-disc pl-5 mt-2">
                <li>Data collected: account info, usage logs.</li>
                <li>Purpose: security, analytics, service improvement.</li>
                <li>Rights: access, correction, deletion.</li>
              </ul>
            </>
          )}
        </div>

        <div className="mt-5 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-[#00ABE4] px-4 py-2 font-semibold text-white hover:bg-[#0098CB]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
