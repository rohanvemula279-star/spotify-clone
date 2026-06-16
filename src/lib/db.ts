// --- IndexedDB wrapper (on-device library + downloaded audio) ---------
//
// Everything the user saves lives here, on the phone, and never leaves it:
//   • songs    — saved track metadata (per user)
//   • folders  — user-created folders/playlists (per user)
//   • blobs    — downloaded audio files as Blobs (per user), so playback
//                works fully offline and the audio "occupies their mobile".
//
// We use raw IndexedDB (no dependency) so it runs in the browser and the
// Capacitor Android WebView with nothing to install. Records are namespaced
// by `owner` (username) and we filter by an index, giving each account its
// own isolated library on the shared device.

import type { Track } from "./types";

const DB_NAME = "spotube";
const DB_VERSION = 1;

export const STORES = {
  songs: "songs",
  folders: "folders",
  blobs: "blobs",
} as const;

export interface SavedSong extends Track {
  owner: string; // username
  key: string; // `${owner}:${id}`
  savedAt: number;
}

export interface Folder {
  id: string;
  owner: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}

export interface AudioBlobRecord {
  key: string; // `${owner}:${id}`
  owner: string;
  trackId: string;
  blob: Blob;
  mime: string;
  size: number;
  savedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.songs)) {
        const s = db.createObjectStore(STORES.songs, { keyPath: "key" });
        s.createIndex("owner", "owner", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.folders)) {
        const f = db.createObjectStore(STORES.folders, { keyPath: "id" });
        f.createIndex("owner", "owner", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.blobs)) {
        const b = db.createObjectStore(STORES.blobs, { keyPath: "key" });
        b.createIndex("owner", "owner", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(
  store: string,
  mode: IDBTransactionMode
): Promise<IDBObjectStore> {
  return openDB().then((db) =>
    db.transaction(store, mode).objectStore(store)
  );
}

function reqAsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** All records for an owner via the "owner" index. */
async function allByOwner<T>(store: string, owner: string): Promise<T[]> {
  const os = await tx(store, "readonly");
  const idx = os.index("owner");
  return reqAsPromise(idx.getAll(owner) as IDBRequest<T[]>);
}

// --- songs -------------------------------------------------------------

export async function putSong(owner: string, track: Track): Promise<void> {
  const os = await tx(STORES.songs, "readwrite");
  const rec: SavedSong = {
    ...track,
    owner,
    key: `${owner}:${track.id}`,
    savedAt: Date.now(),
  };
  await reqAsPromise(os.put(rec));
}

export async function deleteSong(owner: string, id: string): Promise<void> {
  const os = await tx(STORES.songs, "readwrite");
  await reqAsPromise(os.delete(`${owner}:${id}`));
}

export async function getSongs(owner: string): Promise<SavedSong[]> {
  const rows = await allByOwner<SavedSong>(STORES.songs, owner);
  return rows.sort((a, b) => b.savedAt - a.savedAt);
}

// --- folders -----------------------------------------------------------

export async function putFolder(folder: Folder): Promise<void> {
  const os = await tx(STORES.folders, "readwrite");
  await reqAsPromise(os.put(folder));
}

export async function deleteFolder(id: string): Promise<void> {
  const os = await tx(STORES.folders, "readwrite");
  await reqAsPromise(os.delete(id));
}

export async function getFolders(owner: string): Promise<Folder[]> {
  const rows = await allByOwner<Folder>(STORES.folders, owner);
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

// --- audio blobs -------------------------------------------------------

export async function putBlob(
  owner: string,
  trackId: string,
  blob: Blob
): Promise<void> {
  const os = await tx(STORES.blobs, "readwrite");
  const rec: AudioBlobRecord = {
    key: `${owner}:${trackId}`,
    owner,
    trackId,
    blob,
    mime: blob.type || "audio/mpeg",
    size: blob.size,
    savedAt: Date.now(),
  };
  await reqAsPromise(os.put(rec));
}

export async function getBlob(
  owner: string,
  trackId: string
): Promise<Blob | null> {
  const os = await tx(STORES.blobs, "readonly");
  const rec = await reqAsPromise(
    os.get(`${owner}:${trackId}`) as IDBRequest<AudioBlobRecord | undefined>
  );
  return rec?.blob ?? null;
}

export async function hasBlob(
  owner: string,
  trackId: string
): Promise<boolean> {
  const os = await tx(STORES.blobs, "readonly");
  const key = await reqAsPromise(
    os.getKey(`${owner}:${trackId}`) as IDBRequest<IDBValidKey | undefined>
  );
  return key !== undefined;
}

export async function deleteBlob(
  owner: string,
  trackId: string
): Promise<void> {
  const os = await tx(STORES.blobs, "readwrite");
  await reqAsPromise(os.delete(`${owner}:${trackId}`));
}

export async function getBlobMeta(
  owner: string
): Promise<{ ids: Set<string>; totalBytes: number }> {
  const rows = await allByOwner<AudioBlobRecord>(STORES.blobs, owner);
  const ids = new Set<string>();
  let totalBytes = 0;
  for (const r of rows) {
    ids.add(r.trackId);
    totalBytes += r.size;
  }
  return { ids, totalBytes };
}

/** Wipe every record belonging to an owner (used on account deletion). */
export async function wipeOwner(owner: string): Promise<void> {
  for (const store of [STORES.songs, STORES.folders, STORES.blobs]) {
    // Collect keys in one transaction, then delete in a fresh one — issuing
    // new requests on a transaction after an await can throw once it has
    // auto-committed.
    const readStore = await tx(store, "readonly");
    const keys = await reqAsPromise(
      readStore.index("owner").getAllKeys(owner) as IDBRequest<IDBValidKey[]>
    );
    for (const k of keys) {
      const writeStore = await tx(store, "readwrite");
      await reqAsPromise(writeStore.delete(k));
    }
  }
}
