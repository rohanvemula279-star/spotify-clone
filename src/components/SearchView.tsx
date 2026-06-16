"use client";

import { useEffect, useRef, useState } from "react";
import type { Track } from "@/lib/types";
import {
  searchYoutube,
  YoutubeKeyMissingError,
  YoutubeQuotaError,
} from "@/lib/youtube";
import { SongCard } from "./SongCard";
import { GenreCard } from "./GenreCard";

const GENRES = [
  { title: "Pop", color: "#8d67ab" },
  { title: "Hip-Hop", color: "#ba5d07" },
  { title: "Telugu", color: "#1e3264" },
  { title: "Bollywood", color: "#e8115b" },
  { title: "Rock", color: "#e91429" },
  { title: "Chill", color: "#477d95" },
  { title: "Workout", color: "#777777" },
  { title: "Romance", color: "#dc148c" },
];

export function SearchView({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(term: string) {
    const q = term.trim();
    if (!q) return;
    setQuery(q);
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const results = await searchYoutube(q);
      setTracks(results);
    } catch (err) {
      setTracks([]);
      if (err instanceof YoutubeKeyMissingError)
        setError(
          "No YouTube API key set. Add one in Settings to search."
        );
      else if (err instanceof YoutubeQuotaError) setError((err as Error).message);
      else setError("Search failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-run a search when opened with ?q=... (header box / genre tile).
  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current && initialQuery.trim()) {
      didInit.current = true;
      void runSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  return (
    <div className="p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch(query);
        }}
        className="mb-6"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any song, artist, or album…"
          className="w-full max-w-md rounded-full bg-white/10 px-5 py-3 text-sm text-white placeholder:text-muted focus:bg-white/15 focus:outline-none"
        />
      </form>

      {loading && <p className="text-muted">Searching…</p>}

      {error && !loading && (
        <div className="mb-6 rounded-lg bg-elevated p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Genre browse grid before any search has run. */}
      {!loading && !searched && (
        <>
          <h2 className="mb-4 text-xl font-bold text-white">Browse all</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {GENRES.map((g) => (
              <GenreCard
                key={g.title}
                title={g.title}
                color={g.color}
                onClick={() => void runSearch(g.title)}
              />
            ))}
          </div>
        </>
      )}

      {!loading && searched && !error && tracks.length === 0 && (
        <p className="text-muted">No results.</p>
      )}

      {tracks.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {tracks.map((t) => (
            <SongCard key={t.id} track={t} queue={tracks} />
          ))}
        </div>
      )}
    </div>
  );
}
