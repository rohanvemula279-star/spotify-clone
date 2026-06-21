"use client";

import { usePlayer } from "@/context/PlayerContext";
import { Icon } from "./Icon";

export function MiniPlayer({ onExpand }: { onExpand: () => void }) {
  const { track, isPlaying, isLoading, play, pause, time, seekBg, seekBar, seekSong } = usePlayer();

  const total = time.totalDuration.min * 60 + time.totalDuration.sec;
  const current = time.currentTime.min * 60 + time.currentTime.sec;
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="border-t border-border bg-surface">
      <div
        ref={seekBg}
        className="relative h-1.5 cursor-pointer bg-elevated md:h-0.5"
        onClick={(e) => { e.stopPropagation(); seekSong(e); }}
        onTouchStart={(e) => { e.stopPropagation(); seekSong(e); }}
        onTouchMove={(e) => { e.stopPropagation(); seekSong(e); }}
      >
        <div
          ref={seekBar}
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div
        className="flex cursor-pointer items-center gap-3 px-3 py-2 md:px-4"
        onClick={onExpand}
      >
        <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg">
          {track?.thumbnail ? (
            <img
              src={track.thumbnail}
              alt={track.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-elevated text-dim">
              <Icon path="M21 3H3v18h18V3zm-2 16H5V5h14v14zm-5-7c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" size={18} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-on-surface">
            {track?.name ?? (isLoading ? "Loading..." : "Nothing playing")}
          </p>
          <p className="truncate text-xs text-muted">
            {track?.artist ?? ""}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isPlaying) pause();
            else play();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-dim text-accent transition-colors hover:bg-accent/20 active:scale-95"
        >
          <Icon
            path={isPlaying ? "M6 5h4v14H6zm8 0h4v14h-4z" : "M8 5v14l11-7z"}
            size={18}
          />
        </button>
      </div>
    </div>
  );
}
