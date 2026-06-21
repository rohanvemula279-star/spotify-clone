// --- Hybrid resolver: YouTube metadata -> JioSaavn playable audio ------
//
// A YouTube search gives us the catalog (titles + videoIds) but no audio.
// To actually play/download, we look the song up on JioSaavn and use its
// direct CDN stream. The match is by "<title> <artist>" text search; the best
// candidate is cached per videoId so we only pay for the lookup once.

import type { Track } from "./types";
import { searchTracks } from "./saavn";
import { resolveAudioUrl } from "./innerTube";

// videoId -> resolved JioSaavn audio URL (or null if no match found).
const audioCache = new Map<string, string | null>();

// Cheap token-overlap score to pick the closest JioSaavn result.
function score(want: string, got: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  const a = new Set(norm(want));
  const b = norm(got);
  if (a.size === 0 || b.length === 0) return 0;
  let hits = 0;
  for (const tok of b) if (a.has(tok)) hits++;
  return hits / Math.max(a.size, b.length);
}

/**
 * Resolve a playable JioSaavn audio URL for a (YouTube or Saavn) track.
 * Returns the same track with `audioUrl` filled in, or null if no playable
 * source could be found anywhere.
 */
export async function resolvePlayable(track: Track): Promise<Track | null> {
  // Already playable (direct JioSaavn track, or previously resolved).
  if (track.audioUrl) return track;

  const cacheKey = track.videoId ?? track.id;
  if (audioCache.has(cacheKey)) {
    const url = audioCache.get(cacheKey) ?? null;
    return url ? { ...track, audioUrl: url } : null;
  }

  const query = `${track.name} ${track.artist}`.trim();
  let candidates: Track[] = [];
  try {
    candidates = await searchTracks(query, 8);
  } catch {
    candidates = [];
  }

  let best: Track | null = null;
  let bestScore = 0;
  const want = `${track.name} ${track.artist}`;
  for (const c of candidates) {
    if (!c.audioUrl) continue;
    const s = score(want, `${c.name} ${c.artist}`);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }

  // Require a minimum overlap so we don't play a wildly wrong song.
  let url = best && bestScore >= 0.2 ? best.audioUrl : null;

  // Fallback: try YouTube Music (InnerTune) when this is a YouTube-sourced track
  // and JioSaavn couldn't find a match.
  if (!url && track.videoId) {
    try {
      url = await resolveAudioUrl(track.videoId);
    } catch {
      /* ignore */
    }
  }

  audioCache.set(cacheKey, url);
  if (!url) return null;

  return {
    ...track,
    audioUrl: url,
    duration: track.duration || best?.duration || 0,
    album: track.album || best?.album || "",
    thumbnail: track.thumbnail || best?.thumbnail,
  };
}
