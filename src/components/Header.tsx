"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path
        d={dir === "left" ? "M15 18l-6-6 6-6v12z" : "M9 6l6 6-6 6V6z"}
      />
    </svg>
  );
}

// Sticky top bar: back/forward nav, a search box that routes to /search,
// and a profile tag. Intentionally does NOT subscribe to the player
// context, so it never re-renders on playback ticks.
export function Header() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-base/80 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
          aria-label="Back"
        >
          <Chevron dir="left" />
        </button>
        <button
          onClick={() => router.forward()}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
          aria-label="Forward"
        >
          <Chevron dir="right" />
        </button>
      </div>

      <form onSubmit={submit} className="flex-1 max-w-md">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="What do you want to listen to?"
          className="w-full rounded-full bg-white/10 px-5 py-2 text-sm text-white placeholder:text-muted focus:bg-white/15 focus:outline-none"
        />
      </form>

      <div className="flex items-center gap-2">
        <span className="rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white">
          Premium-free
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-black">
          R
        </span>
      </div>
    </header>
  );
}
