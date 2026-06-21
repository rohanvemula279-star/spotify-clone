// --- JioSaavn client (browser) -----------------------------------------
//
// Calls JioSaavn's public API directly from the browser. DES decryption
// (encrypted_media_url → CDN URL) happens client-side via crypto-js.
// In the Capacitor WebView (Android APK) the native fetch from the View
// bypasses the browser same-origin / CORS restrictions so this works fine.
// On the open web the user's browser handles CORS normally.

import type { Track } from "./types";
import { detectLanguage } from "./recommendation/language";

export {
  searchSongs as searchTracks,
  getSuggestions as searchSuggestions,
  getSong,
  relatedSongs as getRelatedTracks,
} from "./saavn/client";

import { getSong } from "./saavn/client";

/** Search restricted to Telugu-language results. */
export async function searchTeluguTracks(query: string, limit = 30): Promise<Track[]> {
  const { searchSongs } = await import("./saavn/client");
  const tracks = await searchSongs(query, limit);
  return tracks.filter((t) => (t.language || detectLanguage(t)) === "telugu");
}

/**
 * Resolve a fresh playable audio URL for a track id. JioSaavn CDN URLs can
 * expire, so this re-fetches the song on demand right before playback.
 */
export async function fetchAudioUrl(id: string): Promise<string | null> {
  const track = await getSong(id);
  return track?.audioUrl ?? null;
}
