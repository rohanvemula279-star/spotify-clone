"use client";

import { usePlayer } from "@/context/PlayerContext";
import type { Track } from "@/lib/types";

// Renders a playlist's tracks and lets the user click any one to load it
// into the bottom player bar (same resolve -> YouTube flow as search).
export function PlaylistView({
  name,
  tracks,
}: {
  name: string;
  tracks: Track[];
}) {
  const { playWithId, track: currentTrack, isPlaying } = usePlayer();

  return (
    <div className="p-6">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Playlist
        </p>
        <h1 className="text-3xl font-bold text-white">{name}</h1>
        <p className="mt-1 text-sm text-muted">
          {tracks.length} {tracks.length === 1 ? "song" : "songs"}
        </p>
      </header>

      {tracks.length === 0 ? (
        <p className="text-muted">This playlist is empty.</p>
      ) : (
        <ul className="flex flex-col">
          {tracks.map((track, i) => {
            const isCurrent = currentTrack?.spotifyId === track.spotifyId;
            return (
              <li
                key={track.spotifyId}
                onClick={() => playWithId(track.spotifyId, tracks)}
                className="group flex cursor-pointer items-center gap-4 rounded-md px-3 py-2 hover:bg-white/10"
              >
                <span className="w-5 text-right text-sm text-muted">
                  {isCurrent && isPlaying ? (
                    <span className="text-accent">♪</span>
                  ) : (
                    i + 1
                  )}
                </span>
                {track.albumArt ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={track.albumArt}
                    alt={track.name}
                    className="h-10 w-10 rounded"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-highlight" />
                )}
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-sm font-medium ${
                      isCurrent ? "text-accent" : "text-white"
                    }`}
                  >
                    {track.name}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {track.artist}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
