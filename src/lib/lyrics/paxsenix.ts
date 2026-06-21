import { parseTTML, toLRC } from "./ttml-parser";
import { parseLrc } from "./lrc-parser";
import type { LyricsResult } from "./types";

const API_BASE = "https://lyrics.paxsenix.org";

interface SearchResult {
  id: string;
  songName?: string;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  artwork?: string;
}

interface LyricText {
  text: string;
  timestamp: number;
  endtime: number;
  duration: number;
  part?: boolean;
}

interface LyricsContent {
  timestamp: number;
  endtime: number;
  duration: number;
  structure?: string;
  text: LyricText[];
  background?: boolean;
  backgroundText?: LyricText[];
  oppositeTurn?: boolean;
}

interface LyricsResponse {
  type?: string;
  metadata?: { songwriters?: string[] };
  content?: LyricsContent[];
  elrc?: string;
  elrcMultiPerson?: string;
  ttmlContent?: string;
  plain?: string;
}

type SearchResponse = SearchResult[];

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
  /\s*\([^)]*\d{4}[^)]*\)/gi,
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

function displayName(r: SearchResult): string {
  return r.trackName || r.songName || "";
}

function displayArtist(r: SearchResult): string {
  return r.artistName || "";
}

async function search(query: string): Promise<SearchResult[]> {
  try {
    const url = new URL(`${API_BASE}/apple-music/search`);
    url.searchParams.set("q", query);
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    return (await res.json()) as SearchResponse;
  } catch {
    return [];
  }
}

function scoreAndFilterResults(
  results: SearchResult[],
  title: string,
  artist: string,
  duration: number
): Array<{ result: SearchResult; score: number }> {
  const durationMs = duration * 1000;
  const cleanupRegex = /\s*\(.*?\)|\s*\[.*?\]/g;

  const cleanedTitle = title.replace(cleanupRegex, "").toLowerCase().trim();
  const cleanedArtist = cleanArtist(artist).toLowerCase();
  const targetIsMixed = title.toLowerCase().includes("mixed");
  const targetIsRemix = title.toLowerCase().includes("remix");

  const scored = results.map((result) => {
    let score = 0;

    if (result.duration) {
      const diff = Math.abs(result.duration - durationMs);
      if (diff <= 2000) score += 100;
      else if (diff <= 5000) score += 50;
      else if (diff <= 10000) score += 10;
      else score -= 50;
    }

    const resultTitle = displayName(result).replace(cleanupRegex, "").toLowerCase().trim();
    if (resultTitle === cleanedTitle) score += 80;
    else if (resultTitle.includes(cleanedTitle) || cleanedTitle.includes(resultTitle)) score += 40;

    const resultIsMixed = displayName(result).toLowerCase().includes("mixed");
    const resultIsRemix = displayName(result).toLowerCase().includes("remix");
    if (resultIsMixed && !targetIsMixed) score -= 60;
    if (resultIsRemix && !targetIsRemix) score -= 40;

    const resultArtist = displayArtist(result).toLowerCase();
    if (resultArtist.includes(cleanedArtist)) score += 50;
    else {
      const artistWords = cleanedArtist.split(/\s+/).filter((w) => w.length > 2);
      if (artistWords.some((w) => resultArtist.includes(w))) score += 25;
    }

    return { result, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

async function fetchLyricsForTrack(id: string): Promise<LyricsResponse | null> {
  try {
    const url = new URL(`${API_BASE}/apple-music/lyrics`);
    url.searchParams.set("id", id);
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return (await res.json()) as LyricsResponse;
  } catch {
    return null;
  }
}

async function fetchLyricsForTrackWithType(
  id: string
): Promise<{ lrc: string; hasWordTimings: boolean }> {
  const data = await fetchLyricsForTrack(id);
  if (!data) return { lrc: "", hasWordTimings: false };

  let lrc = "";

  if (data.ttmlContent) {
    const parsedLines = parseTTML(data.ttmlContent);
    if (parsedLines.length > 0) {
      lrc = toLRC(parsedLines);
    }
  }

  if (!lrc && data.elrcMultiPerson) lrc = data.elrcMultiPerson;
  if (!lrc && data.elrc) lrc = data.elrc;
  if (!lrc && data.plain) lrc = data.plain;

  if (!lrc && data.content && data.content.length > 0) {
    const hasWordLevel = data.type === "Syllable";

    if (!hasWordLevel) {
      lrc = data.content
        .map((line) => line.text.map((t) => t.text).join(" "))
        .filter(Boolean)
        .join("\n");
    } else {
      const lines = data.content.map((line) => {
        const minutes = Math.floor(line.timestamp / 1000 / 60);
        const seconds = Math.floor((line.timestamp / 1000) % 60);
        const centiseconds = Math.floor((line.timestamp % 1000) / 10);

        const agent = line.background
          ? "{bg}"
          : line.oppositeTurn
          ? "{agent:v2}"
          : "{agent:v1}";

        const lineText = line.text.map((t) => t.text).join(" ");

        let lineStr = `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}]${agent}${lineText}`;

        if (line.text.length > 0) {
          const wordsData = line.text
            .map((w) => `${w.text}:${w.timestamp / 1000}:${w.endtime / 1000}`)
            .join("|");
          lineStr += `\n<${wordsData}>`;
        }

        return lineStr;
      });
      lrc = lines.join("\n");
    }
  }

  const hasWordTimings = lrc.includes("<") && lrc.includes(">");
  return { lrc, hasWordTimings };
}

export async function getPaxsenixLyrics(
  title: string,
  artist: string,
  duration: number,
  album?: string
): Promise<LyricsResult | null> {
  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);

  const searchQueries = [
    `${cleanedTitle} ${cleanedArtist}`,
    cleanedTitle,
    ...(album ? [`${cleanedTitle} ${cleanedArtist} ${album}`] : []),
  ];

  let allResults: Array<{ result: SearchResult; score: number }> = [];

  for (const query of searchQueries) {
    if (allResults.length === 0) {
      const searchResults = await search(query);
      if (searchResults.length > 0) {
        allResults = scoreAndFilterResults(searchResults, title, artist, duration);
      }
    }
  }

  if (allResults.length === 0) return null;

  const candidates = allResults.slice(0, 5);
  const fetches = candidates.map((c) => fetchLyricsForTrackWithType(c.result.id));

  let plainFallback: string | null = null;

  while (fetches.length > 0) {
    const results = await Promise.all(fetches);
    for (const { lrc, hasWordTimings } of results) {
      if (!lrc) continue;
      if (hasWordTimings) {
        return {
          source: "paxsenix",
          lrc: parseLrc(lrc),
          raw: lrc,
        };
      }
      if (!plainFallback) plainFallback = lrc;
    }
    break;
  }

  if (plainFallback) {
    return {
      source: "paxsenix",
      lrc: parseLrc(plainFallback),
      raw: plainFallback,
    };
  }

  return null;
}
