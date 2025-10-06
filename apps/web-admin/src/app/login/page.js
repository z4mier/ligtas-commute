"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function AdminSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (t) router.replace("/admin/dashboard");
  }, [router]);

  useEffect(() => {
    try {
      const qp = new URLSearchParams(window.location.search);
      if (qp.get("signout") === "1") {
        localStorage.removeItem("token");
        document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
      }
    } catch {}
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setMsg("");

    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim || !pw) {
      setMsg("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrim, password: pw }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Login failed (HTTP ${res.status})`);
      if (data?.role !== "ADMIN") throw new Error("This account is not an admin.");

      localStorage.setItem("token", data.token);
      document.cookie = `token=${data.token}; Path=/; Max-Age=604800; SameSite=Lax`;

      router.replace("/admin/dashboard");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#E9F1FA] text-[#0B1526] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#C7D8E6] bg-white p-8 shadow-xl">
        {/* Title */}
        <h1 className="mb-6 text-center text-3xl font-bold text-[#00ABE4]">
          ADMIN LOGIN
        </h1>

        {/* Form */}
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {/* Email */}
          <label className="sr-only" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            autoComplete="username"
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[#BFD7EA] bg-[#F7FBFF] px-4 py-2 text-[#0B1526] placeholder:text-gray-500 outline-none transition focus:ring-2 focus:ring-[#00ABE4]/50"
            required
          />

          {/* Password */}
          <div className="relative">
            <label className="sr-only" htmlFor="password">Password</label>
            <input
              id="password"
              type={show ? "text" : "password"}
              placeholder="Password"
              value={pw}
              autoComplete="current-password"
              onChange={(e) => setPw(e.target.value)}
              className="w-full rounded-lg border border-[#BFD7EA] bg-[#F7FBFF] px-4 py-2 text-[#0B1526] placeholder:text-gray-500 outline-none transition focus:ring-2 focus:ring-[#00ABE4]/50"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-[#00ABE4] transition"
              tabIndex={-1}
            >
              {show ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => alert("Forgot password flow coming soon.")}
              className="text-sm text-gray-500 transition hover:text-[#00ABE4]"
            >
              Forgot password?
            </button>
          </div>

          {/* Error Message */}
          {msg && (
            <div className="rounded-md bg-red-500/10 px-3 py-2 text-center text-sm text-red-600">
              {msg}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-[#00ABE4] py-2 font-semibold text-white transition hover:bg-[#0098CB] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}
