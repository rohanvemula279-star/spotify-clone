import type { Track } from "@/lib/types";
import type {
  AudioFeatures,
  SimilarityResult,
  RecommendationRequest,
  RecommendationResult,
  TasteProfile,
} from "./types";
import { rankSimilar, metadataSimilarity } from "./similarity";
import { getContextModifiers, getMoodKeywords } from "./context";
import { computeTasteSimilarity } from "./profile";
import { detectLanguage, getLanguageBoost, type Language } from "./language";

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function generateRadioQueue(
  seed: Track,
  candidates: Track[],
  seedFeatures?: AudioFeatures,
  featuresMap?: Map<string, AudioFeatures>,
  profile?: TasteProfile,
  context?: { hourOfDay: number; dayOfWeek: number; sessionTrackCount: number },
  count: number = 20
): SimilarityResult[] {
  const seedLang = detectLanguage(seed);
  const similar = rankSimilar(candidates, seed, seedFeatures, featuresMap);

  const ctx = context || { hourOfDay: 14, dayOfWeek: 3, sessionTrackCount: 0 };
  const defaultProfile = {
    favoriteArtists: new Map(),
    favoriteAlbums: new Map(),
    genreAffinities: new Map(),
    languageAffinities: new Map([["telugu", 1]]),
    primaryLanguage: "telugu",
    tempoPreference: { min: 60, max: 180, ideal: 120 },
    energyPreference: 0.5,
    valencePreference: 0.5,
    acousticPreference: 0.4,
    danceabilityPreference: 0.5,
    sessionLengthAvg: 5,
    completionRate: 0.7,
    skipThreshold: 0.3,
    diversitySeeking: 0.5,
    updatedAt: Date.now(),
  };
  const modifiers = getContextModifiers(
    {
      hourOfDay: ctx.hourOfDay,
      dayOfWeek: ctx.dayOfWeek,
      deviceType: "web",
      sessionId: "radio",
      sessionTrackCount: ctx.sessionTrackCount,
    },
    profile || defaultProfile
  );

  const languageAffinities = profile?.languageAffinities ?? new Map([["telugu", 1]]);
  const primaryLanguage = profile?.primaryLanguage || "telugu";

  const scored = similar.map((r) => {
    let adjusted = r.score;

    if (seedFeatures) {
      adjusted += modifiers.energyBoost * 0.1;
      adjusted += modifiers.valenceBoost * 0.1;
      adjusted -= modifiers.diversityPenalty * 0.15;
    }

    const trackLang = detectLanguage(r.track);
    const langBoost = getLanguageBoost(trackLang, languageAffinities);
    const isSeedLang = trackLang === seedLang;
    const isPrimaryLang = trackLang === primaryLanguage;
    adjusted += (isPrimaryLang ? 0.4 : isSeedLang ? 0.2 : langBoost * 0.15);

    if (trackLang === "hindi") {
      adjusted *= 0.3;
    } else if (trackLang === "telugu") {
      adjusted *= 1.4;
    }

    if (profile) {
      const tasteSim = computeTasteSimilarity(profile, r.track, featuresMap?.get(r.track.id));
      adjusted = adjusted * 0.6 + tasteSim * 0.4;
    }

    const sameArtist = r.track.artist.toLowerCase() === seed.artist.toLowerCase();
    if (sameArtist) {
      adjusted += 0.1;
    }

    return { ...r, score: clamp(adjusted) };
  });

  const teluguTracks = scored.filter((r) => detectLanguage(r.track) === "telugu");
  const nonTeluguTracks = scored.filter((r) => detectLanguage(r.track) !== "telugu");

  teluguTracks.sort((a, b) => b.score - a.score);
  nonTeluguTracks.sort((a, b) => b.score - a.score);

  const teluguCount = Math.min(teluguTracks.length, Math.ceil(count * 0.7));
  const otherCount = Math.min(nonTeluguTracks.length, count - teluguCount);

  const interleaved: SimilarityResult[] = [];
  let ti = 0;
  let oi = 0;
  while (interleaved.length < count && (ti < teluguCount || oi < otherCount)) {
    if (ti < teluguCount && (oi >= otherCount || interleaved.length % 3 < 2)) {
      interleaved.push(teluguTracks[ti++]);
    } else if (oi < otherCount) {
      interleaved.push(nonTeluguTracks[oi++]);
    } else if (ti < teluguCount) {
      interleaved.push(teluguTracks[ti++]);
    } else {
      break;
    }
  }

  return diversify(interleaved, count);
}

function diversify(
  results: SimilarityResult[],
  count: number
): SimilarityResult[] {
  const selected: SimilarityResult[] = [];
  const usedArtists = new Set<string>();

  for (const r of results) {
    if (selected.length >= count) break;

    const artistKey = r.track.artist.toLowerCase().trim();

    if (usedArtists.has(artistKey) && Math.random() > 0.3) {
      continue;
    }

    selected.push(r);
    usedArtists.add(artistKey);
  }

  if (selected.length < count) {
    for (const r of results) {
      if (selected.length >= count) break;
      if (!selected.some((s) => s.track.id === r.track.id)) {
        selected.push(r);
      }
    }
  }

  return selected;
}

export function generateMoodPlaylist(
  mood: string,
  candidates: Track[],
  featuresMap?: Map<string, AudioFeatures>,
  count: number = 15,
  languageAffinities?: Map<string, number>,
  primaryLanguage?: string
): SimilarityResult[] {
  const moodProfiles: Record<string, Partial<AudioFeatures>> = {
    chill: { tempo: 85, energy: 0.25, valence: 0.5, acousticness: 0.7, danceability: 0.3 },
    focus: { tempo: 90, energy: 0.2, valence: 0.4, acousticness: 0.8, instrumentalness: 0.6 },
    energy: { tempo: 135, energy: 0.85, valence: 0.7, danceability: 0.8, loudness: 0.8 },
    romance: { tempo: 90, energy: 0.35, valence: 0.75, acousticness: 0.6, danceability: 0.3 },
    sad: { tempo: 75, energy: 0.2, valence: 0.15, acousticness: 0.7 },
    party: { tempo: 125, energy: 0.85, valence: 0.8, danceability: 0.9 },
    sleep: { tempo: 65, energy: 0.1, valence: 0.3, acousticness: 0.9, instrumentalness: 0.7 },
    workout: { tempo: 145, energy: 0.9, valence: 0.6, danceability: 0.6, loudness: 0.9 },
  };

  const target = moodProfiles[mood.toLowerCase()];
  if (!target) return [];

  const langs = languageAffinities ?? new Map([["telugu", 1]]);
  const primaryLang = primaryLanguage || "telugu";

  const scored = candidates.map((track) => {
    const f = featuresMap?.get(track.id);
    if (!f) return { track, score: 0, signals: [] };

    let score = 0;
    let signals: { source: string; contribution: number }[] = [];
    const keys = Object.keys(target) as (keyof AudioFeatures)[];
    for (const key of keys) {
      const targetVal = target[key] as number;
      const trackVal = f[key] as number;
      const diff = 1 - Math.abs(targetVal - trackVal);
      const contrib = diff * (1 / keys.length);
      score += contrib;
      signals.push({ source: `mood:${key}`, contribution: contrib });
    }

    const trackLang = detectLanguage(track);
    if (trackLang === primaryLang) {
      score = score * 0.7 + 0.3;
      signals.push({ source: "language_boost", contribution: 0.3 });
    } else if (trackLang === "telugu") {
      score = score * 0.8 + 0.2;
      signals.push({ source: "language_boost", contribution: 0.2 });
    } else if (trackLang === "hindi") {
      score *= 0.3;
      signals.push({ source: "language_penalty", contribution: -0.7 });
    } else {
      const boost = getLanguageBoost(trackLang, langs);
      score = score * 0.85 + boost * 0.15;
      signals.push({ source: "language_boost", contribution: boost * 0.15 });
    }

    return { track, score, signals };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

export function generateContextualPlaylist(
  request: RecommendationRequest,
  candidates: Track[],
  profile?: TasteProfile,
  featuresMap?: Map<string, AudioFeatures>
): RecommendationResult {
  const ctx = request.context;
  const modifiers = getContextModifiers(ctx, profile || null as any);

  let primaryMode = request.mode || "discover";

  if (!request.mode) {
    const hour = ctx.hourOfDay;
    if (hour >= 5 && hour <= 9) primaryMode = "focus";
    else if (hour >= 10 && hour <= 14) primaryMode = "focus";
    else if (hour >= 15 && hour <= 18) primaryMode = "energy";
    else if (hour >= 19 && hour <= 22) primaryMode = "discover";
    else primaryMode = "relax";
  }

  const moodMap: Record<string, string> = {
    discover: "chill",
    focus: "focus",
    relax: "chill",
    energy: "energy",
    radio: "chill",
    similar: "chill",
  };

  const languageAffinities = profile?.languageAffinities ?? new Map([["telugu", 1]]);
  const primaryLanguage = profile?.primaryLanguage || "telugu";

  const moodPlaylist = generateMoodPlaylist(
    moodMap[primaryMode] || "chill",
    candidates,
    featuresMap,
    request.count || 15,
    languageAffinities,
    primaryLanguage
  );

  const seed = request.seed;
  let radioResults: SimilarityResult[] = [];

  if (seed) {
    radioResults = generateRadioQueue(
      seed,
      candidates,
      request.seedFeatures,
      featuresMap,
      profile,
      ctx,
      request.count || 15
    );
  }

  const excludeSet = request.excludeIds || new Set();
  const combined = [...radioResults, ...moodPlaylist]
    .filter((r) => !excludeSet.has(r.track.id))
    .reduce<SimilarityResult[]>((acc, r) => {
      const existing = acc.find((a) => a.track.id === r.track.id);
      if (existing) {
        existing.score = Math.max(existing.score, r.score);
      } else {
        acc.push(r);
      }
      return acc;
    }, []);

  const teluguFirst = combined.filter((r) => detectLanguage(r.track) === primaryLanguage);
  const others = combined.filter((r) => detectLanguage(r.track) !== primaryLanguage);
  teluguFirst.sort((a, b) => b.score - a.score);
  others.sort((a, b) => b.score - a.score);
  const finalCombined = [...teluguFirst, ...others];

  let diversityBonus = 0;
  if (modifiers.noveltyBonus > 0 && finalCombined.length > 5) {
    const keep = Math.ceil(finalCombined.length * (1 - modifiers.noveltyBonus * 0.5));
    const novelty = finalCombined.splice(keep);
    finalCombined.push(...novelty.reverse());
    diversityBonus = modifiers.noveltyBonus;
  }

  return {
    tracks: finalCombined.slice(0, request.count || 15),
    strategy: primaryMode,
    diversityBonus,
    generatedAt: Date.now(),
  };
}
