// --- JioSaavn upstream client (SERVER ONLY) ----------------------------
//
// Talks directly to JioSaavn's real public endpoint (www.jiosaavn.com/api.php)
// instead of relying on flaky third-party API mirrors that constantly die or
// get rate-limited. JioSaavn returns audio URLs *encrypted* (DES-ECB); we
// decrypt them here, server-side, so the browser only ever sees clean,
// playable CDN URLs.
//
// This module imports `crypto-js` and must never be bundled into the client.
// It is only ever imported from route handlers under /app/api/saavn/*.

import CryptoJS from "crypto-js";
import type { Track } from "@/lib/types";
import { detectLanguage } from "@/lib/recommendation/language";

const ENDPOINT = "https://www.jiosaavn.com/api.php";
const DES_KEY = CryptoJS.enc.Utf8.parse("38346591");

// Common query params JioSaavn's web client sends.
const BASE_PARAMS = {
  _format: "json",
  _marker: "0",
  api_version: "4",
  ctx: "web6dot0",
};

interface RawArtist {
  name?: string;
}
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

// JioSaavn embeds HTML entities in titles/artists ("It&#039;s You").
function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Decrypt a JioSaavn `encrypted_media_url` into a playable CDN URL. */
function decryptUrl(encrypted: string | undefined, has320: boolean): string | null {
  if (!encrypted) return null;
  try {
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encrypted) } as CryptoJS.lib.CipherParams,
      DES_KEY,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    ).toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;
    // Upgrade the default 96kbps stream to 320 when the song offers it.
    return has320
      ? decrypted.replace("_96.mp4", "_320.mp4")
      : decrypted;
  } catch {
    return null;
  }
}

/** Upgrade a JioSaavn thumbnail to the 500x500 variant. */
function upgradeImage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace("150x150", "500x500").replace("50x50", "500x500");
}

function joinArtists(song: RawSong): string {
  const primary = song.more_info?.artistMap?.primary_artists ?? [];
  const names = primary.map((a) => a.name).filter(Boolean) as string[];
  if (names.length > 0) return names.map(decodeEntities).join(", ");
  // Fall back to the subtitle (also contains the artist list).
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

interface CallOpts {
  /** JioSaavn context. "web6dot0" for search; "android" for radio stations. */
  ctx?: string;
  /** Cookie header — radio/station endpoints require a language cookie. */
  cookie?: string;
  /** Seconds to cache at the edge; 0 = no-store. */
  revalidate?: number;
}

async function call(
  params: Record<string, string>,
  opts: CallOpts = {}
): Promise<unknown> {
  const qs = new URLSearchParams({ ...BASE_PARAMS, ...params });
  if (opts.ctx) qs.set("ctx", opts.ctx);

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0",
    Accept: "application/json",
  };
  if (opts.cookie) headers.Cookie = opts.cookie;

  const res = await fetch(`${ENDPOINT}?${qs.toString()}`, {
    headers,
    next: opts.revalidate === 0 ? undefined : { revalidate: opts.revalidate ?? 300 },
    cache: opts.revalidate === 0 ? "no-store" : undefined,
  });
  if (!res.ok) throw new Error(`JioSaavn upstream ${res.status}`);
  return res.json();
}

// Station endpoints need a language cookie or they return an empty array.
const STATION_COOKIE = "L=hindi; gdpr_acceptance=true; DL=english";

/**
 * Fetch songs *related to* a seed song — JioSaavn's "song radio" / station.
 * This is the high-quality "more like this" feed (the recommendation Anchor),
 * and the songs come with playable (decryptable) URLs.
 */
export async function relatedSongs(seedId: string, k = 15): Promise<Track[]> {
  // 1) Create a station seeded by this song.
  const station = (await call(
    {
      __call: "webradio.createEntityStation",
      entity_id: JSON.stringify([seedId]),
      entity_type: "queue",
    },
    { ctx: "android", cookie: STATION_COOKIE, revalidate: 0 }
  )) as { stationid?: string };

  const stationId = station?.stationid;
  if (!stationId) return [];

  // 2) Pull k songs from the station.
  const data = (await call(
    {
      __call: "webradio.getSong",
      stationid: stationId,
      k: String(k),
      next: "1",
    },
    { ctx: "android", cookie: STATION_COOKIE, revalidate: 0 }
  )) as Record<string, unknown>;

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

/** Search the JioSaavn catalog. */
export async function searchSongs(query: string, limit = 30): Promise<Track[]> {
  const data = (await call({
    __call: "search.getResults",
    q: query,
    n: String(limit),
    p: "1",
  })) as { results?: RawSong[] };
  return (data.results ?? []).map(toTrack).filter((t) => t.audioUrl);
}

/** Resolve a single song id to a fresh Track (with playable URL). */
export async function getSong(id: string): Promise<Track | null> {
  const data = (await call({
    __call: "song.getDetails",
    pids: id,
  })) as Record<string, RawSong | unknown>;
  const song = (data as Record<string, RawSong>)[id];
  if (!song || !song.id) return null;
  return toTrack(song);
}

/** Autocomplete suggestions for a partial query. */
export async function getSuggestions(query: string): Promise<string[]> {
  try {
    const data = (await call({
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
