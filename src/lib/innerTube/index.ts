import {
  searchYTMusic,
  getPlayer,
  getSearchSuggestions,
  browseYTMusic,
} from "./client";
import {
  parseSearchResults,
  parseSearchSummary,
  parsePlayerResponse,
  parseSearchSuggestions,
  getContinuation,
} from "./parser";
import type {
  SearchResult,
  PlayerResponse,
  YTItem,
} from "./types";

export type { YTItem, SongItem, AlbumItem, ArtistItem, PlaylistItem, PlayerResponse, Format, Artist } from "./types";

export const SEARCH_FILTERS = {
  SONG: "EgWKAQIIAWoKEAoQCRADEAA%3D%3D",
  VIDEO: "EgWKAQIQAWoKEAoQCRADEAA%3D%3D",
  ALBUM: "EgWKAQIYAWoKEAoQCRADEAA%3D%3D",
  ARTIST: "EgWKAQIGAWoKEAoQCRADEAA%3D%3D",
  PLAYLIST: "EgWKAQIKAWoKEAoQCRADEAA%3D%3D",
  FEATURED_PLAYLIST: "EgeKAQQoAEA%2BagQKAQOoBAoECgIQAQ%3D%3D",
};

export async function search(
  query: string,
  filter?: string
): Promise<SearchResult> {
  const data = await searchYTMusic(query, filter);
  const items = parseSearchResults(data);
  const continuation = getContinuation(data);
  return { items, continuation };
}

export async function searchSummary(
  query: string
): Promise<Array<{ title: string; items: YTItem[] }>> {
  const data = await searchYTMusic(query);
  return parseSearchSummary(data);
}

export async function player(
  videoId: string,
  playlistId?: string
): Promise<PlayerResponse> {
  const data = await getPlayer(videoId, playlistId);
  return parsePlayerResponse(data);
}

export async function searchSuggestions(
  query: string
): Promise<string[]> {
  const data = await getSearchSuggestions(query);
  const result = parseSearchSuggestions(data);
  return result.queries;
}

export async function getAudioStreamUrl(
  videoId: string
): Promise<string | null> {
  const data = await getPlayer(videoId);
  const parsed = parsePlayerResponse(data);

  if (parsed.playabilityStatus?.status !== "OK") {
    return null;
  }

  // Find the best audio-only format
  const audioFormats = (parsed.streamingData?.adaptiveFormats ?? []).filter(
    (f) => f.mimeType.startsWith("audio/")
  );

  // Sort by bitrate descending and get the best one that has a direct URL
  audioFormats.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

  for (const f of audioFormats) {
    if (f.url) return f.url;
    if (f.signatureCipher || f.cipher) {
      // Would need URL decryption - try to extract URL from cipher
      const cipher = f.signatureCipher || f.cipher;
      if (cipher) {
        const params = new URLSearchParams(cipher);
        const url = params.get("url");
        if (url) {
          // Return the URL - it may need signature deciphering
          // In browser context, YouTube's own player.js handles this
          return url;
        }
      }
    }
  }

  // Fallback to combined format
  for (const f of parsed.streamingData?.formats ?? []) {
    if (f.url) return f.url;
  }

  return null;
}

const cache = new Map<string, string>();

export async function resolveAudioUrl(
  videoId: string
): Promise<string | null> {
  const cached = cache.get(videoId);
  if (cached) return cached;

  try {
    const url = await getAudioStreamUrl(videoId);
    if (url) {
      cache.set(videoId, url);
      return url;
    }
  } catch {
    // Fall through
  }

  return null;
}

export function clearAudioCache() {
  cache.clear();
}
