import type { Track } from "@/lib/types";
import type { AudioFeatures, TasteProfile } from "./types";
import { cosineSimilarity } from "./similarity";
import { defaultFeatures } from "./audioFeatures";

interface Cluster {
  id: number;
  centroid: number[];
  tracks: Set<string>;
}

const STORAGE_KEY = "spotube:userFactors";
const EMBEDDING_DIM = 16;

export function loadUserFactors(): Float64Array | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Float64Array(JSON.parse(raw));
  } catch {}
  return null;
}

export function saveUserFactors(factors: Float64Array): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(factors)));
  } catch {}
}

export function initializeUserFactors(): Float64Array {
  const factors = new Float64Array(EMBEDDING_DIM);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    factors[i] = (Math.random() - 0.5) * 0.1;
  }
  return factors;
}

function trackToEmbedding(
  track: Track,
  features?: AudioFeatures
): number[] {
  const f = features ?? defaultFeatures();
  return [
    f.tempo / 200,
    f.energy,
    f.valence,
    f.danceability,
    f.acousticness,
    f.instrumentalness,
    normalizeTrackName(track.name),
    normalizeArtistName(track.artist),
  ];
}

function normalizeTrackName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return (hash % 10000) / 10000;
}

function normalizeArtistName(artist: string): number {
  let hash = 5381;
  for (let i = 0; i < artist.length; i++) {
    hash = (hash * 33) ^ artist.charCodeAt(i);
  }
  return ((hash % 10000) / 10000 + 1) / 2;
}

export function predictScore(
  userFactors: Float64Array,
  track: Track,
  features?: AudioFeatures
): number {
  const itemVec = trackToEmbedding(track, features);
  const pad = EMBEDDING_DIM - itemVec.length;
  const padded = pad > 0 ? [...itemVec, ...new Array(pad).fill(0.5)] : itemVec.slice(0, EMBEDDING_DIM);
  return cosineSimilarity(Array.from(userFactors), padded);
}

export function updateUserFactors(
  userFactors: Float64Array,
  track: Track,
  feedback: number,
  features?: AudioFeatures,
  learningRate: number = 0.01
): Float64Array {
  const itemVec = trackToEmbedding(track, features);
  const pad = EMBEDDING_DIM - itemVec.length;
  const padded = pad > 0 ? [...itemVec, ...new Array(pad).fill(0.5)] : itemVec.slice(0, EMBEDDING_DIM);

  const prediction = cosineSimilarity(Array.from(userFactors), padded);
  const error = feedback - prediction;

  const updated = new Float64Array(userFactors);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    const grad = error * padded[i] - 0.01 * userFactors[i];
    updated[i] += learningRate * grad;
  }

  return updated;
}

interface TasteCluster {
  id: number;
  centroid: number[];
  members: string[];
}

const CLUSTERS_KEY = "spotube:tasteClusters";

export function loadClusters(): TasteCluster[] {
  try {
    return JSON.parse(localStorage.getItem(CLUSTERS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveClusters(clusters: TasteCluster[]): void {
  try {
    localStorage.setItem(CLUSTERS_KEY, JSON.stringify(clusters));
  } catch {}
}

const EM_STORAGE_KEY = "spotube:trackEmbeddings";

export function loadTrackEmbeddings(): Map<string, number[]> {
  try {
    const raw = localStorage.getItem(EM_STORAGE_KEY);
    if (raw) return new Map(JSON.parse(raw));
  } catch {}
  return new Map();
}

export function saveTrackEmbedding(id: string, embedding: number[]): void {
  try {
    const all = loadTrackEmbeddings();
    all.set(id, embedding);
    const serialized = JSON.stringify(Array.from(all.entries()));
    if (serialized.length < 500000) {
      localStorage.setItem(EM_STORAGE_KEY, serialized);
    }
  } catch {}
}

export function itemBasedSimilarity(
  targetId: string,
  candidates: Track[],
  featuresMap?: Map<string, AudioFeatures>
): Map<string, number> {
  const embeddings = loadTrackEmbeddings();
  const targetEmb = embeddings.get(targetId);
  if (!targetEmb) return new Map();

  const scores = new Map<string, number>();
  for (const c of candidates) {
    if (c.id === targetId) continue;
    const cEmb = embeddings.get(c.id) ??
      trackToEmbedding(c, featuresMap?.get(c.id));
    scores.set(c.id, cosineSimilarity(targetEmb, cEmb));
  }
  return scores;
}
