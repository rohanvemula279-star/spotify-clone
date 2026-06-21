import type { Track } from "@/lib/types";

export interface AudioFeatures {
  tempo: number;
  energy: number;
  valence: number;
  danceability: number;
  acousticness: number;
  instrumentalness: number;
  loudness: number;
  speechiness: number;
  spectralCentroid: number;
  zeroCrossingRate: number;
}

export interface SimilarityResult {
  track: Track;
  score: number;
  signals: { source: string; contribution: number }[];
}

export interface TasteProfile {
  favoriteArtists: Map<string, number>;
  favoriteAlbums: Map<string, number>;
  genreAffinities: Map<string, number>;
  languageAffinities: Map<string, number>;
  primaryLanguage: string;
  tempoPreference: { min: number; max: number; ideal: number };
  energyPreference: number;
  valencePreference: number;
  acousticPreference: number;
  danceabilityPreference: number;
  sessionLengthAvg: number;
  completionRate: number;
  skipThreshold: number;
  diversitySeeking: number;
  updatedAt: number;
}

export interface BehaviorEvent {
  trackId: string;
  track: Track;
  type: "play" | "skip" | "complete" | "save" | "unsave" | "repeat" | "seek" | "shazam";
  timestamp: number;
  context: PlayContext;
  seekPosition?: number;
}

export interface PlayContext {
  hourOfDay: number;
  dayOfWeek: number;
  deviceType: string;
  sessionId: string;
  sessionTrackCount: number;
  previousTrackId?: string;
}

export interface RecommendationRequest {
  seed?: Track;
  seedFeatures?: AudioFeatures;
  context: PlayContext;
  count?: number;
  excludeIds?: Set<string>;
  mode?: "discover" | "focus" | "relax" | "energy" | "radio" | "similar";
}

export interface RecommendationResult {
  tracks: SimilarityResult[];
  strategy: string;
  diversityBonus: number;
  generatedAt: number;
}

export interface ArtistCatalogEmbedding {
  artist: string;
  tracks: Track[];
  avgFeatures: AudioFeatures;
  genreSignatures: string[];
  popularity: number;
  catalogSize: number;
}

export interface ColdStartCandidate {
  track: Track;
  artistCatalog: ArtistCatalogEmbedding;
  attentionWeights: { trackId: string; weight: number }[];
  predictedEmbedding: Float64Array;
  confidence: number;
}
