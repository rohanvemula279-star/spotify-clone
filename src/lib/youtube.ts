// --- YouTube Data API v3 search (client-side, user-supplied key) -------
//
// Search uses the API key the user entered on first launch. The YouTube Data
// API only returns metadata (title / channel / thumbnail / videoId) — it does
// NOT provide a playable/downloadable audio stream. Actual audio is resolved
// separately against JioSaavn (see resolve.ts). Keeping these concerns split
// is what makes the hybrid "YouTube catalog + JioSaavn audio" model work.

import type { Track } from "./types";
import { getYoutubeKey } from "./storage";

const API_BASE = "https://www.googleapis.com/youtube/v3";

export class YoutubeKeyMissingError extends Error {
  constructor() {
    super("No YouTube API key set.");
    this.name = "YoutubeKeyMissingError";
  }
}

export class YoutubeQuotaError extends Error {
  constructor() {
    super(
      "YouTube search is unavailable right now — the API key's daily quota " +
        "may be exhausted or the key may be invalid. Check it in Settings."
    );
    this.name = "YoutubeQuotaError";
  }
}

interface YtThumb {
  url: string;
}
interface YtSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: { medium?: YtThumb; high?: YtThumb; default?: YtThumb };
  };
}
interface YtSearchResponse {
  items?: YtSearchItem[];
  error?: { errors?: { reason?: string }[] };
}

// YouTube titles are noisy: strip the boilerplate so the JioSaavn match and
// the displayed name are clean.
function cleanTitle(title: string): string {
  return title
    .replace(/\((?:official\s*)?(?:music\s*)?video\)/gi, "")
    .replace(/\[(?:official\s*)?(?:music\s*)?video\]/gi, "")
    .replace(/\((?:official\s*)?(?:lyric|lyrics|audio)\)/gi, "")
    .replace(/\[(?:official\s*)?(?:lyric|lyrics|audio)\]/gi, "")
    .replace(/\b(?:official\s*)?(?:music\s*)?video\b/gi, "")
    .replace(/\bfull\s+(?:song|video)\b/gi, "")
    .replace(/\bHD\b|\b4K\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Many channels are "<Artist> - Topic"; turn that into a clean artist name.
function cleanArtist(channel: string): string {
  return channel.replace(/\s*-\s*Topic$/i, "").trim();
}

function pickThumb(item: YtSearchItem): string | undefined {
  const t = item.snippet?.thumbnails;
  return t?.medium?.url ?? t?.high?.url ?? t?.default?.url;
}

function toTrack(item: YtSearchItem): Track | null {
  const videoId = item.id?.videoId;
  const rawTitle = item.snippet?.title;
  if (!videoId || !rawTitle) return null;
  return {
    id: videoId,
    videoId,
    name: cleanTitle(rawTitle),
    artist: cleanArtist(item.snippet?.channelTitle ?? ""),
    album: "",
    duration: 0,
    audioUrl: null,
    source: "youtube",
    thumbnail: pickThumb(item),
  };
}

/**
 * Search YouTube and map results to our Track contract (audio unresolved).
 * Throws YoutubeKeyMissingError / YoutubeQuotaError for clear UI handling.
 */
export async function searchYoutube(
  query: string,
  limit = 25
): Promise<Track[]> {
  const key = getYoutubeKey();
  if (!key) throw new YoutubeKeyMissingError();

  const url = new URL(`${API_BASE}/search`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("videoCategoryId", "10"); // Music
  url.searchParams.set("maxResults", String(Math.min(50, limit)));
  url.searchParams.set("q", query);
  url.searchParams.set("key", key);

  let res: Response;
  try {
    res = await fetch(url.toString(), { cache: "no-store" });
  } catch {
    throw new YoutubeQuotaError();
  }

  if (res.status === 403 || res.status === 400) throw new YoutubeQuotaError();
  if (!res.ok) throw new Error(`YouTube search failed (${res.status})`);

  const data = (await res.json()) as YtSearchResponse;
  const reasons = data.error?.errors?.map((e) => e.reason) ?? [];
  if (reasons.includes("quotaExceeded") || reasons.includes("keyInvalid"))
    throw new YoutubeQuotaError();

  return (data.items ?? [])
    .map(toTrack)
    .filter((t): t is Track => t !== null);
}

/**
 * Lightweight validity probe used by the onboarding screen: returns true if
 * the key can perform a search. Costs one search-quota unit.
 */
export async function validateYoutubeKey(key: string): Promise<boolean> {
  const url = new URL(`${API_BASE}/search`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("q", "music");
  url.searchParams.set("key", key.trim());
  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
