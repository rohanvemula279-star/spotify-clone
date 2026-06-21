import type { PlayContext, TasteProfile } from "./types";

export interface ContextModifiers {
  energyBoost: number;
  valenceBoost: number;
  tempoTarget: number;
  diversityPenalty: number;
  noveltyBonus: number;
  acousticBias: number;
}

export function getContextModifiers(
  context: PlayContext,
  profile: TasteProfile
): ContextModifiers {
  const hour = context.hourOfDay;
  const day = context.dayOfWeek;
  const isWeekend = day === 0 || day === 6;
  const sessionDepth = context.sessionTrackCount;

  let energyBoost = 0;
  let valenceBoost = 0;
  let tempoTarget = 120;
  let diversityPenalty = 0;
  let noveltyBonus = 0;
  let acousticBias = 0;

  // Morning (5-9): gentle ramp up, acoustic-friendly
  if (hour >= 5 && hour <= 9) {
    energyBoost = -0.15;
    valenceBoost = 0.1;
    tempoTarget = 95;
    acousticBias = 0.2;
  }
  // Midday (10-14): neutral, work-friendly
  else if (hour >= 10 && hour <= 14) {
    energyBoost = 0;
    tempoTarget = 110;
    acousticBias = 0.1;
  }
  // Afternoon (15-18): energy increase
  else if (hour >= 15 && hour <= 18) {
    energyBoost = 0.1;
    tempoTarget = 125;
  }
  // Evening (19-22): peak energy, social
  else if (hour >= 19 && hour <= 22) {
    energyBoost = isWeekend ? 0.25 : 0.15;
    valenceBoost = isWeekend ? 0.2 : 0.1;
    tempoTarget = isWeekend ? 135 : 125;
  }
  // Night (23-4): wind down
  else {
    energyBoost = -0.2;
    valenceBoost = -0.1;
    tempoTarget = 85;
    acousticBias = 0.25;
  }

  // Session depth effects
  if (sessionDepth > 10) {
    diversityPenalty = Math.min(0.3, sessionDepth * 0.01);
    noveltyBonus = Math.min(0.2, sessionDepth * 0.008);
  }

  // Weekend boost
  if (isWeekend) {
    energyBoost += 0.1;
    valenceBoost += 0.1;
  }

  // Profile-aware adjustments
  const profileEnergy = profile.energyPreference;
  if (profileEnergy > 0.7) {
    energyBoost += 0.05;
  } else if (profileEnergy < 0.3) {
    energyBoost -= 0.05;
    acousticBias += 0.1;
  }

  return {
    energyBoost: clamp(energyBoost, -0.5, 0.5),
    valenceBoost: clamp(valenceBoost, -0.5, 0.5),
    tempoTarget,
    diversityPenalty: clamp(diversityPenalty, 0, 0.3),
    noveltyBonus: clamp(noveltyBonus, 0, 0.2),
    acousticBias: clamp(acousticBias, -0.3, 0.3),
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function getContextLabel(context: PlayContext): string {
  const hour = context.hourOfDay;
  const isWeekend = context.dayOfWeek === 0 || context.dayOfWeek === 6;

  if (hour >= 5 && hour <= 9) return isWeekend ? "Lazy Morning" : "Morning Commute";
  if (hour >= 10 && hour <= 14) return "Midday Focus";
  if (hour >= 15 && hour <= 18) return isWeekend ? "Weekend Wind-Down" : "Afternoon Drive";
  if (hour >= 19 && hour <= 22) return isWeekend ? "Weekend Vibes" : "Evening Relax";
  return "Late Night";
}

export function getMoodKeywords(context: PlayContext): string[] {
  const hour = context.hourOfDay;
  const isWeekend = context.dayOfWeek === 0 || context.dayOfWeek === 6;

  if (hour >= 5 && hour <= 9) return ["chill", "morning", "acoustic", "calm"];
  if (hour >= 10 && hour <= 14) return ["focus", "instrumental", "ambient", "work"];
  if (hour >= 15 && hour <= 18) return ["upbeat", "pop", "energy"];
  if (hour >= 19 && hour <= 22) return isWeekend ? ["party", "dance", "hits"] : ["chill", "rnb", "mellow"];
  return ["ambient", "sleep", "calm", "lofi"];
}
