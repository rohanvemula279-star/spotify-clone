"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import type { Track } from "@/lib/types";
import type { BehaviorEvent, PlayContext } from "@/lib/recommendation";
import { detectLanguage } from "@/lib/recommendation/language";
import { encodeUserTower, encodeSongTower, updateTwoTowerWeights } from "@/lib/recommendation/twoTower";
import { loadProfile } from "@/lib/recommendation/profile";

export function BehaviorTracker() {
  const { track, isPlaying, time } = usePlayer();
  const trackedStart = useRef<{ id: string; time: number } | null>(null);
  const completedRef = useRef<Set<string>>(new Set());
  const sessionStartRef = useRef(Date.now());
  const sessionCountRef = useRef(0);
  const lastTrackRef = useRef<string | null>(null);
  const repeatCountRef = useRef<Map<string, number>>(new Map());
  const preSkipCheckRef = useRef<{ id: string; elapsed: number } | null>(null);

  useEffect(() => {
    if (!track) {
      trackedStart.current = null;
      return;
    }
  }, [track]);

  useEffect(() => {
    if (!track || !isPlaying) return;

    const trackChanged = trackedStart.current?.id !== track.id;

    if (trackChanged && trackedStart.current) {
      const prevId = trackedStart.current.id;
      elapsedCheck(prevId);
    }

    if (!trackedStart.current || trackedStart.current.id !== track.id) {
      trackedStart.current = { id: track.id, time: Date.now() };
      sessionCountRef.current++;
    }

    return () => {};
  }, [track?.id, isPlaying]);

  const elapsedCheck = (trackId: string) => {
    if (completedRef.current.has(trackId)) return;

    const now = Date.now();
    const elapsed = trackedStart.current?.time
      ? (now - trackedStart.current.time) / 1000
      : 0;

    if (!track) return;

    if (track.duration > 0 && elapsed / track.duration > 0.85) {
      recordEvent("complete", trackId, elapsed, track);
    } else if (track.duration > 0 && elapsed < 30 && elapsed > 2) {
      recordEvent("skip", trackId, elapsed, track);
    } else if (elapsed > 30) {
      recordEvent("complete", trackId, elapsed, track);
    }
  };

  const recordEvent = async (
    type: BehaviorEvent["type"],
    trackId: string,
    elapsed: number,
    t: Track
  ) => {
    if (completedRef.current.has(trackId) && type !== "repeat") return;

    const now = Date.now();
    const cxt: PlayContext = {
      hourOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      deviceType: "web",
      sessionId: `session_${sessionStartRef.current}`,
      sessionTrackCount: sessionCountRef.current,
      previousTrackId: lastTrackRef.current ?? undefined,
    };

    const taggedTrack = {
      ...t,
      language: t.language || detectLanguage(t),
    };

    const event: BehaviorEvent = {
      trackId,
      track: taggedTrack,
      type,
      timestamp: now,
      context: cxt,
      seekPosition: elapsed,
    };

    const { recordBehavior } = await import("@/lib/recommendation");
    recordBehavior(event);

    try {
      const profile = loadProfile();
      const userEmb = encodeUserTower(profile, cxt);
      const songEmb = encodeSongTower(taggedTrack);
      const feedback = type === "complete" || type === "repeat" ? 1 : type === "skip" ? 0 : 0.5;
      updateTwoTowerWeights(userEmb, songEmb, feedback);
    } catch {}

    if (type === "complete" || type === "repeat") {
      completedRef.current.add(trackId);
    }

    lastTrackRef.current = trackId;
  };

  useEffect(() => {
    if (!track) return;

    const prevId = lastTrackRef.current;
    if (prevId && prevId === track.id) {
      const rc = repeatCountRef.current;
      rc.set(track.id, (rc.get(track.id) || 0) + 1);
      if (rc.get(track.id)! <= 3) {
        const elapsed = time.currentTime.min * 60 + time.currentTime.sec;
        recordEvent("repeat", track.id, elapsed, track);
      }
    }
  }, [track?.id, isPlaying]);

  useEffect(() => {
    if (!track || !isPlaying) return;
    const curSec = time.currentTime.min * 60 + time.currentTime.sec;
    const durSec = time.totalDuration.min * 60 + time.totalDuration.sec;
    if (durSec > 0 && curSec / durSec > 0.85) {
      if (!completedRef.current.has(track.id)) {
        recordEvent("complete", track.id, curSec, track);
      }
    }
  }, [time, track?.id, isPlaying]);

  return null;
}
