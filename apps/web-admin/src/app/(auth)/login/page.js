"use client";
import { useState } from "react";
import { useAuth } from "@/store/auth";
import { loginAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [emailOrPhone, setEP] = useState("");
  const [password, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { token, user } = await loginAdmin(emailOrPhone, password);
      login(token, user);
      window.location.href = "/dashboard";
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fafc,60%,#ffffff)] grid place-items-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md bg-white border border-[#e9eef2] p-7 rounded-2xl shadow-sm space-y-6"
      >
        <div className="space-y-1">
          <div className="text-[#0D658B] font-semibold tracking-wide text-sm">
            LigtasCommute Admin
          </div>
          <h1 className="text-2xl font-semibold text-[#101929]">Welcome back</h1>
          <p className="text-sm text-[#757575]">
            Sign in with your admin account to manage drivers & reports.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#101929]">Email or Phone</label>
            <Input
              className="h-11 bg-white border-[#e2e8f0] focus-visible:ring-2 focus-visible:ring-[#0D658B] focus-visible:ring-offset-0"
              placeholder="e.g. admin@ligtascommute.com"
              value={emailOrPhone}
              onChange={(e) => setEP(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#101929]">Password</label>
            <Input
              type="password"
              className="h-11 bg-white border-[#e2e8f0] focus-visible:ring-2 focus-visible:ring-[#0D658B] focus-visible:ring-offset-0"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPw(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-[#0D658B] hover:bg-[#0b5676] text-white transition-colors disabled:opacity-70"
          >
            {loading ? "Logging in…" : "Login"}
          </Button>
        </div>

        <div className="text-center text-xs text-[#757575]">
          Trouble logging in? Contact your system administrator.
        </div>
      </form>
    </div>
  );
}
