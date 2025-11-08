import { create } from "zustand";
import { setAuthToken } from "@/lib/api";

export const useAuth = create((set) => ({
  token: undefined,
  user: undefined,
  login: (token, user) => {
    localStorage.setItem("lc_token", token);
    localStorage.setItem("lc_user", JSON.stringify(user));
    setAuthToken(token);
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem("lc_token");
    localStorage.removeItem("lc_user");
    setAuthToken(undefined);
    set({ token: undefined, user: undefined });
  },
  hydrate: () => {
    const t = localStorage.getItem("lc_token") || undefined;
    const u = localStorage.getItem("lc_user");
    const user = u ? JSON.parse(u) : undefined;
    setAuthToken(t);
    set({ token: t, user });
  },
}));
