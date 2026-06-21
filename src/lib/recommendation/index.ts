import type { Track } from "@/lib/types";
import type {
  AudioFeatures,
  BehaviorEvent,
  PlayContext,
  RecommendationRequest,
  RecommendationResult,
  SimilarityResult,
  TasteProfile,
} from "./types";
export type {
  AudioFeatures,
  BehaviorEvent,
  PlayContext,
  RecommendationRequest,
  RecommendationResult,
  SimilarityResult,
  TasteProfile,
};
import {
  loadProfile,
  saveProfile,
  updateProfile,
  computeTasteSimilarity,
} from "./profile";
import {
  loadUserFactors,
  saveUserFactors,
  initializeUserFactors,
  predictScore,
  updateUserFactors,
  saveTrackEmbedding,
} from "./collaborative";
import {
  generateRadioQueue,
  generateMoodPlaylist,
  generateContextualPlaylist,
} from "./radio";
import { rankSimilar } from "./similarity";
import { extractFeatures, inferFeaturesFromTrack, defaultFeatures, computeMelFeatures, extractMelSpectrogram } from "./audioFeatures";
import { getMoodKeywords, getContextLabel } from "./context";
import { buildArtistCatalog, evaluateColdStart } from "./coldStart";
import {
  encodeUserTower,
  encodeSongTower,
  twoTowerScore,
  rankByTwoTower,
  updateTwoTowerWeights,
  getPersonalizedHomeSections,
} from "./twoTower";
import {
  detectLanguage,
  detectLanguageBatch,
  getLanguageBoost,
  getLanguageLabel,
  getTeluguSearchQueries,
  isTeluguTrack,
  shouldPreferTelugu,
} from "./language";
import type { Language } from "./language";
export type { Language };

const featureCache = new Map<string, AudioFeatures>();

export function getFeatureCache(): Map<string, AudioFeatures> {
  return featureCache;
}

export async function resolveFeatures(
  track: Track
): Promise<AudioFeatures> {
  const cached = featureCache.get(track.id);
  if (cached) return cached;

  if (track.audioUrl) {
    try {
      const features = await extractFeatures(track.audioUrl);
      featureCache.set(track.id, features);
      return features;
    } catch {}
  }

  const inferred = inferFeaturesFromTrack(track);
  featureCache.set(track.id, inferred);
  return inferred;
}

export async function resolveFeaturesBatch(
  tracks: Track[]
): Promise<Map<string, AudioFeatures>> {
  const map = new Map<string, AudioFeatures>();
  for (const t of tracks) {
    map.set(t.id, await resolveFeatures(t));
  }
  return map;
}

export function getTasteProfile(): TasteProfile {
  return loadProfile();
}

export function recordBehavior(event: BehaviorEvent): TasteProfile {
  const profile = loadProfile();
  const updated = updateProfile(profile, event);

  let factors = loadUserFactors();
  if (!factors) factors = initializeUserFactors();

  const feedback = event.type === "complete" || event.type === "save" ? 1
    : event.type === "skip" ? 0
    : 0.5;

  const newFactors = updateUserFactors(factors, event.track, feedback);
  saveUserFactors(newFactors);

  return updated;
}

export function getSimilarTracks(
  seed: Track,
  candidates: Track[],
  featuresMap?: Map<string, AudioFeatures>,
  count: number = 10
) {
  const profile = loadProfile();
  const seedFeatures = featuresMap?.get(seed.id) ?? inferFeaturesFromTrack(seed);

  const results = rankSimilar(candidates, seed, seedFeatures, featuresMap);

  const scored = results.map((r) => {
    const tasteSim = computeTasteSimilarity(profile, r.track, featuresMap?.get(r.track.id));
    const trackLang = detectLanguage(r.track);
    const primaryLang = profile.primaryLanguage || "telugu";
    const langBonus = trackLang === primaryLang ? 0.3
      : trackLang === "telugu" ? 0.2
      : trackLang === "hindi" ? -0.3
      : 0;
    return {
      ...r,
      score: r.score * 0.4 + tasteSim * 0.4 + langBonus,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count);
}

export function getRecommendations(
  request: RecommendationRequest,
  candidates: Track[],
  featuresMap?: Map<string, AudioFeatures>
): RecommendationResult {
  const profile = loadProfile();

  const result = generateContextualPlaylist(request, candidates, profile, featuresMap);
  return result;
}

export function getMoodRecommendation(
  mood: string,
  candidates: Track[],
  featuresMap?: Map<string, AudioFeatures>,
  count: number = 15
) {
  const profile = loadProfile();
  return generateMoodPlaylist(
    mood, candidates, featuresMap, count,
    profile.languageAffinities,
    profile.primaryLanguage
  );
}

export function getRadioQueue(
  seed: Track,
  candidates: Track[],
  featuresMap?: Map<string, AudioFeatures>,
  profile?: TasteProfile,
  context?: PlayContext,
  count?: number
) {
  const seedFeatures = featuresMap?.get(seed.id) ?? inferFeaturesFromTrack(seed);
  const p = profile ?? loadProfile();
  return generateRadioQueue(seed, candidates, seedFeatures, featuresMap, p, context, count);
}

export function getArtistCatalog(
  tracks: Track[],
  featuresMap?: Map<string, AudioFeatures>
) {
  const tagged = tracks.map((t) => ({
    ...t,
    language: t.language || detectLanguage(t),
  }));
  return buildArtistCatalog(tagged, featuresMap);
}

export function getColdStartPrediction(
  newTrack: Track,
  catalogs: Map<string, import("./types").ArtistCatalogEmbedding>
) {
  return evaluateColdStart(newTrack, catalogs);
}

export function getContextHint(context: PlayContext): string {
  return getContextLabel(context);
}

export function getMoodSuggestions(context: PlayContext): string[] {
  return getMoodKeywords(context);
}

export function getPersonalizedScore(
  track: Track,
  features?: AudioFeatures
): number {
  const profile = loadProfile();
  return computeTasteSimilarity(profile, track, features);
}

export {
  detectLanguage,
  detectLanguageBatch,
  getLanguageBoost,
  getLanguageLabel,
  getTeluguSearchQueries,
  isTeluguTrack,
  shouldPreferTelugu,
};

export function clearProfile(): void {
  try {
    localStorage.removeItem("spotube:tasteProfile");
    localStorage.removeItem("spotube:userFactors");
    localStorage.removeItem("spotube:twoTower");
  } catch {}
}

export {
  encodeUserTower,
  encodeSongTower,
  twoTowerScore,
  rankByTwoTower,
  updateTwoTowerWeights,
  getPersonalizedHomeSections,
  computeMelFeatures,
  extractMelSpectrogram,
};

export { getAutoplayTracks } from "./echoBrain";
export type { AutoplayOptions } from "./echoBrain";
