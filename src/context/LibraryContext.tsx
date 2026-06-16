"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Track } from "@/lib/types";
import { useAuth } from "./AuthContext";
import {
  type Folder,
  type SavedSong,
  getSongs,
  putSong,
  deleteSong,
  getFolders,
  putFolder,
  deleteFolder,
  getBlobMeta,
  getBlob,
  putBlob,
  deleteBlob,
} from "@/lib/db";
import { resolvePlayable } from "@/lib/resolve";

interface LibraryContextValue {
  songs: SavedSong[];
  folders: Folder[];
  /** trackId -> true if a downloaded blob exists on-device. */
  downloaded: Set<string>;
  /** trackId -> 0..1 download progress (present only while downloading). */
  downloading: Record<string, number>;
  /** Bytes used by downloaded audio for the current user. */
  downloadBytes: number;

  isSaved: (id: string) => boolean;
  saveSong: (t: Track) => Promise<void>;
  unsaveSong: (id: string) => Promise<void>;

  createFolder: (name: string) => Promise<Folder | null>;
  removeFolder: (id: string) => Promise<void>;
  addToFolder: (folderId: string, t: Track) => Promise<void>;
  removeFromFolder: (folderId: string, trackId: string) => Promise<void>;

  download: (t: Track) => Promise<void>;
  removeDownload: (id: string) => Promise<void>;
  /** Returns a playable object-URL for a downloaded track, or null. */
  localUrl: (id: string) => Promise<string | null>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within <LibraryProvider>");
  return ctx;
}

function ownerKey(username: string): string {
  return username.trim().toLowerCase();
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const owner = user ? ownerKey(user.username) : null;

  const [songs, setSongs] = useState<SavedSong[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [downloadBytes, setDownloadBytes] = useState(0);
  const [downloading, setDownloading] = useState<Record<string, number>>({});

  // (Re)load everything when the active user changes.
  const reload = useCallback(async () => {
    if (!owner) {
      setSongs([]);
      setFolders([]);
      setDownloaded(new Set());
      setDownloadBytes(0);
      return;
    }
    try {
      const [s, f, meta] = await Promise.all([
        getSongs(owner),
        getFolders(owner),
        getBlobMeta(owner),
      ]);
      setSongs(s);
      setFolders(f);
      setDownloaded(meta.ids);
      setDownloadBytes(meta.totalBytes);
    } catch {
      /* IndexedDB unavailable — leave empty */
    }
  }, [owner]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // --- saved songs -----------------------------------------------------
  const isSaved = useCallback(
    (id: string) => songs.some((s) => s.id === id),
    [songs]
  );

  const saveSong = useCallback(
    async (t: Track) => {
      if (!owner) return;
      await putSong(owner, t);
      await reload();
    },
    [owner, reload]
  );

  const unsaveSong = useCallback(
    async (id: string) => {
      if (!owner) return;
      await deleteSong(owner, id);
      await reload();
    },
    [owner, reload]
  );

  // --- folders ---------------------------------------------------------
  const createFolder = useCallback(
    async (name: string) => {
      if (!owner) return null;
      const folder: Folder = {
        id: `${owner}:${Date.now()}:${Math.round(performance.now())}`,
        owner,
        name: name.trim() || "Untitled",
        trackIds: [],
        createdAt: Date.now(),
      };
      await putFolder(folder);
      await reload();
      return folder;
    },
    [owner, reload]
  );

  const removeFolder = useCallback(
    async (id: string) => {
      await deleteFolder(id);
      await reload();
    },
    [reload]
  );

  const addToFolder = useCallback(
    async (folderId: string, t: Track) => {
      if (!owner) return;
      // Saving the track metadata too so the folder can render it offline.
      await putSong(owner, t);
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) return;
      if (!folder.trackIds.includes(t.id)) {
        await putFolder({ ...folder, trackIds: [...folder.trackIds, t.id] });
      }
      await reload();
    },
    [owner, folders, reload]
  );

  const removeFromFolder = useCallback(
    async (folderId: string, trackId: string) => {
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) return;
      await putFolder({
        ...folder,
        trackIds: folder.trackIds.filter((id) => id !== trackId),
      });
      await reload();
    },
    [folders, reload]
  );

  // --- downloads -------------------------------------------------------
  const download = useCallback(
    async (t: Track) => {
      if (!owner) return;
      if (downloaded.has(t.id)) return;

      // Resolve to a playable JioSaavn URL first (YouTube has no audio).
      const playable = await resolvePlayable(t);
      const src = playable?.audioUrl;
      if (!src) throw new Error("No downloadable audio source for this track.");

      setDownloading((d) => ({ ...d, [t.id]: 0 }));
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`Download failed (${res.status})`);

        // Stream so we can report progress when Content-Length is known.
        const total = Number(res.headers.get("Content-Length") || 0);
        let blob: Blob;
        if (res.body && total > 0) {
          const reader = res.body.getReader();
          const chunks: Uint8Array[] = [];
          let received = 0;
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              received += value.length;
              setDownloading((d) => ({ ...d, [t.id]: received / total }));
            }
          }
          blob = new Blob(chunks as BlobPart[], {
            type: res.headers.get("Content-Type") || "audio/mpeg",
          });
        } else {
          blob = await res.blob();
        }

        // Persist the audio AND the metadata so it plays offline from Library.
        await putBlob(owner, t.id, blob);
        await putSong(owner, { ...(playable ?? t), downloaded: true });
        await reload();
      } finally {
        setDownloading((d) => {
          const next = { ...d };
          delete next[t.id];
          return next;
        });
      }
    },
    [owner, downloaded, reload]
  );

  const removeDownload = useCallback(
    async (id: string) => {
      if (!owner) return;
      await deleteBlob(owner, id);
      await reload();
    },
    [owner, reload]
  );

  const localUrl = useCallback(
    async (id: string) => {
      if (!owner) return null;
      const blob = await getBlob(owner, id);
      return blob ? URL.createObjectURL(blob) : null;
    },
    [owner]
  );

  const value = useMemo<LibraryContextValue>(
    () => ({
      songs,
      folders,
      downloaded,
      downloading,
      downloadBytes,
      isSaved,
      saveSong,
      unsaveSong,
      createFolder,
      removeFolder,
      addToFolder,
      removeFromFolder,
      download,
      removeDownload,
      localUrl,
    }),
    [
      songs,
      folders,
      downloaded,
      downloading,
      downloadBytes,
      isSaved,
      saveSong,
      unsaveSong,
      createFolder,
      removeFolder,
      addToFolder,
      removeFromFolder,
      download,
      removeDownload,
      localUrl,
    ]
  );

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}
