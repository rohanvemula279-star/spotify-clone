"use client";

import { usePlayer } from "@/context/PlayerContext";
import type { Track } from "@/lib/types";

// Grid song card with a hover play-button overlay. Clicking sets `queue`
// as the active queue and starts this track.
export function SongCard({ track, queue }: { track: Track; queue: Track[] }) {
  const { playWithId, track: current, isPlaying } = usePlayer();
  const isCurrent = current?.spotifyId === track.spotifyId;

  return (
    <button
      onClick={() => playWithId(track.spotifyId, queue)}
      className="group relative w-[170px] shrink-0 rounded-lg bg-elevated p-4 text-left transition hover:bg-highlight"
    >
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-md bg-highlight shadow-lg">
        {track.albumArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.albumArt}
            alt={track.name}
            className="h-full w-full object-cover"
          />
        ) : null}

        {/* Hover play button */}
        <span
          className={`absolute bottom-2 right-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-black shadow-xl transition-all duration-200 ${
            isCurrent && isPlaying
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
            <path d={isCurrent && isPlaying ? "M6 5h4v14H6zm8 0h4v14h-4z" : "M8 5v14l11-7z"} />
          </svg>
        </span>
      </div>

      <div
        className={`truncate text-sm font-bold ${
          isCurrent ? "text-accent" : "text-white"
        }`}
      >
        {track.name}
      </div>
      <div className="truncate text-xs text-muted">{track.artist}</div>
    </button>
  );
}
