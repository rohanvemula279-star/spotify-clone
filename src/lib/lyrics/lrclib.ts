import { parseLrc } from "./lrc-parser";
import type { LyricsResult } from "./types";

const API_BASE = "https://lrclib.net";

interface LrclibTrack {
  id: number;
  trackName: string;
  artistName: string;
  duration: number;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

const titleCleanupPatterns = [
  /\s*\(.*?(official|video|audio|lyrics|lyric|visualizer|hd|hq|4k|remaster|remix|live|acoustic|version|edit|extended|radio|clean|explicit).*?\)/gi,
  /\s*\[.*?(official|video|audio|lyrics|lyric|visualizer|hd|hq|4k|remaster|remix|live|acoustic|version|edit|extended|radio|clean|explicit).*?\]/gi,
  /\s*【.*?】/g,
  /\s*\|.*$/g,
  /\s*-\s*(official|video|audio|lyrics|lyric|visualizer).*$/gi,
  /\s*\(feat\..*?\)/gi,
  /\s*\(ft\..*?\)/gi,
  /\s*feat\..*$/gi,
  /\s*ft\..*$/gi,
];

const artistSeparators = [
  " & ", " and ", ", ", " x ", " X ", " feat. ", " feat ",
  " ft. ", " ft ", " featuring ", " with ",
];

function cleanTitle(title: string): string {
  let cleaned = title.trim();
  for (const pattern of titleCleanupPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }
  return cleaned.trim();
}

function cleanArtist(artist: string): string {
  let cleaned = artist.trim();
  for (const separator of artistSeparators) {
    const idx = cleaned.toLowerCase().indexOf(separator.toLowerCase());
    if (idx !== -1) {
      cleaned = cleaned.slice(0, idx).trim();
      break;
    }
  }
  return cleaned.trim();
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
    }
  }
  return dp[m][n];
}

function calculateStringSimilarity(a: string, b: string): number {
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  const maxLen = Math.max(s1.length, s2.length);
  return 1.0 - levenshteinDistance(s1, s2) / maxLen;
}

async function queryLyricsWithParams(
  params: Record<string, string>
): Promise<LrclibTrack[]> {
  const url = new URL(`${API_BASE}/api/search`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    return (await res.json()) as LrclibTrack[];
  } catch {
    return [];
  }
}

async function queryLyrics(
  artist: string,
  title: string,
  album?: string
): Promise<LrclibTrack[]> {
  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);

  const strategies: (() => Promise<LrclibTrack[]>)[] = [
    () => queryLyricsWithParams({
      track_name: cleanedTitle,
      artist_name: cleanedArtist,
      ...(album ? { album_name: album } : {}),
    }),
    () => queryLyricsWithParams({ track_name: cleanedTitle }),
    () => queryLyricsWithParams({ q: `${cleanedArtist} ${cleanedTitle}` }),
    () => queryLyricsWithParams({ q: cleanedTitle }),
  ];

  if (cleanedTitle !== title.trim()) {
    strategies.push(() =>
      queryLyricsWithParams({
        track_name: title.trim(),
        artist_name: artist.trim(),
      })
    );
  }

  for (const strat of strategies) {
    const results = await strat();
    const filtered = results.filter(
      (r) => r.syncedLyrics != null || r.plainLyrics != null
    );
    if (filtered.length > 0) return filtered;
  }

  return [];
}

function findBestMatch(
  tracks: LrclibTrack[],
  trackName: string,
  artistName: string
): LrclibTrack | null {
  const normalizedTrack = trackName.trim().toLowerCase();
  const normalizedArtist = artistName.trim().toLowerCase();

  let best: LrclibTrack | null = null;
  let bestScore = -1;

  for (const track of tracks) {
    const trackSim = calculateStringSimilarity(
      normalizedTrack,
      track.trackName.trim().toLowerCase()
    );
    const artistSim = calculateStringSimilarity(
      normalizedArtist,
      track.artistName.trim().toLowerCase()
    );
    let score = (trackSim + artistSim) / 2;
    if (track.syncedLyrics != null) score += 0.1;

    if (score > bestScore) {
      bestScore = score;
      best = track;
    }
  }

  if (best && bestScore > 0.6) return best;
  return null;
}

export async function getLrcLibLyrics(
  title: string,
  artist: string,
  duration: number,
  album?: string
): Promise<LyricsResult | null> {
  const tracks = await queryLyrics(artist, title, album);
  if (tracks.length === 0) return null;

  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);

  let bestTrack: LrclibTrack | null = null;

  if (duration <= 0) {
    bestTrack = findBestMatch(tracks, cleanedTitle, cleanedArtist);
  } else {
    const synced = tracks
      .filter((t) => t.syncedLyrics != null)
      .sort(
        (a, b) =>
          Math.abs(a.duration - duration) - Math.abs(b.duration - duration)
      )
      .find((t) => Math.abs(t.duration - duration) <= 5);
    if (synced) {
      bestTrack = synced;
    } else {
      const anyTrack = tracks
        .filter((t) => t.plainLyrics != null || t.syncedLyrics != null)
        .sort(
          (a, b) =>
            Math.abs(a.duration - duration) - Math.abs(b.duration - duration)
        )
        .find((t) => Math.abs(t.duration - duration) <= 5);
      if (anyTrack) bestTrack = anyTrack;
    }
  }

  if (!bestTrack) return null;

  const raw = bestTrack.syncedLyrics ?? bestTrack.plainLyrics;
  if (!raw) return null;

  return {
    source: "lrclib",
    lrc: parseLrc(raw),
    raw,
  };
}
