"use client";

import { useState } from "react";
import { setYoutubeKey } from "@/lib/storage";
import { validateYoutubeKey } from "@/lib/youtube";

// First-run screen: collect the user's YouTube Data API key. Shown only when
// no key is stored; once saved, later launches skip straight past it. The key
// lives on-device and is used solely to search YouTube's catalog.
export function ApiKeyGate({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setError("Paste your YouTube API key to continue.");
      return;
    }
    setChecking(true);
    setError(null);
    const valid = await validateYoutubeKey(trimmed);
    setChecking(false);
    if (!valid) {
      setError(
        "That key didn't work. Make sure the YouTube Data API v3 is enabled " +
          "for it and that it has quota remaining."
      );
      return;
    }
    setYoutubeKey(trimmed);
    onDone();
  }

  function skip() {
    // Allow continuing without search; audio browsing still works via JioSaavn.
    setYoutubeKey(null);
    onDone();
  }

  return (
    <GateShell title="Connect YouTube Search">
      <p className="mb-6 text-sm leading-relaxed text-muted">
        Flowz searches YouTube&apos;s catalog and plays the matching audio.
        Paste a free <strong className="text-white">YouTube Data API v3</strong>{" "}
        key to enable search. It is stored only on this device and never shared.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIza…"
          autoFocus
          spellCheck={false}
          className="rounded-lg bg-white/10 px-4 py-3 text-sm text-white placeholder:text-muted focus:bg-white/15 focus:outline-none"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={checking}
          className="rounded-full bg-accent px-4 py-3 text-sm font-bold text-black transition hover:scale-[1.02] disabled:opacity-50"
        >
          {checking ? "Checking key…" : "Save & continue"}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between text-xs text-muted">
        <a
          href="https://console.cloud.google.com/apis/credentials"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-white"
        >
          Get a free key →
        </a>
        <button onClick={skip} className="underline hover:text-white">
          Skip for now
        </button>
      </div>
    </GateShell>
  );
}

/** Shared centered card used by both onboarding gates. */
export function GateShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-gradient-to-b from-highlight to-base p-4">
      <div className="w-full max-w-md rounded-2xl bg-elevated p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
          <span className="text-accent">●</span> {title}
        </div>
        {children}
      </div>
    </div>
  );
}
