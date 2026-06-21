import CryptoJS from "crypto-js";
import type { Track } from "@/lib/types";
import { detectLanguage } from "@/lib/recommendation/language";

const ENDPOINT = "https://www.jiosaavn.com/api.php";
const DES_KEY = CryptoJS.enc.Utf8.parse("38346591");

const BASE_PARAMS = {
  _format: "json",
  _marker: "0",
  api_version: "4",
  ctx: "web6dot0",
};

interface RawArtist { name?: string }
interface RawMoreInfo {
  album?: string;
  duration?: string;
  encrypted_media_url?: string;
  "320kbps"?: string;
  artistMap?: { primary_artists?: RawArtist[] };
}
interface RawSong {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  language?: string;
  more_info?: RawMoreInfo;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decryptUrl(encrypted: string | undefined, has320: boolean): string | null {
  if (!encrypted) return null;
  try {
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encrypted) } as CryptoJS.lib.CipherParams,
      DES_KEY,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    ).toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;
    return has320 ? decrypted.replace("_96.mp4", "_320.mp4") : decrypted;
  } catch {
    return null;
  }
}

function upgradeImage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace("150x150", "500x500").replace("50x50", "500x500");
}

function joinArtists(song: RawSong): string {
  const primary = song.more_info?.artistMap?.primary_artists ?? [];
  const names = primary.map((a) => a.name).filter(Boolean) as string[];
  if (names.length > 0) return names.map(decodeEntities).join(", ");
  return song.subtitle ? decodeEntities(song.subtitle.split("-")[0].trim()) : "";
}

function toTrack(song: RawSong): Track {
  const has320 = song.more_info?.["320kbps"] === "true";
  const track: Track = {
    id: song.id,
    name: decodeEntities(song.title),
    artist: joinArtists(song),
    album: song.more_info?.album ? decodeEntities(song.more_info.album) : "",
    duration: Number(song.more_info?.duration) || 0,
    audioUrl: decryptUrl(song.more_info?.encrypted_media_url, has320),
    thumbnail: upgradeImage(song.image),
    source: "saavn",
  };
  track.language = song.language || detectLanguage(track);
  return track;
}

async function callJioSaavn(params: Record<string, string>): Promise<unknown> {
  const qs = new URLSearchParams({ ...BASE_PARAMS, ...params });
  const url = `${ENDPOINT}?${qs.toString()}`;
  const headers = { "User-Agent": "Mozilla/5.0", Accept: "application/json" };

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`JioSaavn ${res.status}`);
  return res.json();
}

const STATION_COOKIE = "L=hindi; gdpr_acceptance=true; DL=english";

async function callStation(
  params: Record<string, string>,
  signal?: AbortSignal
): Promise<unknown> {
  const qs = new URLSearchParams({ ...BASE_PARAMS, ...params, ctx: "android" });
  const url = `${ENDPOINT}?${qs.toString()}`;
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0",
    Accept: "application/json",
    Cookie: STATION_COOKIE,
  };
  const res = await fetch(url, { headers, signal });
  if (!res.ok) throw new Error(`JioSaavn station ${res.status}`);
  return res.json();
}

export async function searchSongs(query: string, limit = 30): Promise<Track[]> {
  const data = (await callJioSaavn({
    __call: "search.getResults",
    q: query,
    n: String(limit),
    p: "1",
  })) as { results?: RawSong[] };
  return (data.results ?? []).map(toTrack).filter((t) => t.audioUrl);
}

export async function getSong(id: string): Promise<Track | null> {
  const data = (await callJioSaavn({
    __call: "song.getDetails",
    pids: id,
  })) as Record<string, RawSong | unknown>;
  const song = (data as Record<string, RawSong>)[id];
  if (!song?.id) return null;
  return toTrack(song);
}

export async function relatedSongs(seedId: string, k = 15): Promise<Track[]> {
  const station = (await callStation({
    __call: "webradio.createEntityStation",
    entity_id: JSON.stringify([seedId]),
    entity_type: "queue",
  })) as { stationid?: string };

  const stationId = station?.stationid;
  if (!stationId) return [];

  const data = (await callStation({
    __call: "webradio.getSong",
    stationid: stationId,
    k: String(k),
    next: "1",
  })) as Record<string, unknown>;

  const tracks: Track[] = [];
  const seen = new Set<string>([seedId]);
  for (const [key, val] of Object.entries(data)) {
    if (key === "stationid") continue;
    const song = (val as { song?: RawSong })?.song;
    if (song?.id && !seen.has(song.id)) {
      seen.add(song.id);
      const t = toTrack(song);
      if (t.audioUrl) tracks.push(t);
    }
  }
  return tracks;
}

export async function getSuggestions(query: string): Promise<string[]> {
  try {
    const data = (await callJioSaavn({
      __call: "autocomplete.get",
      query,
      cc: "in",
      includeMetaTags: "1",
    })) as { songs?: { data?: { title?: string }[] } };
    return (data.songs?.data ?? [])
      .map((s) => (s.title ? decodeEntities(s.title) : ""))
      .filter(Boolean)
      .slice(0, 8);
  } catch {
    return [];
  }
}
