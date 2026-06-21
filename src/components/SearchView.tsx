"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Track } from "@/lib/types";
import { getRelatedTracks, searchTracks } from "@/lib/saavn";
import { detectLanguage } from "@/lib/recommendation/language";
import { usePlayer } from "@/context/PlayerContext";
import { SongCard } from "@/components/spotube/SongCard";
import { Icon } from "@/components/spotube/Icon";
import { SearchSuggestions } from "@/components/spotube/SearchSuggestions";

const GENRES = [
  { title: "Telugu", color: "#8B4513" },
  { title: "Pop", color: "#5B7C8A" },
  { title: "Hip-Hop", color: "#7C5B6E" },
  { title: "Rock", color: "#8A5B4A" },
  { title: "Bollywood", color: "#6E5B8A" },
  { title: "Chill", color: "#4A7C7C" },
  { title: "Workout", color: "#7C6E4A" },
  { title: "Romance", color: "#8A5B6E" },
  { title: "Party", color: "#6E7C4A" },
];

export function SearchView({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const { track, isPlaying, playWithId } = usePlayer();
  const [query, setQuery] = useState(initialQuery);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (!q) return;
    setQuery(q);
    setLoading(true);
    setSearched(true);
    try {
      const results = await searchTracks(q, 30);

      const teluguSearch: Track[] = [];
      const hindiSearch: Track[] = [];
      const otherSearch: Track[] = [];

      for (const t of results) {
        const lang = detectLanguage(t);
        if (lang === "telugu") teluguSearch.push(t);
        else if (lang === "hindi") hindiSearch.push(t);
        else otherSearch.push(t);
      }

      // "Recommends first": fetch a related-rail seeded from the first Telugu
      // search hit (or the first hit) and then merge as:
      // 1) Telugu related, 2) Telugu search remaining, 3) Hindi related,
      // 4) Hindi search remaining, 5) others.
      const seed = teluguSearch[0] ?? results[0];
      let related: Track[] = [];
      if (seed?.id) {
        related = await getRelatedTracks(seed.id, 30);
      }

      const teluguRelated: Track[] = [];
      const hindiRelated: Track[] = [];
      const otherRelated: Track[] = [];

      for (const t of related) {
        const lang = detectLanguage(t);
        if (lang === "telugu") teluguRelated.push(t);
        else if (lang === "hindi") hindiRelated.push(t);
        else otherRelated.push(t);
      }

      const seen = new Set<string>();
      const pushUnique = (arr: Track[]) => {
        for (const t of arr) {
          if (!t?.id) continue;
          if (seen.has(t.id)) continue;
          seen.add(t.id);
          next.push(t);
        }
      };

      const next: Track[] = [];
      pushUnique(teluguRelated);
      pushUnique(teluguSearch);
      pushUnique(hindiRelated);
      pushUnique(hindiSearch);
      pushUnique(otherSearch);
      pushUnique(otherRelated);

      setTracks(next.slice(0, 30));
    } catch {
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current && initialQuery.trim()) {
      didInit.current = true;
      void runSearch(initialQuery);
    }
  }, [initialQuery, runSearch]);

  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setQuery(suggestion);
    void runSearch(suggestion);
  }, [runSearch]);

  return (
    <div className="pb-20 md:pb-4">
      <div className="px-4 pt-3 md:px-6">
        <div className="relative">
          <Icon
            path="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z"
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSearch(query);
            }}
            placeholder="Search songs, artists, albums..."
            className="w-full rounded-xl bg-elevated py-2.5 pl-9 pr-3 text-sm text-on-surface placeholder:text-dim focus:bg-elevated-hover focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setTracks([]);
                setSearched(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted"
            >
              <Icon path="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" size={14} />
            </button>
          )}
          <SearchSuggestions
            query={query}
            onSelect={handleSuggestionSelect}
            onSearch={runSearch}
            inputRef={inputRef}
          />
        </div>
      </div>

      {loading && (
        <div className="flex flex-wrap gap-3 px-4 pt-4 md:px-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[160px]">
              <div className="shimmer aspect-square rounded-xl" />
              <div className="mt-2 shimmer h-3.5 w-3/4 rounded" />
              <div className="mt-1 shimmer h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && !searched && (
        <>
          <h2 className="px-4 pt-5 pb-3 text-base font-semibold text-on-surface md:px-6">
            Browse all
          </h2>
          <div className="grid grid-cols-2 gap-2 px-4 md:grid-cols-4 md:gap-3 md:px-6">
            {GENRES.map((g) => (
              <button
                key={g.title}
                onClick={() => {
                  setQuery(g.title);
                  void runSearch(g.title);
                }}
                className="flex h-20 items-end rounded-xl p-3 text-sm font-medium text-white"
                style={{ backgroundColor: g.color }}
              >
                {g.title}
              </button>
            ))}
          </div>
        </>
      )}

      {!loading && searched && tracks.length === 0 && (
        <div className="px-4 pt-8 text-center text-muted md:px-6">
          No results found
        </div>
      )}

      {tracks.length > 0 && (
        <div className="flex flex-wrap gap-3 px-4 pt-4 md:px-6">
          {tracks.map((t) => (
            <SongCard
              key={t.id}
              title={t.name}
              artist={t.artist}
              thumbnail={t.thumbnail ?? ""}
              isActive={t.id === track?.id}
              isPlaying={isPlaying}
              onClick={() => playWithId(t.id, tracks)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
