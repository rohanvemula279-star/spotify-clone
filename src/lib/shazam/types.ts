export interface RecognitionResult {
  trackId: string;
  title: string;
  artist: string;
  album?: string;
  coverArtUrl?: string;
  coverArtHqUrl?: string;
  genre?: string;
  releaseDate?: string;
  label?: string;
  lyrics?: string;
  shazamUrl?: string;
  appleMusicUrl?: string;
  spotifyUrl?: string;
  youtubeVideoId?: string;
}

export type RecognitionStatus =
  | { type: "idle" }
  | { type: "listening" }
  | { type: "processing" }
  | { type: "success"; result: RecognitionResult }
  | { type: "no_match" }
  | { type: "error"; message: string };
