"use client";
import { useState } from "react";
import { api } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      setMsg("Login successful!");
      window.location.href = "/drivers";
    } catch (err) {
      setMsg("Invalid credentials");
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Admin Login</h1>
      <form onSubmit={handleLogin}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" /><br />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" /><br />
        <button type="submit">Login</button>
      </form>
      <p>{msg}</p>
    </div>
  );
}
