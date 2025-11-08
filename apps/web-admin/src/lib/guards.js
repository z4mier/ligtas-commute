"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/store/auth";
import { useRouter } from "next/navigation";

export default function RequireAdmin({ children }) {
  const { token, user, hydrate } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  useEffect(() => {
    if (!ready) return;
    if (!token || user?.role !== "ADMIN") router.replace("/login");
  }, [ready, token, user, router]);

  if (!ready) return null;
  return <>{children}</>;
}
