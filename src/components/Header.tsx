"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d={dir === "left" ? "M15 18l-6-6 6-6v12z" : "M9 6l6 6-6 6V6z"} />
    </svg>
  );
}

// Sticky top bar: back/forward nav, a search box that routes to /search,
// and the logged-in user's chip with a logout menu.
export function Header() {
  const router = useRouter();
  const { user, logOut } = useAuth();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  const initial = user?.username?.[0]?.toUpperCase() ?? "?";

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

      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full bg-black/50 py-1 pl-1 pr-3 transition hover:bg-black/70"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-sm font-bold text-black">
            {initial}
          </span>
          <span className="max-w-[120px] truncate text-sm font-semibold text-white">
            {user?.username ?? "Guest"}
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-11 z-20 w-40 rounded-md border border-white/10 bg-base p-1 text-sm shadow-2xl">
            <button
              onClick={() => {
                setMenuOpen(false);
                logOut();
              }}
              className="block w-full rounded px-3 py-2 text-left text-white hover:bg-white/10"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
