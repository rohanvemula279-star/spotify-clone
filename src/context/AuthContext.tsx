"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type PublicUser,
  getCurrentUser,
  signUp as doSignUp,
  logIn as doLogIn,
  deleteAccount as doDeleteAccount,
  clearSession,
} from "@/lib/auth";
import { wipeOwner } from "@/lib/db";

interface AuthContextValue {
  user: PublicUser | null;
  ready: boolean; // hydrated from storage yet?
  signUp: (u: string, p: string) => Promise<{ ok: boolean; error?: string }>;
  logIn: (u: string, p: string) => Promise<{ ok: boolean; error?: string }>;
  logOut: () => void;
  /** Delete the account and erase all of its on-device data. */
  deleteAccount: (
    u: string,
    p: string
  ) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);

  // Hydrate the session from localStorage on mount (client only).
  useEffect(() => {
    setUser(getCurrentUser());
    setReady(true);
  }, []);

  const signUp = useCallback(async (u: string, p: string) => {
    const res = await doSignUp(u, p);
    if (res.ok && res.user) setUser(res.user);
    return { ok: res.ok, error: res.error };
  }, []);

  const logIn = useCallback(async (u: string, p: string) => {
    const res = await doLogIn(u, p);
    if (res.ok && res.user) setUser(res.user);
    return { ok: res.ok, error: res.error };
  }, []);

  const logOut = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async (u: string, p: string) => {
    const res = await doDeleteAccount(u, p);
    if (res.ok) {
      // Erase every saved song, folder, and downloaded blob for this user.
      try {
        await wipeOwner(u.trim().toLowerCase());
      } catch {
        /* best effort */
      }
      setUser(null);
    }
    return { ok: res.ok, error: res.error };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, signUp, logIn, logOut, deleteAccount }),
    [user, ready, signUp, logIn, logOut, deleteAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
