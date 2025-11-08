"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getMyProfile,
  updateMyProfile,
  updateMyPassword,
} from "@/lib/admins";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Password fields
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  // Modals
  const [showTerms, setShowTerms] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const me = await getMyProfile();
        setFullName(me?.user?.fullName || me?.fullName || "");
        setEmail(me?.user?.email || me?.email || "");
        setPhone(me?.user?.phone || me?.phone || "");
        setAddress(me?.user?.address || me?.address || "");
      } catch (e) {
        console.error(e);
        alert("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMyProfile({ fullName, email, phone, address });
      alert("Profile saved.");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function onSavePassword(e) {
    e.preventDefault();
    if (!pw1 || !pw2) return alert("Please fill both password fields.");
    if (pw1 !== pw2) return alert("Passwords do not match.");
    if (pw1.length < 6) return alert("Password must be at least 6 characters.");
    setPwdSaving(true);
    try {
      await updateMyPassword({ newPassword: pw1 });
      setPw1("");
      setPw2("");
      alert("Password updated.");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Failed to update password.");
    } finally {
      setPwdSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#101929]">
          System Settings
        </h1>
        <p className="text-sm text-[#6b7280]">
          Configure system preferences and settings.
        </p>
      </div>

      {/* Admin Information */}
      <div className="max-w-3xl mx-auto rounded-xl border border-[#e9eef2] bg-white p-6 shadow-sm">
        <div className="border-b border-[#f0f3f6] pb-4">
          <h2 className="text-base font-semibold text-[#101929]">
            Admin Information
          </h2>
        </div>

        {/* Profile form */}
        <form
          onSubmit={onSaveProfile}
          className="mt-5 grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto"
        >
          <div>
            <Label className="text-sm text-[#101929]">Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 h-10 text-[15px]"
              placeholder="Your name"
            />
          </div>

          <div>
            <Label className="text-sm text-[#101929]">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-10 text-[15px]"
              placeholder="name@domain.com"
            />
          </div>

          <div>
            <Label className="text-sm text-[#101929]">Phone Number</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 h-10 text-[15px]"
              placeholder="+63 9XX XXX XXXX"
            />
          </div>

          <div>
            <Label className="text-sm text-[#101929]">Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 h-10 text-[15px]"
              placeholder="123 Business St, City, State 12345"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end pt-1">
            <Button
              type="submit"
              disabled={saving || loading}
              className="h-9 px-5 rounded-lg bg-[#0D658B] hover:bg-[#0b5676] text-white text-sm font-medium"
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>

        <div className="border-t border-[#f0f3f6] my-6" />

        {/* Password form */}
        <form
          onSubmit={onSavePassword}
          className="grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto"
        >
          <div>
            <Label className="text-sm text-[#101929]">New Password</Label>
            <Input
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              className="mt-1 h-10 text-[15px]"
              placeholder="********"
            />
          </div>
          <div>
            <Label className="text-sm text-[#101929]">Confirm Password</Label>
            <Input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="mt-1 h-10 text-[15px]"
              placeholder="********"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <Button
              type="submit"
              disabled={pwdSaving || loading}
              className="h-9 px-5 rounded-lg bg-[#0D658B] hover:bg-[#0b5676] text-white text-sm font-medium"
            >
              {pwdSaving ? "Updating…" : "Update Password"}
            </Button>
          </div>
        </form>
      </div>

      {/* Cards Section */}
      <div className="grid gap-4 md:grid-cols-2 mt-5 max-w-3xl mx-auto">
        <div className="rounded-xl border border-[#e9eef2] bg-white p-4">
          <div className="font-medium text-[#101929]">
            Terms & Privacy Policy
          </div>
          <p className="mt-1 text-sm text-[#6b7280]">
            Review the system terms and privacy practices.
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="text-sm text-[#0D658B] hover:underline"
            >
              View documents
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[#e9eef2] bg-white p-4">
          <div className="font-medium text-[#101929]">Help & Support</div>
          <p className="mt-1 text-sm text-[#6b7280]">
            Need assistance? Browse help topics or contact support.
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="text-sm text-[#0D658B] hover:underline"
            >
              Open help center
            </button>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-lg rounded-xl border border-[#e5edf2]">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-[15px] font-semibold">
              LigtasCommute Terms & Privacy Policy
            </DialogTitle>
          </DialogHeader>

          <div className="text-[13px] leading-relaxed space-y-3">
            <p>
              <span className="font-medium">Last Updated:</span> June 17, 2025
            </p>
            <p>
              Welcome, Admin! This policy outlines your responsibilities and how
              data is handled in LigtasCommute.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Modal */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-lg rounded-xl border border-[#e5edf2]">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-[15px] font-semibold">
              Help & Support
            </DialogTitle>
          </DialogHeader>

          <div className="text-[13px] leading-relaxed space-y-3">
            <p>
              For assistance, check the <strong>Driver Management</strong> or{" "}
              <strong>Emergency Reports</strong> sections for common tasks.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
