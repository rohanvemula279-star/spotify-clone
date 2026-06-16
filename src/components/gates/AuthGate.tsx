"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { hasAnyAccount } from "@/lib/auth";
import { GateShell } from "./ApiKeyGate";

type Mode = "login" | "signup";

// Second onboarding gate: local account. New devices default to sign-up;
// returning users (an account already exists on the device) default to login.
// "Recovery" is just logging back in with the same username + password.
export function AuthGate() {
  const { signUp, logIn } = useAuth();
  const [mode, setMode] = useState<Mode>(hasAnyAccount() ? "login" : "signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res =
      mode === "signup"
        ? await signUp(username, password)
        : await logIn(username, password);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Something went wrong.");
    // On success the provider sets `user`, which unmounts this gate.
  }

  const isSignup = mode === "signup";

  return (
    <GateShell title={isSignup ? "Create your account" : "Welcome back"}>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        {isSignup
          ? "Pick a username and password. Your account and library stay on " +
            "this device — nothing is uploaded."
          : "Log in with the username and password you used on this device."}
      </p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          autoFocus
          autoComplete="username"
          spellCheck={false}
          className="rounded-lg bg-white/10 px-4 py-3 text-sm text-white placeholder:text-muted focus:bg-white/15 focus:outline-none"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          className="rounded-lg bg-white/10 px-4 py-3 text-sm text-white placeholder:text-muted focus:bg-white/15 focus:outline-none"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-accent px-4 py-3 text-sm font-bold text-black transition hover:scale-[1.02] disabled:opacity-50"
        >
          {busy
            ? "Please wait…"
            : isSignup
            ? "Create account"
            : "Log in"}
        </button>
      </form>

      <div className="mt-5 text-center text-xs text-muted">
        {isSignup ? (
          <button
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className="underline hover:text-white"
          >
            Already have an account? Log in
          </button>
        ) : (
          <button
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className="underline hover:text-white"
          >
            New here? Create an account
          </button>
        )}
      </div>

      {isSignup && (
        <p className="mt-4 rounded-md bg-highlight p-3 text-[11px] leading-relaxed text-muted">
          Heads up: because nothing is stored on a server, your account can only
          be recovered with this username &amp; password and only on this
          device. Clearing the app&apos;s data removes it permanently.
        </p>
      )}
    </GateShell>
  );
}
