// --- JioSaavn client (browser) -----------------------------------------
//
// Thin client that calls OUR OWN backend proxy (/api/saavn/*) instead of
// hitting JioSaavn or flaky public mirrors directly. The server route does
// the JioSaavn call + DES decryption and hands back clean Track objects, so
// there are no CORS problems and no dependency on third-party uptime.

import type { Track } from "./types";
import { detectLanguage } from "./recommendation/language";

// Allow pointing at an absolute backend (e.g. the deployed site) when the
// app runs inside the Android WebView where relative /api paths won't resolve.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "";

async function getJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Search the catalog. */
export async function searchTracks(query: string, limit = 30): Promise<Track[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await getJSON<{ results: Track[] }>(
    `/api/saavn/search?q=${encodeURIComponent(q)}&n=${limit}`
  );
  return data?.results ?? [];
}

/** Search restricted to Telugu-language results. */
export async function searchTeluguTracks(query: string, limit = 30): Promise<Track[]> {
  const tracks = await searchTracks(query, limit);
  return tracks.filter((t) => (t.language || detectLanguage(t)) === "telugu");
}

/** Autocomplete suggestions for the search box. */
export async function searchSuggestions(query: string): Promise<string[]> {
  if (query.trim().length < 2) return [];
  const data = await getJSON<{ suggestions: string[] }>(
    `/api/saavn/suggestions?q=${encodeURIComponent(query.trim())}`
  );
  return data?.suggestions ?? [];
}

/**
 * Songs related to a seed track (JioSaavn "song radio" station). The core
 * source for autoplay / "more like this" recommendations.
 */
export async function getRelatedTracks(seedId: string, k = 15): Promise<Track[]> {
  if (!seedId) return [];
  const data = await getJSON<{ results: Track[] }>(
    `/api/saavn/related?id=${encodeURIComponent(seedId)}&k=${k}`
  );
  return data?.results ?? [];
}

/**
 * Resolve a fresh playable audio URL for a track id. JioSaavn CDN URLs can
 * expire, so this re-fetches the song on demand right before playback.
 */
export async function fetchAudioUrl(id: string): Promise<string | null> {
  const data = await getJSON<{ track: Track | null }>(
    `/api/saavn/song?id=${encodeURIComponent(id)}`
  );
  return data?.track?.audioUrl ?? null;
}
