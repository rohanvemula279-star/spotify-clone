"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getLyrics, clearLyricsCache } from "@/lib/lyrics";
import { findCurrentLine } from "@/lib/lyrics/lrc-parser";
import type { LrcData, LyricsResult } from "@/lib/lyrics/types";
import { usePlayer } from "./PlayerContext";

interface LyricsContextValue {
  lyrics: LyricsResult | null;
  currentLineIndex: number;
  loading: boolean;
  error: string | null;
  visible: boolean;
  toggle: () => void;
}

const LyricsContext = createContext<LyricsContextValue | null>(null);

export function useLyrics() {
  const ctx = useContext(LyricsContext);
  if (!ctx) throw new Error("useLyrics must be used within <LyricsProvider>");
  return ctx;
}

export function LyricsProvider({ children }: { children: React.ReactNode }) {
  const { track } = usePlayer();
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Track the audio element for real-time sync
  useEffect(() => {
    audioRef.current = document.querySelector("audio");
  }, []);

  // Poll currentTime for line sync
  useEffect(() => {
    if (!visible || !lyrics) return;
    const interval = setInterval(() => {
      const audio = audioRef.current || document.querySelector("audio");
      if (audio && lyrics.lrc) {
        setCurrentLineIndex(findCurrentLine(lyrics.lrc.lines, audio.currentTime));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [visible, lyrics]);

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!track) {
      setLyrics(null);
      setError(null);
      setCurrentLineIndex(-1);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setCurrentLineIndex(-1);

    getLyrics(track.name, track.artist, track.duration, track.album).then(
      (result) => {
        if (!active) return;
        setLoading(false);
        if (result) {
          setLyrics(result);
        } else {
          setError("No lyrics found");
          setLyrics(null);
        }
      }
    );

    return () => {
      active = false;
    };
  }, [track?.id]);

  const toggle = useCallback(() => {
    setVisible((v) => !v);
  }, []);

  const value = useMemo<LyricsContextValue>(
    () => ({ lyrics, currentLineIndex, loading, error, visible, toggle }),
    [lyrics, currentLineIndex, loading, error, visible, toggle]
  );

  return (
    <LyricsContext.Provider value={value}>{children}</LyricsContext.Provider>
  );
}
