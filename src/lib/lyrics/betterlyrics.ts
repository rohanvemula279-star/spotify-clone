import { parseTTML, toLRC } from "./ttml-parser";
import { parseLrc } from "./lrc-parser";
import type { LyricsResult } from "./types";

const API_BASE = "https://lyrics-api.boidu.dev";

interface TTMLResponse {
  ttml: string;
}

export async function getBetterLyrics(
  title: string,
  artist: string,
  duration: number,
  album?: string
): Promise<LyricsResult | null> {
  try {
    const url = new URL(`${API_BASE}/getLyrics`);
    url.searchParams.set("s", title);
    url.searchParams.set("a", artist);
    if (duration > 0) url.searchParams.set("d", String(duration));
    if (album) url.searchParams.set("al", album);

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = (await res.json()) as TTMLResponse;
    if (!data.ttml) return null;

    const parsedLines = parseTTML(data.ttml);
    if (parsedLines.length === 0) return null;

    const raw = toLRC(parsedLines);
    return {
      source: "betterlyrics",
      lrc: parseLrc(raw),
      raw,
    };
  } catch {
    return null;
  }
}
