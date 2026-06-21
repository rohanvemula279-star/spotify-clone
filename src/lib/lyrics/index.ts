import { getLrcLibLyrics } from "./lrclib";
import { getBetterLyrics } from "./betterlyrics";
import { getPaxsenixLyrics } from "./paxsenix";
import { getKugouLyrics } from "./kugou";
import type { LyricsResult } from "./types";

const LRC_CACHE = new Map<string, LyricsResult>();

function cacheKey(title: string, artist: string): string {
  return `${title.toLowerCase()}|${artist.toLowerCase()}`;
}

export type LyricsSource = "lrclib" | "betterlyrics" | "paxsenix" | "kugou";

const ALL_SOURCES: { name: LyricsSource; fetcher: typeof getLrcLibLyrics }[] = [
  { name: "betterlyrics", fetcher: getBetterLyrics },
  { name: "paxsenix", fetcher: getPaxsenixLyrics },
  { name: "lrclib", fetcher: getLrcLibLyrics },
  { name: "kugou", fetcher: getKugouLyrics },
];

/**
 * Fetch lyrics from all sources in parallel, returning the best result.
 * Priority: synced word-level > synced > plain
 */
export async function getLyrics(
  title: string,
  artist: string,
  duration: number,
  album?: string
): Promise<LyricsResult | null> {
  const key = cacheKey(title, artist);
  const cached = LRC_CACHE.get(key);
  if (cached) return cached;

  const results = await Promise.allSettled(
    ALL_SOURCES.map((s) =>
      s.fetcher(title, artist, duration, album).then(
        (r) => (r ? { ...r, source: s.name } : null)
      )
    )
  );

  const lyricsResults: LyricsResult[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      lyricsResults.push(r.value);
    }
  }

  if (lyricsResults.length === 0) return null;

  lyricsResults.sort((a, b) => {
    const aHasWords = a.lrc.words !== undefined && a.lrc.words.size > 0;
    const bHasWords = b.lrc.words !== undefined && b.lrc.words.size > 0;
    if (aHasWords && !bHasWords) return -1;
    if (!aHasWords && bHasWords) return 1;
    const aHasSynced = a.lrc.lines.length > 1;
    const bHasSynced = b.lrc.lines.length > 1;
    if (aHasSynced && !bHasSynced) return -1;
    if (!aHasSynced && bHasSynced) return 1;
    return 0;
  });

  const best = lyricsResults[0];
  LRC_CACHE.set(key, best);
  return best;
}

export function clearLyricsCache() {
  LRC_CACHE.clear();
}
