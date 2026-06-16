"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLibrary } from "@/context/LibraryContext";

// App sidebar: brand, primary nav, and the user's playlists. Saved songs and
// downloads live on the Library page; playlists are listed here for quick
// access and can be created right from the header + button.
export function Sidebar() {
  const { folders, songs, downloaded, createFolder } = useLibrary();
  const router = useRouter();

  async function onCreate() {
    const name = prompt("Playlist name");
    if (name == null) return;
    const folder = await createFolder(name);
    if (folder) router.push(`/library?folder=${encodeURIComponent(folder.id)}`);
  }

  return (
    <aside className="m-2 flex w-64 flex-col gap-2">
      <div className="rounded-lg bg-elevated p-4">
        <div className="mb-6 flex items-center gap-2 px-2 text-xl font-bold">
          <span className="text-accent">●</span> Spotube
        </div>
        <nav className="flex flex-col gap-4 text-sm font-semibold text-muted">
          <Link href="/" className="flex items-center gap-3 text-white">
            <span>🏠</span> Home
          </Link>
          <Link href="/search" className="flex items-center gap-3 hover:text-white">
            <span>🔍</span> Search
          </Link>
          <Link href="/library" className="flex items-center gap-3 hover:text-white">
            <span>📚</span> Your Library
          </Link>
          <Link href="/settings" className="flex items-center gap-3 hover:text-white">
            <span>⚙️</span> Settings
          </Link>
        </nav>
      </div>

      <div className="scroll-area flex-1 overflow-y-auto rounded-lg bg-elevated p-4">
        <div className="mb-3 flex items-center justify-between px-2 text-sm font-semibold text-muted">
          <span>Playlists</span>
          <button
            onClick={onCreate}
            aria-label="Create playlist"
            className="flex h-6 w-6 items-center justify-center rounded-full text-lg leading-none transition hover:bg-white/10 hover:text-white"
          >
            +
          </button>
        </div>

        <div className="mb-3 px-2 text-xs text-muted">
          {songs.length} saved · {downloaded.size} offline
        </div>

        {folders.length === 0 ? (
          <div className="rounded-md bg-highlight p-4 text-sm text-muted">
            No playlists yet. Tap + to create one, then add songs with the +
            on any track.
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {folders.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/library?folder=${encodeURIComponent(f.id)}`}
                  className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-muted hover:bg-white/5 hover:text-white"
                >
                  <span className="truncate">📁 {f.name}</span>
                  <span className="text-xs">{f.trackIds.length}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
