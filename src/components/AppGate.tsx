"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getYoutubeKey } from "@/lib/storage";
import { ApiKeyGate } from "./gates/ApiKeyGate";
import { AuthGate } from "./gates/AuthGate";

// Startup orchestrator. Renders, in order:
//   1. YouTube API-key gate  — only on the very first launch (no key stored)
//   2. Account gate          — until someone is logged in
//   3. The app shell         — once both are satisfied
// On later launches both are already satisfied, so it falls straight through.
export function AppGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  // localStorage is client-only; read it after mount to avoid an SSR/export
  // hydration mismatch.
  useEffect(() => {
    setHasKey(getYoutubeKey() !== null);
    setHydrated(true);
  }, []);

  // Avoid a flash of the wrong screen before storage is read.
  if (!hydrated || !ready) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-base text-muted">
        Loading…
      </div>
    );
  }

  if (!hasKey) return <ApiKeyGate onDone={() => setHasKey(true)} />;
  if (!user) return <AuthGate />;

  return <>{children}</>;
}
