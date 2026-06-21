import type { Track } from "@/lib/types";
import type { AudioFeatures, SimilarityResult } from "./types";
import type { Language } from "./language";
import { detectLanguage, getLanguageBoost } from "./language";

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

export function jaccardSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 && tb.size === 0) return 0;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection++;
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function metadataSimilarity(a: Track, b: Track): number {
  const artistScore = jaccardSimilarity(a.artist, b.artist) * 3;
  const albumScore = jaccardSimilarity(a.album, b.album) * 2;
  const nameScore = jaccardSimilarity(a.name, b.name) * 1;
  const total = artistScore + albumScore + nameScore;
  return total / 6;
}

export function featureSimilarity(
  fa: AudioFeatures,
  fb: AudioFeatures
): number {
  const vecA = featureVector(fa);
  const vecB = featureVector(fb);
  return cosineSimilarity(vecA, vecB);
}

export function featureVector(f: AudioFeatures): number[] {
  return [
    normalize(f.tempo, 60, 180),
    f.energy,
    f.valence,
    f.danceability,
    f.acousticness,
    clamp(f.instrumentalness),
    normalize(f.loudness, -60, 0),
    clamp(f.speechiness),
  ];
}

function normalize(v: number, min: number, max: number): number {
  return max === min ? 0.5 : (v - min) / (max - min);
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function computeScore(
  track: Track,
  seed: Track,
  seedFeatures?: AudioFeatures,
  trackFeatures?: AudioFeatures
): SimilarityResult {
  const signals: { source: string; contribution: number }[] = [];

  const metaSim = metadataSimilarity(track, seed);
  const metaContrib = metaSim * 0.2;
  signals.push({ source: "metadata", contribution: metaContrib });

  let featSim = 0;
  if (seedFeatures && trackFeatures) {
    featSim = featureSimilarity(seedFeatures, trackFeatures);
    signals.push({ source: "audio_features", contribution: featSim * 0.2 });
  }

  const sameArtist = track.artist.toLowerCase() === seed.artist.toLowerCase();
  const artistBonus = sameArtist ? 0.15 : 0;
  if (sameArtist) {
    signals.push({ source: "same_artist", contribution: 0.15 });
  }

  const langLang = detectLanguage(track);
  const seedLang = detectLanguage(seed);
  const langSim = computeLanguageSimilarity(langLang, seedLang);
  signals.push({ source: "language_match", contribution: langSim * 0.35 });

  const total = Math.min(1, metaContrib + featSim * 0.2 + langSim * 0.35 + artistBonus);

  return {
    track,
    score: total,
    signals,
  };
}

function computeLanguageSimilarity(a: Language, b: Language): number {
  const langGroups: Record<string, Language[]> = {
    southIndian: ["telugu", "tamil", "kannada", "malayalam"],
    northIndian: ["hindi", "punjabi", "bengali"],
  };

  if (a === b) return 1.0;
  if (a === "unknown" || b === "unknown") return 0.3;

  for (const group of Object.values(langGroups)) {
    if (group.includes(a) && group.includes(b)) return 0.6;
  }

  return 0.1;
}

export function rankSimilar(
  candidates: Track[],
  seed: Track,
  seedFeatures?: AudioFeatures,
  featuresMap?: Map<string, AudioFeatures>
): SimilarityResult[] {
  return candidates
    .filter((t) => t.id !== seed.id)
    .map((t) =>
      computeScore(
        t,
        seed,
        seedFeatures,
        featuresMap?.get(t.id)
      )
    )
    .sort((a, b) => b.score - a.score);
}
