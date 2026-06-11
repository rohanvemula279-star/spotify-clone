import dns from "node:dns";
// Node 17+ defaults DNS result order to the resolver's order, which puts
// IPv6 first. On hosts with broken/unreachable IPv6, that makes outbound
// fetch() hang until the connect timeout. Prefer IPv4.
dns.setDefaultResultOrder("ipv4first");

import type { Track } from "./types";

// --- JioSaavn search helper (server-only) --------------------------
//
// Public, unauthenticated wrapper around the JioSaavn catalog. No tokens
// or auth headers are needed — this replaces the old Spotify Web API
// search and sidesteps its Premium/authorization (403) restrictions.
//
// The JioSaavn track `id` is mapped into the `spotifyId` field so the rest
// of the app (the `Track` contract, the Supabase `spotify_id` column, and
// the /api/resolve flow) keeps working unchanged.

const SEARCH_URL = "https://saavn.sumit.co/api/search/songs";

interface SaavnImage {
  quality: string;
  url: string;
}

interface SaavnArtist {
  name: string;
}

interface SaavnSong {
  id: string;
  name: string;
  album?: { name?: string } | null;
  image?: SaavnImage[];
  artists?: { primary?: SaavnArtist[] };
}

interface SaavnSearchResponse {
  data?: { results?: SaavnSong[] };
}

// JioSaavn returns titles/artists with HTML entities (e.g. "Tum Hi Ho &amp;
// Co", "It&#039;s You"). Decode the common ones so the UI shows clean text.
function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Pick the highest-resolution album art (500x500, the last entry). */
function pickAlbumArt(images: SaavnImage[] | undefined): string | null {
  if (!images || images.length === 0) return null;
  // JioSaavn orders images smallest-first (50x50, 150x150, 500x500), so the
  // last index is the 500x500 high-res art we want.
  return images[images.length - 1]?.url ?? null;
}

/** Join all primary artists into a single display string. */
function joinArtists(song: SaavnSong): string {
  const primary = song.artists?.primary ?? [];
  return primary
    .map((a) => a.name)
    .filter(Boolean)
    .map(decodeEntities)
    .join(", ");
}

export async function searchTracks(
  query: string,
  limit = 20
): Promise<Track[]> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("query", query);
  // Honored by the wrapper when supported; harmless otherwise.
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`JioSaavn search failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as SaavnSearchResponse;
  const results = data.data?.results ?? [];

  return results.map((item) => ({
    // JioSaavn id stored as spotifyId to keep the Supabase schema +
    // client contract identical (see note at top of file).
    spotifyId: item.id,
    name: decodeEntities(item.name),
    artist: joinArtists(item),
    album: item.album?.name ? decodeEntities(item.album.name) : "",
    albumArt: pickAlbumArt(item.image),
  }));
}
