"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./admin.module.css";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const t = getToken();
    if (!t) router.replace("/login");
  }, [router]);

  function logout() {
    try {
      localStorage.removeItem("token");
      document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
    } catch {}
    router.replace("/login");
  }

  return (
    <div className={styles.theme}>
      {/* Top bar */}
      <header className={styles.topbar}>
        <div className={styles.brand}>ADMIN</div>
        <div className={styles.topRight}>
          <span className={styles.badge}>2</span>
          <div className={styles.user}>
            <div className={styles.userDot} />
            <div className={styles.userMeta}>
              <strong>Hamela Sala</strong>
              <small>Administrator</small>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <Nav href="/dashboard" label="Dashboard" icon="▦" active={pathname === "/dashboard"} />
        <Nav href="/driver-registration" label="Driver Registration" icon="👤" active={pathname === "/driver-registration"} />
        <Nav href="/user-feedback" label="User Feedback" icon="💬" active={pathname === "/user-feedback"} />
        <Nav href="/incident-reports" label="Incident Reports" icon="⚠️" active={pathname === "/incident-reports"} />
        <Nav href="/settings" label="Settings" icon="⚙️" active={pathname === "/settings"} />
        <button className={styles.logout} onClick={logout}>⎋ Logout</button>
      </aside>

      {/* Page content */}
      <main className={styles.main}>{children}</main>
    </div>
  );
}

function Nav({ href, label, icon, active }) {
  return (
    <Link href={href} className={`${styles.navItem} ${active ? styles.navActive : ""}`}>
      <span className={styles.navIcon}>{icon}</span>
      {label}
    </Link>
  );
}
