// --- Echo Brain: real-time autoplay / "up next" engine -----------------
//
// Inspired by Echo Music's "Echo Brain". On every track transition it pulls
// candidates from three pillars, blends them, lightly re-ranks against the
// listener's persona, and returns the next tracks to inject into the queue:
//
//   1. Anchor   — songs related to the CURRENT track (JioSaavn station)
//   2. Momentum — songs related to the PREVIOUS track (smooth transitions)
//   3. Vault    — the listener's favourites / recent plays (exploitation)
//
// The heavy lifting (finding genuinely related songs) is done by JioSaavn's
// station API, which is already well-tuned. We keep the on-device ranking
// light and language-neutral so it respects whatever the seed song is.

import type { Track } from "@/lib/types";
import { getRelatedTracks } from "@/lib/saavn";
import { loadProfile } from "./profile";
import { detectLanguage } from "./language";

export interface AutoplayOptions {
  /** The previously played track, for "momentum" bridging. */
  previous?: Track | null;
  /** Track ids to exclude (already in queue / already heard). */
  exclude?: Set<string>;
  /** Extra candidates to fold in (e.g. the Vault — top played songs). */
  vault?: Track[];
  /** How many tracks to return. */
  count?: number;
}

interface Candidate {
  track: Track;
  /** Position prior — earlier station results are stronger. */
  prior: number;
  source: "anchor" | "momentum" | "vault";
}

function artistKey(t: Track): string {
  return t.artist.toLowerCase().trim();
}

/**
 * Build the next batch of autoplay tracks for a seed song.
 * Returns [] if nothing related could be found (caller can fall back).
 */
export async function getAutoplayTracks(
  seed: Track,
  opts: AutoplayOptions = {}
): Promise<Track[]> {
  const count = opts.count ?? 20;
  const exclude = new Set(opts.exclude ?? []);
  exclude.add(seed.id);

  // Pillars 1 & 2 — fetch related feeds in parallel.
  const [anchor, momentum] = await Promise.all([
    getRelatedTracks(seed.id, Math.max(20, count)),
    opts.previous ? getRelatedTracks(opts.previous.id, 10) : Promise.resolve([]),
  ]);

  // Pool the three pillars, keeping a position prior + source for ranking.
  const pool: Candidate[] = [];
  const seen = new Set<string>(exclude);
  const push = (list: Track[], source: Candidate["source"]) => {
    list.forEach((track, i) => {
      if (!track?.id || seen.has(track.id)) return;
      seen.add(track.id);
      pool.push({ track, prior: 1 - i / Math.max(1, list.length), source });
    });
  };
  push(anchor, "anchor");
  push(momentum, "momentum");
  push(opts.vault ?? [], "vault");

  if (pool.length === 0) return [];

  // --- light persona re-rank -------------------------------------------
  const profile = loadProfile();
  const seedLang = seed.language || detectLanguage(seed);

  // Source weights: the current-track station matters most.
  const sourceWeight: Record<Candidate["source"], number> = {
    anchor: 1.0,
    momentum: 0.7,
    vault: 0.5,
  };

  for (const c of pool) {
    let score = c.prior * sourceWeight[c.source];

    // Persona: boost artists the listener already likes.
    const fav = profile.favoriteArtists.get(artistKey(c.track));
    if (fav) score += Math.min(0.25, fav * 0.05);

    // Keep the session's language vibe coherent with the seed.
    const lang = c.track.language || detectLanguage(c.track);
    if (lang === seedLang) score += 0.12;

    (c as Candidate & { score: number }).score = score;
  }

  const ranked = (pool as (Candidate & { score: number })[]).sort(
    (a, b) => b.score - a.score
  );

  // --- diversity: avoid back-to-back same-artist runs -------------------
  const out: Track[] = [];
  const recentArtists: string[] = [];
  for (const c of ranked) {
    if (out.length >= count) break;
    const ak = artistKey(c.track);
    // Skip if the last 2 picks were the same artist (unless we're starved).
    if (recentArtists.slice(-2).includes(ak) && ranked.length - out.length > count) {
      continue;
    }
    out.push(c.track);
    recentArtists.push(ak);
  }

  // Top up if diversity filtering left us short.
  if (out.length < count) {
    for (const c of ranked) {
      if (out.length >= count) break;
      if (!out.some((t) => t.id === c.track.id)) out.push(c.track);
    }
  }

  return out;
}
