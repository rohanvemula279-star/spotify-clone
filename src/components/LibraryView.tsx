"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLibrary } from "@/context/LibraryContext";
import { SongCard } from "@/components/spotube/SongCard";
import { Icon } from "@/components/spotube/Icon";
import type { Track } from "@/lib/types";

type Tab = "saved" | "offline" | "playlists" | "folder";

export function LibraryView({ folderId }: { folderId?: string }) {
  const { songs, folders, downloaded, removeFolder, removeDownload, createFolder } = useLibrary();
  const [tab, setTab] = useState<Tab>(folderId ? "folder" : "saved");

  async function onCreatePlaylist() {
    const name = prompt("Playlist name");
    if (name == null) return;
    await createFolder(name);
    setTab("playlists");
  }

  const activeFolder = folders.find((f) => f.id === folderId);

  const list: Track[] = useMemo(() => {
    if (tab === "offline") return songs.filter((s) => downloaded.has(s.id));
    if (tab === "folder" && activeFolder)
      return activeFolder.trackIds
        .map((id) => songs.find((s) => s.id === id))
        .filter((s): s is (typeof songs)[number] => Boolean(s));
    return songs;
  }, [tab, songs, downloaded, activeFolder]);

  function TabBtn({ id, label }: { id: Tab; label: string }) {
    return (
      <button
        onClick={() => setTab(id)}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
          tab === id
            ? "bg-accent-dim text-accent"
            : "text-muted hover:bg-elevated hover:text-on-surface"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="pb-20 md:pb-4">
      <div className="flex items-center justify-between px-4 pt-3 md:px-6">
        <div className="flex flex-wrap gap-2">
          <TabBtn id="saved" label={`Liked (${songs.length})`} />
          <TabBtn id="offline" label={`Offline (${downloaded.size})`} />
          <TabBtn id="playlists" label={`Playlists (${folders.length})`} />
          {activeFolder && <TabBtn id="folder" label={activeFolder.name} />}
        </div>
        <button
          onClick={onCreatePlaylist}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-elevated hover:text-on-surface"
        >
          <Icon path="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" size={18} />
        </button>
      </div>

      {tab === "playlists" ? (
        folders.length === 0 ? (
          <div className="mx-4 mt-4 rounded-xl bg-elevated p-6 text-center text-sm text-muted md:mx-6">
            No playlists yet
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 px-4 pt-4 md:px-6">
            {folders.map((f) => (
              <Link
                key={f.id}
                href={`/library?folder=${encodeURIComponent(f.id)}`}
                className="w-[160px]"
              >
                <div className="flex aspect-square items-center justify-center rounded-xl bg-elevated">
                  <Icon path="M20 3H6c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14v-2H6V5h14V3zm-2 4H8v2h10V7zm0 4H8v2h10v-2z" size={36} className="text-dim" />
                </div>
                <p className="mt-2 truncate text-sm font-medium text-on-surface">{f.name}</p>
                <p className="text-xs text-muted">{f.trackIds.length} songs</p>
              </Link>
            ))}
          </div>
        )
      ) : list.length === 0 ? (
        <div className="mx-4 mt-4 rounded-xl bg-elevated p-6 text-center text-sm text-muted md:mx-6">
          {tab === "offline" ? "Download songs to listen offline" : tab === "folder" ? "This folder is empty" : "Save songs to your library"}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 px-4 pt-4 md:px-6">
          {list.map((t) => (
            <div key={t.id} className="relative">
              <SongCard title={t.name} artist={t.artist} thumbnail={t.thumbnail ?? ""} />
              {tab === "offline" && (
                <button
                  onClick={() => void removeDownload(t.id)}
                  className="absolute right-2 top-2 z-10 rounded-lg bg-base/80 px-2 py-0.5 text-[10px] font-medium text-error backdrop-blur-sm"
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
