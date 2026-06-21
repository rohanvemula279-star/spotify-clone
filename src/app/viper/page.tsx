"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterPills } from "@/components/viper/FilterPills";
import { DiscoverCard } from "@/components/viper/DiscoverCard";
import { PlaylistCard } from "@/components/viper/PlaylistCard";
import { usePlayer } from "@/context/PlayerContext";
import { searchTracks, getRelatedTracks } from "@/lib/saavn";
import type { Track } from "@/lib/types";
import {
  detectLanguage,
  getTeluguSearchQueries,
} from "@/lib/recommendation/language";

// A gradient per row so cards still look good before/without cover art.
const GRADIENTS = [
  "linear-gradient(135deg, #FF6B9D 0%, #A855F7 100%)",
  "linear-gradient(135deg, #00FF66 0%, #006633 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
  "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
  "linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)",
  "linear-gradient(135deg, #14B8A6 0%, #0EA5E9 100%)",
  "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)",
  "linear-gradient(135deg, #F97316 0%, #DB2777 100%)",
];

type HomeMode = "music" | "podcasts" | "speech" | "telugu";

const PODCAST_QUERIES = [
  "podcast",
  "interview",
  "story",
  "audiobook",
  "lecture",
  "motivational speech",
  "comedy podcast",
  "telugu podcast",
  "telugu pravachanam",
  "telugu stories",
];

const SPEECH_QUERIES = [
  "speech",
  "spoken word",
  "motivational speech",
  "motivational",
  "lecture",
  "motivational interview",
  "katha",
  "pravachanam",
  "telugu speech",
  "telugu pravachanam",
];

const TELUGU_MODE_QUERIES = getTeluguSearchQueries();

const FILTER_QUERIES_BY_MODE: Record<HomeMode, Record<string, string[]>> = {
  music: {
    All: ["trending", "telugu hits", "bollywood hits", "english top songs"],
    "New Release": ["new releases", "latest telugu songs", "latest hindi songs"],
    Trending: ["trending", "top songs 2026", "viral hits"],
  },
  telugu: {
    All: TELUGU_MODE_QUERIES,
    "New Release": [...TELUGU_MODE_QUERIES.slice(0, 7), "telugu 2026", "telugu 2025"],
    Trending: ["telugu trending", "telugu hits", "tollywood hits", "telugu 2026", "telugu mass songs"],
  },
  podcasts: {
    All: [...PODCAST_QUERIES],
    "New Release": ["new podcast episodes", "latest podcast", "podcast trending", "telugu podcast latest", "telugu podcast"],
    Trending: ["podcast trending", "top podcasts", "viral podcast", "telugu podcast trending"],
  },
  speech: {
    All: [...SPEECH_QUERIES],
    "New Release": ["new speech", "latest speech", "latest pravachanam", "latest telugu speech"],
    Trending: ["motivational speech", "speech trending", "telugu speech", "telugu pravachanam trending"],
  },
};

export default function ViperHomePage() {
  const router = useRouter();
  const { track, isPlaying, playWithId } = usePlayer();
  const [activeFilter, setActiveFilter] = useState("All");
  const [mode, setMode] = useState<HomeMode>("telugu");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommended, setRecommended] = useState<Track[]>([]);

  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  const queriesForModeAndFilter = useMemo(() => {
    const byFilter = FILTER_QUERIES_BY_MODE[mode] ?? FILTER_QUERIES_BY_MODE.music;
    return byFilter[activeFilter] ?? byFilter.All ?? [];
  }, [mode, activeFilter]);

  // Load (and reload) the feed whenever the filter OR mode changes.
  useEffect(() => {
    let active = true;
    setLoading(true);

    async function load() {
      const results = await Promise.all(
        queriesForModeAndFilter.map((q) => searchTracks(q, 12).catch(() => [] as Track[]))
      );

      // Flatten + dedupe by id so the same hit doesn't appear twice.
      const seen = new Set<string>();
      const unique: Track[] = [];
      for (const t of results.flat()) {
        if (t && !seen.has(t.id)) {
          seen.add(t.id);
          unique.push(t);
        }
      }

      if (active) {
        setTracks(unique.slice(0, 14));
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [queriesForModeAndFilter]);

  function matchesMode(t: Track | undefined | null): boolean {
    if (!t) return false;
    const text = `${t.name} ${t.artist} ${t.album}`.toLowerCase();

    if (mode === "telugu") return detectLanguage(t) === "telugu";
    if (mode === "podcasts")
      return (
        text.includes("podcast") ||
        text.includes("interview") ||
        text.includes("audiobook") ||
        text.includes("lecture") ||
        text.includes("story") ||
        text.includes("katha")
      );
    if (mode === "speech")
      return (
        text.includes("speech") ||
        text.includes("spoken word") ||
        text.includes("pravachanam") ||
        text.includes("katha") ||
        text.includes("motivation") ||
        text.includes("lecture")
      );
    return true;
  }

  // "Made for you" — Echo Brain rail seeded from what you're playing.
  // For Podcasts/Speech/Telugu modes we also bias the rail output.
  const seedId =
    track?.id ||
    tracks.find((t) => matchesMode(t))?.id ||
    tracks[0]?.id;

  useEffect(() => {
    if (!seedId) return;
    let active = true;
    getRelatedTracks(seedId, 20).then((rel) => {
      if (!active) return;
      const filtered =
        mode === "music"
          ? rel
          : rel.filter((t) => matchesMode(t));
      setRecommended(filtered.slice(0, 12));
    });
    return () => {
      active = false;
    };
  }, [seedId, mode, tracks]);

  // Play a track and jump to the radial now-playing screen.
  function playTrack(t: Track, list: Track[] = tracks) {
    playWithId(t.id, list);
    router.push("/viper/now-playing");
  }

  // Discover card → start the whole list from the top.
  function playDiscover() {
    if (tracks.length > 0) playTrack(tracks[0]);
  }

  return (
    <div className="min-h-full bg-[#0F0F13] text-white">
      <div>
        <div className="flex-1">
          <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 md:px-8 md:pt-8 md:pb-10">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between md:mb-8">
              <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {greeting}
              </h1>
              <button
                onClick={() => router.push("/search")}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Search"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14z" />
                </svg>
              </button>
            </div>

            {/* Mode switcher + Filter Pills */}
            <div className="mb-5 md:mb-6">
              <div className="mb-3 flex flex-wrap gap-2">
                {(
                  [
                    { key: "music", label: "Music" },
                    { key: "podcasts", label: "Podcasts" },
                    { key: "speech", label: "Speech" },
                    { key: "telugu", label: "తెలుగు" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      mode === m.key
                        ? "border-[#00FF66]/60 bg-[#00FF66]/15 text-[#00FF66]"
                        : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <FilterPills active={activeFilter} onChange={setActiveFilter} />
            </div>

            {/* Discover weekly card */}
            <div className="mb-6 md:mb-8">
              <button
                onClick={playDiscover}
                className="block w-full text-left"
                disabled={loading || tracks.length === 0}
              >
                <DiscoverCard />
              </button>
            </div>

            {/* Made for you — Echo Brain recommendations */}
            {recommended.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white md:text-xl">
                    Made for you
                  </h2>
                  <span className="rounded-full bg-[#00FF66]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00FF66]">
                    Echo Brain
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                  {recommended.map((t) => {
                    const isActive = t.id === track?.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => playTrack(t, recommended)}
                        className="group flex w-[150px] flex-shrink-0 flex-col text-left"
                      >
                        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#1A1A22]">
                          {t.thumbnail && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={t.thumbnail}
                              alt={t.name}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                          )}
                          <div
                            className={`absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#00FF66] shadow-lg transition-all ${
                              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            }`}
                          >
                            <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-black">
                              <path d={isActive && isPlaying ? "M6 5h4v14H6zm8 0h4v14h-4z" : "M8 5v14l11-7z"} />
                            </svg>
                          </div>
                        </div>
                        <p
                          className={`mt-2 truncate text-sm font-semibold ${isActive ? "text-[#00FF66]" : "text-white"}`}
                        >
                          {t.name}
                        </p>
                        <p className="truncate text-xs text-[#7D898D]">{t.artist}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top daily playlists */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white md:text-xl">
                  Top daily playlists
                </h2>
                <button
                  onClick={() => router.push("/search")}
                  className="text-xs font-semibold text-[#7D898D] hover:text-white"
                >
                  See all
                </button>
              </div>

              {loading ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-2xl bg-[#1A1A22] p-2"
                    >
                      <div className="h-14 w-14 animate-pulse rounded-xl bg-white/5" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
                        <div className="h-2.5 w-1/3 animate-pulse rounded bg-white/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {tracks.map((t, i) => {
                    const isActive = t.id === track?.id;
                    return (
                      <PlaylistCard
                        key={t.id}
                        thumbnailGradient={GRADIENTS[i % GRADIENTS.length]}
                        thumbnail={t.thumbnail}
                        title={t.name}
                        subtitle={t.artist}
                        active={isActive}
                        playing={isActive && isPlaying}
                        onClick={() => playTrack(t)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
