import type { Track } from "@/lib/types";
import type { AudioFeatures, ArtistCatalogEmbedding, ColdStartCandidate } from "./types";
import { cosineSimilarity, featureSimilarity } from "./similarity";
import { defaultFeatures, inferFeaturesFromTrack } from "./audioFeatures";
import { encodeSongTower } from "./twoTower";

const catalogCache = new Map<string, ArtistCatalogEmbedding>();

export function buildArtistCatalog(
  tracks: Track[],
  featuresMap?: Map<string, AudioFeatures>
): Map<string, ArtistCatalogEmbedding> {
  const byArtist = new Map<string, Track[]>();

  for (const t of tracks) {
    const key = t.artist.toLowerCase().trim();
    if (!byArtist.has(key)) byArtist.set(key, []);
    byArtist.get(key)!.push(t);
  }

  const catalogs = new Map<string, ArtistCatalogEmbedding>();

  for (const [artist, artistTracks] of byArtist) {
    if (artistTracks.length < 2) continue;

    const avgFeatureKeys = [
      "tempo", "energy", "valence", "danceability",
      "acousticness", "instrumentalness", "loudness", "speechiness",
    ] as (keyof AudioFeatures)[];

    const avgFeatures = { ...defaultFeatures() };

    for (const key of avgFeatureKeys) {
      let sum = 0;
      let count = 0;
      for (const t of artistTracks) {
        const f = featuresMap?.get(t.id);
        if (f) {
          sum += f[key] as number;
          count++;
        }
      }
      if (count > 0) {
        (avgFeatures as any)[key] = sum / count;
      }
    }

    const embedding: ArtistCatalogEmbedding = {
      artist,
      tracks: artistTracks,
      avgFeatures,
      genreSignatures: extractGenreSignatures(artistTracks),
      popularity: computeCatalogPopularity(artistTracks),
      catalogSize: artistTracks.length,
    };

    catalogs.set(artist, embedding);
    catalogCache.set(artist, embedding);
  }

  return catalogs;
}

function extractGenreSignatures(tracks: Track[]): string[] {
  const genreKeywords: Record<string, string[]> = {
    pop: ["pop"],
    rock: ["rock", "alternative", "indie"],
    hiphop: ["rap", "hip hop", "trap", "rnb"],
    electronic: ["electronic", "edm", "house", "techno"],
    jazz: ["jazz", "blues", "soul"],
    classical: ["classical"],
    folk: ["folk", "country", "acoustic"],
    ambient: ["ambient", "chill", "lofi"],
    bollywood: ["bollywood", "hindi", "punjabi"],
    telugu: ["telugu", "tollywood", "sp balasubrahmanyam", "devi sri prasad", "thaman"],
    latin: ["latin", "reggaeton"],
  };

  const signatures = new Set<string>();
  const text = tracks
    .map((t) => `${t.name} ${t.album}`.toLowerCase())
    .join(" ");

  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    if (keywords.some((k) => text.includes(k))) {
      signatures.add(genre);
    }
  }

  return Array.from(signatures);
}

function computeCatalogPopularity(tracks: Track[]): number {
  return Math.min(1, tracks.length / 100);
}

export function getCachedCatalog(artist: string): ArtistCatalogEmbedding | undefined {
  return catalogCache.get(artist.toLowerCase().trim());
}

export function evaluateColdStart(
  newTrack: Track,
  catalogs: Map<string, ArtistCatalogEmbedding>
): ColdStartCandidate | null {
  const artistKey = newTrack.artist.toLowerCase().trim();
  const catalog = catalogs.get(artistKey) || catalogCache.get(artistKey);

  if (!catalog || catalog.catalogSize < 1) return null;

  const newFeatures = inferFeaturesFromTrack(newTrack);
  const newSongEmb = encodeSongTower(newTrack, newFeatures);

  const attentionWeights: { trackId: string; weight: number }[] = [];
  for (const existing of catalog.tracks) {
    const existingFeatures = defaultFeatures();
    const featSim = computeAcousticSimilarity(
      newTrack, existing, newFeatures, existingFeatures
    );
    const existingEmb = encodeSongTower(existing, existingFeatures);
    const embSim = cosineSimilarity(Array.from(newSongEmb), Array.from(existingEmb));
    const weight = featSim * 0.5 + embSim * 0.5;
    attentionWeights.push({ trackId: existing.id, weight });
  }

  attentionWeights.sort((a, b) => b.weight - a.weight);
  const topWeights = attentionWeights.slice(0, 5);
  const totalWeight = topWeights.reduce((s, w) => s + w.weight, 0) || 1;

  const predictedEmbedding = new Float64Array(16);
  const fromFeatures = Array.from(newSongEmb);
  for (let j = 0; j < 16 && j < fromFeatures.length; j++) {
    predictedEmbedding[j] = fromFeatures[j] ?? 0;
  }

  for (const { trackId, weight } of topWeights) {
    const normalizedWeight = weight / totalWeight;
    let hash = 0;
    for (let i = 0; i < trackId.length; i++) {
      hash = ((hash << 5) - hash + trackId.charCodeAt(i)) | 0;
    }
    const val = (hash % 100) / 100;
    for (let j = 0; j < 16; j++) {
      predictedEmbedding[j] += val * normalizedWeight * 0.3 * (j % 2 === 0 ? 1 : -1);
    }
  }

  const primaryLangBoost = catalog.genreSignatures.includes("telugu") ? 0.2 : 0;
  const confidence = Math.min(
    0.95,
    catalog.catalogSize * 0.05 + totalWeight * 0.3 + primaryLangBoost
  );

  return {
    track: newTrack,
    artistCatalog: catalog,
    attentionWeights: topWeights,
    predictedEmbedding,
    confidence,
  };
}

function computeAcousticSimilarity(
  a: Track,
  b: Track,
  aFeatures?: AudioFeatures,
  bFeatures?: AudioFeatures
): number {
  const fa = aFeatures ?? inferFeaturesFromTrack(a);
  const fb = bFeatures ?? inferFeaturesFromTrack(b);

  const keys: (keyof AudioFeatures)[] = [
    "tempo", "energy", "valence", "danceability",
    "acousticness", "instrumentalness",
  ];

  let similarity = 0;
  for (const key of keys) {
    const va = fa[key] as number;
    const vb = fb[key] as number;
    const maxVal = key === "tempo" ? 200 : 1;
    similarity += 1 - Math.abs(va - vb) / maxVal;
  }

  const nameScore = jaccardSimilarity(a.name, b.name);
  similarity += nameScore;
  return similarity / (keys.length + 1);
}

function jaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(s.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean));
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 && tb.size === 0) return 0;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection++;
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
