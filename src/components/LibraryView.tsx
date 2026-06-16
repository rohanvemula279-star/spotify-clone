"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLibrary } from "@/context/LibraryContext";
import { SongCard } from "./SongCard";
import type { Track } from "@/lib/types";

type Tab = "saved" | "offline" | "playlists" | "folder";

export function LibraryView({ folderId }: { folderId?: string }) {
  const {
    songs,
    folders,
    downloaded,
    removeFolder,
    removeDownload,
    createFolder,
  } = useLibrary();
  const [tab, setTab] = useState<Tab>(folderId ? "folder" : "saved");

  async function onCreatePlaylist() {
    const name = prompt("Playlist name");
    if (name == null) return;
    await createFolder(name);
    setTab("playlists");
  }

  const activeFolder = folders.find((f) => f.id === folderId);

  // Songs are stored as SavedSong (a superset of Track), usable directly.
  const list: Track[] = useMemo(() => {
    if (tab === "offline") return songs.filter((s) => downloaded.has(s.id));
    if (tab === "folder" && activeFolder)
      return activeFolder.trackIds
        .map((id) => songs.find((s) => s.id === id))
        .filter((s): s is (typeof songs)[number] => Boolean(s));
    return songs;
  }, [tab, songs, downloaded, activeFolder]);

  function TabButton({ id, label }: { id: Tab; label: string }) {
    return (
      <button
        onClick={() => setTab(id)}
        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
          tab === id
            ? "bg-white text-black"
            : "bg-white/10 text-muted hover:text-white"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          {tab === "folder" && activeFolder
            ? `📁 ${activeFolder.name}`
            : "Your Library"}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreatePlaylist}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-black hover:scale-[1.02]"
          >
            + New playlist
          </button>
          {tab === "folder" && activeFolder && (
            <button
              onClick={() => {
                if (confirm(`Delete playlist "${activeFolder.name}"?`)) {
                  void removeFolder(activeFolder.id);
                  setTab("playlists");
                }
              }}
              className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-red-300 hover:bg-white/15"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <TabButton id="saved" label={`Liked (${songs.length})`} />
        <TabButton id="offline" label={`Offline (${downloaded.size})`} />
        <TabButton id="playlists" label={`Playlists (${folders.length})`} />
        {activeFolder && <TabButton id="folder" label={activeFolder.name} />}
      </div>

      {/* Playlists overview: a grid of every playlist. */}
      {tab === "playlists" ? (
        folders.length === 0 ? (
          <div className="rounded-lg bg-elevated p-8 text-center text-muted">
            No playlists yet. Tap “+ New playlist” to create one.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {folders.map((f) => (
              <Link
                key={f.id}
                href={`/library?folder=${encodeURIComponent(f.id)}`}
                className="rounded-lg bg-elevated p-4 transition hover:bg-highlight"
              >
                <div className="mb-3 flex aspect-square w-full items-center justify-center rounded-md bg-gradient-to-br from-highlight to-elevated text-4xl">
                  📁
                </div>
                <div className="truncate text-sm font-bold text-white">
                  {f.name}
                </div>
                <div className="text-xs text-muted">
                  {f.trackIds.length} song{f.trackIds.length === 1 ? "" : "s"}
                </div>
              </Link>
            ))}
          </div>
        )
      ) : list.length === 0 ? (
        <div className="rounded-lg bg-elevated p-8 text-center text-muted">
          {tab === "offline"
            ? "No downloaded songs yet. Tap the download icon on any song to keep it offline."
            : tab === "folder"
            ? "This folder is empty. Use the + on a song to add it here."
            : "Nothing saved yet. Search for music and tap the heart to save it."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {list.map((t) => (
            <div key={t.id} className="relative">
              <SongCard track={t} queue={list} />
              {tab === "offline" && (
                <button
                  onClick={() => void removeDownload(t.id)}
                  className="absolute right-2 top-2 z-10 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-black"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
