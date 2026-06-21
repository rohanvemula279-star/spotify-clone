import { parseLrc } from "./lrc-parser";
import type { LyricsResult } from "./types";

interface Keyword {
  title: string;
  artist: string;
  album?: string;
}

interface SearchSongInfo {
  duration: number;
  hash: string;
}

interface SearchSongData {
  info: SearchSongInfo[];
}

interface SearchSongResponse {
  status: number;
  errcode: number;
  error: string;
  data: SearchSongData;
}

interface Candidate {
  id: number;
  product_from: string;
  duration: number;
  accesskey: string;
}

interface SearchLyricsResponse {
  status: number;
  info: string;
  errcode: number;
  errmsg: string;
  expire: number;
  candidates: Candidate[];
}

interface DownloadLyricsResponse {
  content: string;
}

const PAGE_SIZE = 8;
const HEAD_CUT_LIMIT = 30;
const DURATION_TOLERANCE = 8;

function normalizeTitle(title: string): string {
  return title
    .replace(/\(.*\)/g, "")
    .replace(/（.*）/g, "")
    .replace(/「.*」/g, "")
    .replace(/『.*』/g, "")
    .replace(/<.*>/g, "")
    .replace(/《.*》/g, "")
    .replace(/〈.*〉/g, "")
    .replace(/＜.*＞/g, "");
}

function normalizeArtist(artist: string): string {
  return artist
    .replace(/, /g, "、")
    .replace(/ & /g, "、")
    .replace(/\./g, "")
    .replace(/和/g, "、")
    .replace(/\(.*\)/g, "")
    .replace(/（.*）/g, "");
}

function generateKeyword(title: string, artist: string, album?: string): Keyword {
  return {
    title: normalizeTitle(title),
    artist: normalizeArtist(artist),
    album,
  };
}

function normalizeLrc(text: string): string {
  const acceptedRegex = /\[(\d\d):(\d\d)\.(\d{2,3})\].*/;
  const bannedRegex = /.+].+[:：].+/;

  const lines = text.split("\n").filter((line) => acceptedRegex.test(line));

  let headCutLine = 0;
  for (let i = Math.min(HEAD_CUT_LIMIT, lines.length - 1); i >= 0; i--) {
    if (bannedRegex.test(lines[i])) {
      headCutLine = i + 1;
      break;
    }
  }

  const afterHead = lines.slice(headCutLine);

  let tailCutLine = 0;
  for (let i = Math.min(lines.length - HEAD_CUT_LIMIT, lines.length - 1); i >= 0; i--) {
    if (bannedRegex.test(lines[lines.length - 1 - i])) {
      tailCutLine = i + 1;
      break;
    }
  }

  return afterHead.slice(0, afterHead.length - tailCutLine).join("\n");
}

async function searchSongs(keyword: Keyword): Promise<SearchSongResponse> {
  const url = new URL("https://mobileservice.kugou.com/api/v3/search/song");
  url.searchParams.set("version", "9108");
  url.searchParams.set("plat", "0");
  url.searchParams.set("pagesize", String(PAGE_SIZE));
  url.searchParams.set("showtype", "0");
  url.searchParams.set("keyword", `${keyword.title} - ${keyword.artist}${keyword.album ? ` ${keyword.album}` : ""}`);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`KuGou search failed: ${res.status}`);
  return res.json() as Promise<SearchSongResponse>;
}

async function searchLyricsByHash(hash: string): Promise<SearchLyricsResponse> {
  const url = new URL("https://lyrics.kugou.com/search");
  url.searchParams.set("ver", "1");
  url.searchParams.set("man", "yes");
  url.searchParams.set("client", "pc");
  url.searchParams.set("hash", hash);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`KuGou lyrics search by hash failed: ${res.status}`);
  return res.json() as Promise<SearchLyricsResponse>;
}

async function searchLyricsByKeyword(
  keyword: Keyword,
  duration: number
): Promise<SearchLyricsResponse> {
  const url = new URL("https://lyrics.kugou.com/search");
  url.searchParams.set("ver", "1");
  url.searchParams.set("man", "yes");
  url.searchParams.set("client", "pc");
  if (duration > 0) url.searchParams.set("duration", String(duration * 1000));
  url.searchParams.set(
    "keyword",
    `${keyword.title} - ${keyword.artist}${keyword.album ? ` ${keyword.album}` : ""}`
  );

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`KuGou lyrics search failed: ${res.status}`);
  return res.json() as Promise<SearchLyricsResponse>;
}

async function downloadLyrics(
  id: number,
  accessKey: string
): Promise<DownloadLyricsResponse> {
  const url = new URL("https://lyrics.kugou.com/download");
  url.searchParams.set("fmt", "lrc");
  url.searchParams.set("charset", "utf8");
  url.searchParams.set("client", "pc");
  url.searchParams.set("ver", "1");
  url.searchParams.set("id", String(id));
  url.searchParams.set("accesskey", accessKey);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`KuGou download failed: ${res.status}`);
  return res.json() as Promise<DownloadLyricsResponse>;
}

async function getLyricsCandidate(
  keyword: Keyword,
  duration: number
): Promise<Candidate | null> {
  try {
    const songRes = await searchSongs(keyword);
    for (const song of songRes.data.info) {
      if (duration <= 0 || Math.abs(song.duration - duration) <= DURATION_TOLERANCE) {
        const lyricsRes = await searchLyricsByHash(song.hash);
        if (lyricsRes.candidates.length > 0) {
          return lyricsRes.candidates[0];
        }
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const lyricsRes = await searchLyricsByKeyword(keyword, duration);
    return lyricsRes.candidates[0] || null;
  } catch {
    return null;
  }
}

export async function getKugouLyrics(
  title: string,
  artist: string,
  duration: number,
  album?: string
): Promise<LyricsResult | null> {
  try {
    const keyword = generateKeyword(title, artist, album);
    const candidate = await getLyricsCandidate(keyword, duration);
    if (!candidate) return null;

    const downloadRes = await downloadLyrics(candidate.id, candidate.accesskey);
    const decoded = atob(downloadRes.content);
    const raw = normalizeLrc(decoded);

    if (!raw.trim()) return null;

    return {
      source: "kugou",
      lrc: parseLrc(raw),
      raw,
    };
  } catch {
    return null;
  }
}
