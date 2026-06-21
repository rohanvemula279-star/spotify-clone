import type { Track } from "@/lib/types";
import type { TasteProfile, BehaviorEvent, AudioFeatures, PlayContext } from "./types";
import { defaultFeatures } from "./audioFeatures";
import { detectLanguage, type Language } from "./language";

const PROFILE_KEY = "spotube:tasteProfile";

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function loadProfile(): TasteProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        favoriteArtists: new Map(Object.entries(parsed.favoriteArtists || {})),
        favoriteAlbums: new Map(Object.entries(parsed.favoriteAlbums || {})),
        genreAffinities: new Map(Object.entries(parsed.genreAffinities || {})),
        languageAffinities: new Map(Object.entries(parsed.languageAffinities || {})),
      };
    }
  } catch {}
  return createDefaultProfile();
}

export function saveProfile(profile: TasteProfile): void {
  try {
    const serialized = {
      ...profile,
      favoriteArtists: Object.fromEntries(profile.favoriteArtists),
      favoriteAlbums: Object.fromEntries(profile.favoriteAlbums),
      genreAffinities: Object.fromEntries(profile.genreAffinities),
      languageAffinities: Object.fromEntries(profile.languageAffinities),
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(serialized));
  } catch {}
}

function createDefaultProfile(): TasteProfile {
  return {
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
}

export function updateProfile(
  profile: TasteProfile,
  event: BehaviorEvent
): TasteProfile {
  const decay = 0.95;
  const now = Date.now();

  const p = { ...profile };

  const artist = event.track.artist.toLowerCase();
  const album = event.track.album.toLowerCase();
  const genreKey = extractGenreToken(event.track);

  const lang: Language = detectLanguage(event.track);

  if (event.type === "complete" || event.type === "save") {
    p.favoriteArtists.set(artist, (p.favoriteArtists.get(artist) || 0) + 1);
    p.favoriteAlbums.set(album, (p.favoriteAlbums.get(album) || 0) + 1);
    if (genreKey) {
      p.genreAffinities.set(genreKey, (p.genreAffinities.get(genreKey) || 0) + 1);
    }
    p.languageAffinities.set(lang, (p.languageAffinities.get(lang) || 0) + 1);

    const sortedLangs = Array.from(p.languageAffinities.entries())
      .sort((a, b) => b[1] - a[1]);
    if (sortedLangs.length > 0) {
      p.primaryLanguage = sortedLangs[0][0];
    }
  }

  if (event.type === "skip" && event.track.duration > 0) {
    const skipPos = event.seekPosition ?? 0;
    const skipRatio = skipPos / event.track.duration;
    p.skipThreshold = clamp(p.skipThreshold * 0.95 + skipRatio * 0.05);
  }

  if (event.type === "complete") {
    p.completionRate = clamp(p.completionRate * 0.98 + 0.02);
  }
  if (event.type === "skip") {
    p.completionRate = clamp(p.completionRate * 0.98);
  }

  const sessionSize = event.context.sessionTrackCount;
  p.sessionLengthAvg = p.sessionLengthAvg * 0.95 + sessionSize * 0.05;

  p.diversitySeeking = clamp(p.diversitySeeking * decay + 0.005);

  const recentCount = Array.from(p.favoriteArtists.values()).reduce((a, b) => a + b, 0);
  if (recentCount > 100) {
    for (const [k, v] of p.favoriteArtists) {
      p.favoriteArtists.set(k, v * 0.9);
    }
    for (const [k, v] of p.favoriteAlbums) {
      p.favoriteAlbums.set(k, v * 0.9);
    }
    for (const [k, v] of p.genreAffinities) {
      p.genreAffinities.set(k, v * 0.9);
    }
    for (const [k, v] of p.languageAffinities) {
      p.languageAffinities.set(k, v * 0.9);
    }
  }

  p.updatedAt = now;
  saveProfile(p);
  return p;
}

export function computeTasteSimilarity(
  profile: TasteProfile,
  track: Track,
  features?: AudioFeatures
): number {
  const artist = track.artist.toLowerCase();
  const album = track.album.toLowerCase();
  const genreKey = extractGenreToken(track);
  const f = features ?? defaultFeatures();

  const artistAffinity = profile.favoriteArtists.get(artist) ?? 0;
  const albumAffinity = profile.favoriteAlbums.get(album) ?? 0;
  const genreAffinity = genreKey ? (profile.genreAffinities.get(genreKey) ?? 0) : 0;

  const totalInteractions = Math.max(
    1,
    Array.from(profile.favoriteArtists.values()).reduce((a, b) => a + b, 0)
  );

  const trackLang = detectLanguage(track);
  const langAffinity = profile.languageAffinities.get(trackLang) ?? 0;
  const isPrimary = trackLang === profile.primaryLanguage;

  let score = 0;
  score += Math.min(1, artistAffinity / 5) * 0.2;
  score += Math.min(1, albumAffinity / 3) * 0.1;
  score += Math.min(1, genreAffinity / Math.max(1, totalInteractions * 0.1)) * 0.1;

  const langScore = isPrimary ? 1 : Math.min(1, langAffinity / Math.max(1, totalInteractions * 0.05));
  score += langScore * 0.25;

  const tempoScore = 1 - Math.abs(f.tempo - profile.tempoPreference.ideal) / 120;
  score += Math.max(0, tempoScore) * 0.1;

  const energyDiff = Math.abs(f.energy - profile.energyPreference);
  score += (1 - energyDiff) * 0.075;

  const danceDiff = Math.abs(f.danceability - profile.danceabilityPreference);
  score += (1 - danceDiff) * 0.05;

  const acousticDiff = Math.abs(f.acousticness - profile.acousticPreference);
  score += (1 - acousticDiff) * 0.05;

  return Math.min(1, score);
}

function extractGenreToken(track: Track): string {
  const nameL = track.name.toLowerCase();
  const artistL = track.artist.toLowerCase();
  const albumL = track.album.toLowerCase();
  const all = `${nameL} ${artistL} ${albumL}`;

  const genreKeywords: Record<string, string[]> = {
    pop: ["pop", "top 40", "mainstream"],
    rock: ["rock", "alternative", "indie", "punk", "metal", "grunge"],
    hiphop: ["hip hop", "rap", "trap", "drill", "rnb", "r&b"],
    electronic: ["electronic", "edm", "techno", "house", "trance", "dubstep", "dance"],
    jazz: ["jazz", "blues", "soul", "funk", "groove"],
    classical: ["classical", "orchestra", "symphony", "piano", "instrumental"],
    folk: ["folk", "country", "acoustic", "singer"],
    ambient: ["ambient", "chill", "lofi", "lo-fi", "relax", "meditation"],
    bollywood: ["bollywood", "hindi", "punjabi", "bhangra", "desi"],
    telugu: ["telugu", "tollywood", "sp balasubrahmanyam", "devi sri prasad", "thaman"],
    latin: ["latin", "reggaeton", "salsa", "bossa", "samba", "merengue"],
    metal: ["metal", "heavy", "screamo", "death", "black", "thrash"],
    reggae: ["reggae", "ska", "dancehall", "dub"],
  };

  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    if (keywords.some((k) => all.includes(k))) return genre;
  }
  return "";
}

export function getTopArtists(profile: TasteProfile, n: number = 10): string[] {
  return Array.from(profile.favoriteArtists.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export function getTopGenres(profile: TasteProfile, n: number = 5): string[] {
  return Array.from(profile.genreAffinities.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}
