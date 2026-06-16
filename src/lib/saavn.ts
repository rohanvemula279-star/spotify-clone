// --- JioSaavn client (runs in the browser, no backend / no secrets) ---
//
// A thin wrapper around a public, unauthenticated JioSaavn API instance.
// It powers BOTH search/metadata AND audio playback: JioSaavn serves the
// actual audio files (the `downloadUrl` list), so there is no YouTube, no
// Supabase, and nothing to keep secret. Everything here is safe to ship
// in the client bundle.

import type { Track } from "./types";

// Public JioSaavn API instance (saavn.dev project). Overridable at build
// time via NEXT_PUBLIC_SAAVN_API in case this instance ever goes down.
const API_BASE =
  process.env.NEXT_PUBLIC_SAAVN_API?.replace(/\/$/, "") ||
  "https://saavn.sumit.co";

interface SaavnDownload {
  quality: string; // "12kbps" ... "320kbps"
  url: string;
}
interface SaavnArtist {
  name: string;
}
interface SaavnImage {
  quality: string; // "50x50" | "150x150" | "500x500"
  url: string;
}
interface SaavnSong {
  id: string;
  name: string;
  duration?: number | null;
  album?: { name?: string } | null;
  downloadUrl?: SaavnDownload[];
  image?: SaavnImage[];
  artists?: { primary?: SaavnArtist[] };
}

// JioSaavn returns titles/artists with HTML entities ("It&#039;s You").
function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Pick the highest-bitrate stream from a downloadUrl list. */
function pickAudio(urls: SaavnDownload[] | undefined): string | null {
  if (!urls || urls.length === 0) return null;
  // The list is ordered low -> high bitrate, so the last entry is best
  // (usually 320kbps). Fall back to whatever is present.
  return urls[urls.length - 1]?.url ?? null;
}

/** Pick the highest-resolution cover image from an image list. */
function pickImage(images: SaavnImage[] | undefined): string | undefined {
  if (!images || images.length === 0) return undefined;
  // The list is ordered low -> high resolution, so the last entry is best
  // (usually 500x500). Fall back to whatever is present.
  return images[images.length - 1]?.url ?? undefined;
}

/** Join all primary artists into a single display string. */
function joinArtists(song: SaavnSong): string {
  const primary = song.artists?.primary ?? [];
  return primary
    .map((a) => a.name)
    .filter(Boolean)
    .map(decodeEntities)
    .join(", ");
}

function toTrack(song: SaavnSong): Track {
  return {
    id: song.id,
    name: decodeEntities(song.name),
    artist: joinArtists(song),
    album: song.album?.name ? decodeEntities(song.album.name) : "",
    duration: Number(song.duration) || 0,
    audioUrl: pickAudio(song.downloadUrl),
    thumbnail: pickImage(song.image),
  };
}

/** Search the JioSaavn catalog and map results to our Track contract. */
export async function searchTracks(
  query: string,
  limit = 30
): Promise<Track[]> {
  const url = new URL(`${API_BASE}/api/search/songs`);
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`JioSaavn search failed (${res.status})`);

  const data = (await res.json()) as {
    data?: { results?: SaavnSong[] };
  };
  return (data.data?.results ?? []).map(toTrack);
}

/**
 * Resolve a playable audio URL for a track id. Search results normally
 * already include one; this is the fallback for the rare case they don't.
 */
export async function fetchAudioUrl(id: string): Promise<string | null> {
  const res = await fetch(
    `${API_BASE}/api/songs/${encodeURIComponent(id)}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;

  const data = (await res.json()) as { data?: SaavnSong[] };
  return pickAudio(data.data?.[0]?.downloadUrl);
}
