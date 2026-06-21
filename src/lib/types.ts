// Shared types used across the app.

/** Where a track's metadata originated. */
export type TrackSource = "youtube" | "saavn" | "shazam";

export interface Track {
  /**
   * Stable identity used for queue keys, library storage, and dedupe.
   * For YouTube-sourced tracks this is the videoId; for direct JioSaavn
   * tracks it's the JioSaavn song id.
   */
  id: string;
  name: string;
  artist: string;
  album: string;
  /** Track length in seconds (0 if unknown). */
  duration: number;
  /**
   * Direct, playable audio stream URL (JioSaavn CDN). May be null until it
   * is resolved on demand right before playback via the resolve layer.
   */
  audioUrl: string | null;
  /** Origin of this metadata. Defaults to "saavn" when omitted. */
  source?: TrackSource;
  /** YouTube video id, when this track came from a YouTube search. */
  videoId?: string;
  /** Cover/thumbnail image URL, when available. */
  thumbnail?: string;
  /** True when a downloaded audio blob for this track exists on-device. */
  downloaded?: boolean;
  /** Inferred language of the track (telugu, hindi, tamil, etc.). */
  language?: string;
}
