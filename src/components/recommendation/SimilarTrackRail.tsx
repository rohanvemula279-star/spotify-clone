"use client";

import { useEffect, useState, useCallback } from "react";
import type { Track } from "@/lib/types";
import type { SimilarityResult } from "@/lib/recommendation";
import { usePlayer } from "@/context/PlayerContext";
import { SongCard, SongCardShimmer } from "@/components/spotube/SongCard";

interface Props {
  seed: Track | null;
  candidates: Track[];
  title?: string;
}

export function SimilarTrackRail({ seed, candidates, title = "Similar Tracks" }: Props) {
  const { track, isPlaying, playWithId } = usePlayer();
  const [results, setResults] = useState<SimilarityResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!seed || candidates.length === 0) return;
    let active = true;
    setLoading(true);
    import("@/lib/recommendation").then(({ getSimilarTracks }) => {
      const similar = getSimilarTracks(seed, candidates, undefined, 12);
      if (active) {
        setResults(similar);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [seed?.id, candidates.length]);

  const playTrack = useCallback(
    (id: string, list?: Track[]) => playWithId(id, list),
    [playWithId]
  );

  if (!seed || results.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-on-surface-dim uppercase tracking-wider">
        {title}
      </h3>
      {loading ? (
        <div className="flex gap-3 overflow-x-auto hide-scrollbar">
          {Array.from({ length: 6 }).map((_, i) => (
            <SongCardShimmer key={i} />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto hide-scrollbar">
          {results.slice(0, 10).map((r) => (
            <SongCard
              key={r.track.id}
              title={r.track.name}
              artist={r.track.artist}
              thumbnail={r.track.thumbnail ?? ""}
              isActive={r.track.id === track?.id}
              isPlaying={isPlaying}
              onClick={() => playTrack(r.track.id, results.map((x) => x.track))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
