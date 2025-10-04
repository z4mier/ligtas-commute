"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@ligtas.com");
  const [password, setPassword] = useState("admin123");
  const [msg, setMsg] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("token", data.token);
      setMsg("✅ Login successful!");
    } catch (err) {
      setMsg("❌ " + err.message);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Admin Login</h1>
      <form onSubmit={handleLogin}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" /><br />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" /><br />
        <button type="submit">Login</button>
      </form>
      <p>{msg}</p>
    </main>
  );
}
