// Shared types used across server utilities and client components.

export interface Track {
  /**
   * Stable track id used as the cache key. Now sourced from JioSaavn; the
   * name is kept (and stored in the `spotify_id` column) for compatibility.
   */
  spotifyId: string;
  name: string;
  artist: string;
  album: string;
  /** Best-available album art URL (JioSaavn CDN, 500x500). */
  albumArt: string | null;
}

/** Shape returned by /api/resolve once a YouTube video id is known. */
export interface ResolvedTrack extends Track {
  youtubeVideoId: string;
  /** true when the mapping came from the Supabase cache (no quota spent). */
  cached: boolean;
}
