"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "@/lib/types";
import type {
  AudioFeatures,
  BehaviorEvent,
  PlayContext,
  RecommendationRequest,
  RecommendationResult,
  SimilarityResult,
  TasteProfile,
} from "@/lib/recommendation";
import {
  getTasteProfile,
  recordBehavior,
  resolveFeatures,
  resolveFeaturesBatch,
  getSimilarTracks,
  getRecommendations,
  getMoodRecommendation,
  getRadioQueue,
  getArtistCatalog,
  getColdStartPrediction,
  getPersonalizedScore,
  getFeatureCache,
  getContextHint,
  getMoodSuggestions,
  detectLanguage,
  getLanguageLabel,
  getPersonalizedHomeSections,
  encodeUserTower,
} from "@/lib/recommendation";
import type { Language } from "@/lib/recommendation";

interface RecommendationContextValue {
  profile: TasteProfile;
  features: Map<string, AudioFeatures>;
  getSimilar: (seed: Track, candidates: Track[], count?: number) => Promise<SimilarityResult[]>;
  suggest: (request: RecommendationRequest, candidates: Track[]) => Promise<RecommendationResult>;
  moodPlaylist: (mood: string, candidates: Track[]) => Promise<SimilarityResult[]>;
  radio: (seed: Track, candidates: Track[]) => Promise<SimilarityResult[]>;
  record: (event: BehaviorEvent) => TasteProfile;
  contextHint: (ctx: PlayContext) => string;
  moodSuggestions: (ctx: PlayContext) => string[];
  personalizedScore: (track: Track) => number;
  ensureFeatures: (track: Track) => Promise<AudioFeatures>;
  ensureFeaturesBatch: (tracks: Track[]) => Promise<void>;
  detectLanguage: (track: Track) => string;
  getLanguageLabel: (lang: Language) => string;
  primaryLanguage: string;
  getPersonalizedSections: (candidates: Track[], context: PlayContext) => { title: string; tracks: Track[]; strategy: string }[];
}

const RecommendationContext = createContext<RecommendationContextValue | null>(null);

export function useRecommendation() {
  const ctx = useContext(RecommendationContext);
  if (!ctx) throw new Error("useRecommendation must be used within RecommendationProvider");
  return ctx;
}

export function RecommendationProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<TasteProfile>(getTasteProfile);
  const [features] = useState<Map<string, AudioFeatures>>(() => getFeatureCache());
  const featuresRef = useRef(features);
  featuresRef.current = features;

  useEffect(() => {
    const interval = setInterval(() => {
      const fresh = getTasteProfile();
      setProfile(fresh);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSimilar = useCallback(async (seed: Track, candidates: Track[], count?: number) => {
    return getSimilarTracks(seed, candidates, featuresRef.current, count);
  }, []);

  const suggest = useCallback(async (request: RecommendationRequest, candidates: Track[]) => {
    return getRecommendations(request, candidates, featuresRef.current);
  }, []);

  const moodPlaylist = useCallback(async (mood: string, candidates: Track[]) => {
    return getMoodRecommendation(mood, candidates, featuresRef.current);
  }, []);

  const radio = useCallback(async (seed: Track, candidates: Track[]) => {
    return getRadioQueue(seed, candidates, featuresRef.current, profile);
  }, [profile]);

  const record = useCallback((event: BehaviorEvent) => {
    const updated = recordBehavior(event);
    setProfile(updated);
    return updated;
  }, []);

  const contextHint = useCallback((ctx: PlayContext) => {
    return getContextHint(ctx);
  }, []);

  const moodSuggestions = useCallback((ctx: PlayContext) => {
    return getMoodSuggestions(ctx);
  }, []);

  const personalizedScore = useCallback((track: Track) => {
    return getPersonalizedScore(track, featuresRef.current.get(track.id));
  }, []);

  const ensureFeatures = useCallback(async (track: Track) => {
    const f = await resolveFeatures(track);
    features.set(track.id, f);
    return f;
  }, [features]);

  const ensureFeaturesBatch = useCallback(async (tracks: Track[]) => {
    const map = await resolveFeaturesBatch(tracks);
    for (const [id, f] of map) {
      features.set(id, f);
    }
  }, [features]);

  const getPersonalizedSections = useCallback(
    (candidates: Track[], context: PlayContext) => {
      return getPersonalizedHomeSections(
        profile,
        context,
        candidates,
        featuresRef.current
      );
    },
    [profile, featuresRef]
  );

  const value = useMemo<RecommendationContextValue>(
    () => ({
      profile,
      features,
      getSimilar,
      suggest,
      moodPlaylist,
      radio,
      record,
      contextHint,
      moodSuggestions,
      personalizedScore,
      ensureFeatures,
      ensureFeaturesBatch,
      detectLanguage,
      getLanguageLabel,
      primaryLanguage: profile.primaryLanguage || "telugu",
      getPersonalizedSections,
    }),
    [profile, features, getSimilar, suggest, moodPlaylist, radio, record, contextHint, moodSuggestions, personalizedScore, ensureFeatures, ensureFeaturesBatch, detectLanguage, getLanguageLabel, getPersonalizedSections]
  );

  return (
    <RecommendationContext.Provider value={value}>
      {children}
    </RecommendationContext.Provider>
  );
}
