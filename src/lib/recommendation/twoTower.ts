import type { Track } from "@/lib/types";
import type {
  AudioFeatures,
  BehaviorEvent,
  PlayContext,
  TasteProfile,
} from "./types";
import { cosineSimilarity, featureVector } from "./similarity";
import { defaultFeatures, inferFeaturesFromTrack } from "./audioFeatures";
import { detectLanguage, type Language } from "./language";

export interface TwoTowerConfig {
  userDim: number;
  songDim: number;
  projectionDim: number;
}

const DEFAULT_CONFIG: TwoTowerConfig = {
  userDim: 32,
  songDim: 24,
  projectionDim: 16,
};

const TOWER_CACHE_KEY = "spotube:twoTower";

interface CachedWeights {
  userBias: number[];
  songBias: number[];
  userProjection: number[][];
  songProjection: number[][];
}

function loadWeights(): CachedWeights | null {
  try {
    const raw = localStorage.getItem(TOWER_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveWeights(w: CachedWeights): void {
  try {
    localStorage.setItem(TOWER_CACHE_KEY, JSON.stringify(w));
  } catch {}
}

function initWeights(cfg: TwoTowerConfig = DEFAULT_CONFIG): CachedWeights {
  const rand = () => (Math.random() - 0.5) * 0.1;
  const userBias = Array.from({ length: cfg.projectionDim }, rand);
  const songBias = Array.from({ length: cfg.projectionDim }, rand);
  const userProjection = Array.from({ length: cfg.projectionDim }, () =>
    Array.from({ length: cfg.userDim }, rand)
  );
  const songProjection = Array.from({ length: cfg.projectionDim }, () =>
    Array.from({ length: cfg.songDim }, rand)
  );
  const w: CachedWeights = { userBias, songBias, userProjection, songProjection };
  saveWeights(w);
  return w;
}

function getWeights(cfg: TwoTowerConfig = DEFAULT_CONFIG): CachedWeights {
  return loadWeights() ?? initWeights(cfg);
}

function matVecMul(mat: number[][], vec: number[]): number[] {
  return mat.map((row) => {
    let sum = 0;
    for (let i = 0; i < row.length; i++) sum += row[i] * (vec[i] ?? 0);
    return sum;
  });
}

function vecAdd(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + (b[i] ?? 0));
}

function relu(v: number[]): number[] {
  return v.map((x) => Math.max(0, x));
}

function recentHistoryEmbedding(
  profile: TasteProfile,
  window: number = 10
): number[] {
  const artists = Array.from(profile.favoriteArtists.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, window);
  const emb = new Float64Array(window);
  for (let i = 0; i < artists.length && i < window; i++) {
    emb[i] = artists[i][1] / Math.max(1, artists[0][1]);
  }
  return Array.from(emb);
}

export function encodeUserTower(
  profile: TasteProfile,
  context: PlayContext,
  recentEvents?: BehaviorEvent[]
): number[] {
  const cfg = DEFAULT_CONFIG;

  const artistVec = recentHistoryEmbedding(profile, 10);

  const genreVec = Array.from(profile.genreAffinities.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([, v]) => Math.min(1, v / 5));
  while (genreVec.length < 8) genreVec.push(0);

  const langVec = [
    profile.languageAffinities.get("telugu" as Language) ?? 0,
    profile.languageAffinities.get("hindi" as Language) ?? 0,
    profile.languageAffinities.get("tamil" as Language) ?? 0,
    profile.languageAffinities.get("english" as Language) ?? 0,
  ].map((v) => Math.min(1, v / 5));

  const prefVec = [
    profile.energyPreference,
    profile.valencePreference,
    profile.acousticPreference,
    profile.danceabilityPreference,
    profile.diversitySeeking,
    profile.completionRate,
    profile.skipThreshold,
  ];

  const tempoNorm = (profile.tempoPreference.ideal - 60) / 120;
  const sessionNorm = Math.min(1, profile.sessionLengthAvg / 20);

  const contextVec = [
    context.hourOfDay / 24,
    context.dayOfWeek / 6,
    sessionNorm,
    tempoNorm,
    profile.primaryLanguage === "telugu" ? 1 : 0.5,
  ];

  const rawUserVec = [
    ...artistVec,
    ...genreVec,
    ...langVec,
    ...prefVec,
    ...contextVec,
  ];

  while (rawUserVec.length < cfg.userDim) rawUserVec.push(0);
  const trimmed = rawUserVec.slice(0, cfg.userDim);

  const w = getWeights(cfg);
  const projected = vecAdd(matVecMul(w.userProjection, trimmed), w.userBias);
  return relu(projected);
}

export function encodeSongTower(
  track: Track,
  features?: AudioFeatures
): number[] {
  const cfg = DEFAULT_CONFIG;
  const f = features ?? inferFeaturesFromTrack(track);

  const audioVec = featureVector(f);

  let artistHash = 0;
  for (let i = 0; i < track.artist.length; i++) {
    artistHash = ((artistHash << 5) - artistHash + track.artist.charCodeAt(i)) | 0;
  }
  const artistNorm = ((artistHash % 10000) / 10000 + 1) / 2;

  let nameHash = 0;
  for (let i = 0; i < track.name.length; i++) {
    nameHash = ((nameHash << 5) - nameHash + track.name.charCodeAt(i)) | 0;
  }
  const nameNorm = ((nameHash % 10000) / 10000 + 1) / 2;

  const lang = detectLanguage(track);
  const langVec: number[] = [];
  const langs: Language[] = ["telugu", "hindi", "tamil", "english", "unknown"];
  for (const l of langs) {
    langVec.push(lang === l ? 1 : 0);
  }

  const durNorm = track.duration > 0 ? Math.min(1, track.duration / 600) : 0.5;

  const rawSongVec = [
    ...audioVec,
    artistNorm,
    nameNorm,
    durNorm,
    ...langVec,
  ];

  while (rawSongVec.length < cfg.songDim) rawSongVec.push(0);
  const trimmed = rawSongVec.slice(0, cfg.songDim);

  const w = getWeights(cfg);
  const projected = vecAdd(matVecMul(w.songProjection, trimmed), w.songBias);
  return relu(projected);
}

export function twoTowerScore(
  userEmbedding: number[],
  songEmbedding: number[]
): number {
  return cosineSimilarity(userEmbedding, songEmbedding);
}

export function rankByTwoTower(
  userEmbedding: number[],
  candidates: Track[],
  featuresMap?: Map<string, AudioFeatures>,
  count: number = 20
): { track: Track; score: number }[] {
  const scored = candidates.map((track) => {
    const songEmb = encodeSongTower(track, featuresMap?.get(track.id));
    const score = twoTowerScore(userEmbedding, songEmb);
    return { track, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count);
}

export function updateTwoTowerWeights(
  userEmbedding: number[],
  songEmbedding: number[],
  feedback: number,
  learningRate: number = 0.005
): void {
  const w = loadWeights();
  if (!w) return;

  const score = cosineSimilarity(userEmbedding, songEmbedding);
  const error = feedback - score;

  if (Math.abs(error) < 0.01) return;

  const updatedUserBias = [...w.userBias];
  const updatedSongBias = [...w.songBias];
  const updatedUserProj = w.userProjection.map((row) => [...row]);
  const updatedSongProj = w.songProjection.map((row) => [...row]);

  for (let i = 0; i < w.userBias.length; i++) {
    updatedUserBias[i] += learningRate * error * songEmbedding[i]!;
    updatedSongBias[i] += learningRate * error * userEmbedding[i]!;
  }

  saveWeights({
    userBias: updatedUserBias,
    songBias: updatedSongBias,
    userProjection: updatedUserProj,
    songProjection: updatedSongProj,
  });
}

export function getPersonalizedHomeSections(
  profile: TasteProfile,
  context: PlayContext,
  candidateTracks: Track[],
  featuresMap?: Map<string, AudioFeatures>,
  sections: number = 4
): { title: string; tracks: Track[]; strategy: string }[] {
  const userEmb = encodeUserTower(profile, context);
  const ranked = rankByTwoTower(userEmb, candidateTracks, featuresMap, 50);

  const hour = context.hourOfDay;
  const isWeekend = context.dayOfWeek === 0 || context.dayOfWeek === 6;

  const timeLabels: Record<string, string> = {
    morning: "Morning Boost",
    midday: "Focus Flow",
    afternoon: "Afternoon Energy",
    evening: "Evening Vibes",
    night: "Late Night Chill",
  };

  let timeSlot = "midday";
  if (hour >= 5 && hour <= 9) timeSlot = "morning";
  else if (hour >= 10 && hour <= 14) timeSlot = "midday";
  else if (hour >= 15 && hour <= 18) timeSlot = "afternoon";
  else if (hour >= 19 && hour <= 22) timeSlot = "evening";
  else timeSlot = "night";

  const timeTitle = isWeekend
    ? `Weekend ${timeLabels[timeSlot]?.split(" ").pop()}`
    : timeLabels[timeSlot] ?? "Recommended";

  const topArtists = Array.from(profile.favoriteArtists.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  const artistTracks: Track[] = [];
  const seen = new Set<string>();
  for (const artist of topArtists) {
    for (const t of candidateTracks) {
      if (seen.has(t.id)) continue;
      if (t.artist.toLowerCase().includes(artist)) {
        artistTracks.push(t);
        seen.add(t.id);
        if (artistTracks.length >= 8) break;
      }
    }
    if (artistTracks.length >= 8) break;
  }

  const primaryLang = profile.primaryLanguage || "telugu";
  const langTracks = candidateTracks
    .filter((t) => {
      const l = detectLanguage(t);
      return l === primaryLang || l === "telugu";
    })
    .slice(0, 12);

  const sectionsList: { title: string; tracks: Track[]; strategy: string }[] =
    [];

  if (ranked.length > 0) {
    sectionsList.push({
      title: timeTitle,
      tracks: ranked.slice(0, 12).map((r) => r.track),
      strategy: "two_tower",
    });
  }

  if (artistTracks.length >= 4) {
    sectionsList.push({
      title: `Because you like ${topArtists[0] ?? "this artist"}`,
      tracks: artistTracks,
      strategy: "artist_affinity",
    });
  }

  if (langTracks.length >= 4) {
    sectionsList.push({
      title: `Top ${primaryLang.charAt(0).toUpperCase() + primaryLang.slice(1)} Picks`,
      tracks: langTracks,
      strategy: "language_boost",
    });
  }

  const diverse = ranked.length > 12 ? ranked.slice(12, 24) : [];
  if (diverse.length >= 4) {
    sectionsList.push({
      title: "Discover Something Different",
      tracks: diverse.map((r) => r.track),
      strategy: "diversity",
    });
  }

  return sectionsList.slice(0, sections);
}
