// --- YouTube Data API v3 helper (server-only) ----------------------
//
// This is the ONLY place that spends YouTube quota. A search costs 100
// units/day out of a default 10,000, so we call it sparingly and cache
// every result in Supabase (see /api/resolve).

const YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

/**
 * Find the best YouTube video id for a track. Returns null if nothing
 * is found (caller decides how to surface that to the user).
 */
export async function findYoutubeVideoId(
  trackName: string,
  artistName: string
): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("Missing YOUTUBE_API_KEY");

  const url = new URL(YT_SEARCH_URL);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "1");
  // "official audio" biases results toward the actual song rather than
  // live clips, reactions, or lyric-video re-uploads.
  url.searchParams.set("q", `${trackName} ${artistName} official audio`);
  // videoEmbeddable=true ensures the result can actually load in the
  // IFrame player (skips videos the uploader disabled embedding on).
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`YouTube search failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as {
    items: Array<{ id: { videoId?: string } }>;
  };

  return data.items[0]?.id?.videoId ?? null;
}
