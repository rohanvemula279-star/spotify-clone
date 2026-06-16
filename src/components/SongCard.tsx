"use client";

import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import type { Track } from "@/lib/types";

// Grid song card: cover + title, a hover play button, and quick actions to
// save, download (offline), and add to a folder. Clicking the card sets
// `queue` as the active queue and starts this track.
export function SongCard({ track, queue }: { track: Track; queue: Track[] }) {
  const { playWithId, track: current, isPlaying } = usePlayer();
  const {
    isSaved,
    saveSong,
    unsaveSong,
    download,
    downloaded,
    downloading,
    folders,
    addToFolder,
    createFolder,
  } = useLibrary();

  const [menuOpen, setMenuOpen] = useState(false);
  const isCurrent = current?.id === track.id;
  const saved = isSaved(track.id);
  const isDownloaded = downloaded.has(track.id);
  const progress = downloading[track.id];

  function stop(e: React.MouseEvent) {
    e.stopPropagation();
  }

  async function onDownload(e: React.MouseEvent) {
    stop(e);
    if (isDownloaded || progress !== undefined) return;
    try {
      await download(track);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function onAddToFolder(e: React.MouseEvent, folderId: string) {
    stop(e);
    await addToFolder(folderId, track);
    setMenuOpen(false);
  }

  async function onNewFolder(e: React.MouseEvent) {
    stop(e);
    const name = prompt("New folder name");
    if (!name) return;
    const folder = await createFolder(name);
    if (folder) await addToFolder(folder.id, track);
    setMenuOpen(false);
  }

  return (
    <div
      onClick={() => playWithId(track.id, queue)}
      className="group relative w-[170px] shrink-0 cursor-pointer rounded-lg bg-elevated p-4 text-left transition hover:bg-highlight"
    >
      <div className="relative mb-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-highlight to-elevated shadow-lg">
        {track.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.thumbnail}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-4xl text-muted">♪</span>
        )}

        {/* Hover play button */}
        <span
          className={`absolute bottom-2 right-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-black shadow-xl transition-all duration-200 ${
            isCurrent && isPlaying
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
            <path
              d={isCurrent && isPlaying ? "M6 5h4v14H6zm8 0h4v14h-4z" : "M8 5v14l11-7z"}
            />
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

      {/* Quick actions */}
      <div className="mt-2 flex items-center gap-3 text-muted">
        <button
          onClick={(e) => {
            stop(e);
            void (saved ? unsaveSong(track.id) : saveSong(track));
          }}
          aria-label={saved ? "Remove from Liked" : "Save to Liked"}
          className={`transition hover:text-white ${saved ? "text-accent" : ""}`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
            <path d="M12 21s-7.5-4.7-10-9.3C.5 8.3 2.2 5 5.5 5 7.4 5 9 6 12 8c3-2 4.6-3 6.5-3 3.3 0 5 3.3 3.5 6.7C19.5 16.3 12 21 12 21z" />
          </svg>
        </button>

        <button
          onClick={onDownload}
          aria-label="Download for offline"
          className={`transition hover:text-white ${
            isDownloaded ? "text-accent" : ""
          }`}
        >
          {progress !== undefined ? (
            <span className="text-[10px] font-semibold tabular-nums">
              {Math.round(progress * 100)}%
            </span>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path
                d={
                  isDownloaded
                    ? "M9 16.2l-3.5-3.5L4 14.2 9 19.2 20 8.2l-1.5-1.5z"
                    : "M5 20h14v-2H5v2zM12 3v10l4-4 1.4 1.4L12 16 6.6 10.4 8 9l4 4z"
                }
              />
            </svg>
          )}
        </button>

        <div className="relative">
          <button
            onClick={(e) => {
              stop(e);
              setMenuOpen((o) => !o);
            }}
            aria-label="Add to folder"
            className="transition hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </button>

          {menuOpen && (
            <div
              onClick={stop}
              className="absolute bottom-6 left-0 z-20 w-44 rounded-md border border-white/10 bg-base p-1 text-sm shadow-2xl"
            >
              <button
                onClick={onNewFolder}
                className="block w-full rounded px-3 py-2 text-left text-white hover:bg-white/10"
              >
                + New folder
              </button>
              {folders.length > 0 && <div className="my-1 h-px bg-white/10" />}
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={(e) => onAddToFolder(e, f.id)}
                  className="block w-full truncate rounded px-3 py-2 text-left text-muted hover:bg-white/10 hover:text-white"
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
