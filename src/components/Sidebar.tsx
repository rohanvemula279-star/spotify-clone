"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Playlist {
  id: string;
  name: string;
}

export function Sidebar() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  // Load the user's imported playlists on mount.
  useEffect(() => {
    let active = true;
    fetch("/api/playlists")
      .then((r) => r.json())
      .then((d) => {
        if (active) setPlaylists(d.playlists ?? []);
      })
      .catch(() => {
        /* leave the list empty on failure */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <aside className="m-2 flex w-64 flex-col gap-2">
      {/* Brand / primary nav */}
      <div className="rounded-lg bg-elevated p-4">
        <div className="mb-6 flex items-center gap-2 px-2 text-xl font-bold">
          <span className="text-accent">●</span> Spotube
        </div>
        <nav className="flex flex-col gap-4 text-sm font-semibold text-muted">
          <Link href="/" className="flex items-center gap-3 text-white">
            <span>🏠</span> Home
          </Link>
          <Link
            href="/search"
            className="flex items-center gap-3 hover:text-white"
          >
            <span>🔍</span> Search
          </Link>
          <Link
            href="/admin/import"
            className="flex items-center gap-3 hover:text-white"
          >
            <span>➕</span> Import playlist
          </Link>
        </nav>
      </div>

      {/* Library: imported playlists */}
      <div className="scroll-area flex-1 overflow-y-auto rounded-lg bg-elevated p-4">
        <div className="mb-4 px-2 text-sm font-semibold text-muted">
          Your Library
        </div>

        {loading ? (
          <div className="rounded-md bg-highlight p-4 text-sm text-muted">
            Loading…
          </div>
        ) : playlists.length === 0 ? (
          <div className="rounded-md bg-highlight p-4 text-sm text-muted">
            Playlists you import will show up here.
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {playlists.map((pl) => (
              <li key={pl.id}>
                <Link
                  href={`/playlist/${pl.id}`}
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-muted transition hover:bg-white/10 hover:text-white"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-highlight text-xs">
                    ♪
                  </span>
                  <span className="truncate">{pl.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
