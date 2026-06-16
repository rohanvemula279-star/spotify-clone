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
import type { Track } from "@/lib/types";
import { resolvePlayable } from "@/lib/resolve";
import { useLibrary } from "./LibraryContext";

// MM:SS broken into numeric parts.
interface Clock {
  min: number;
  sec: number;
}
interface TimeState {
  currentTime: Clock;
  totalDuration: Clock;
}

const ZERO_TIME: TimeState = {
  currentTime: { min: 0, sec: 0 },
  totalDuration: { min: 0, sec: 0 },
};

/**
 * Repeat cycles through three modes:
 *  - "off": play the queue once and stop at the end.
 *  - "all": loop the whole queue back to the start.
 *  - "one": repeat the current song on a loop ("repeat once").
 */
export type RepeatMode = "off" | "all" | "one";
const REPEAT_CYCLE: RepeatMode[] = ["off", "all", "one"];

interface PlayerContextValue {
  track: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  time: TimeState;
  queue: Track[];
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  hasNext: boolean;
  hasPrev: boolean;
  seekBg: React.RefObject<HTMLDivElement>;
  seekBar: React.RefObject<HTMLDivElement>;
  play: () => void;
  pause: () => void;
  /** Play a track by id. Pass a list to (re)set the active queue first. */
  playWithId: (id: string, list?: Track[]) => void;
  next: () => void;
  previous: () => void;
  seekSong: (e: React.MouseEvent<HTMLDivElement>) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within <PlayerProvider>");
  return ctx;
}

/** Convert a seconds float into {min, sec}. */
function toClock(seconds: number): Clock {
  const s = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return { min: Math.floor(s / 60), sec: Math.floor(s % 60) };
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  // Library gives us offline blobs + the set of downloaded ids, so playback
  // prefers a local file (works with no network) before going online.
  const { localUrl, downloaded } = useLibrary();
  const localUrlRef = useRef(localUrl);
  const downloadedRef = useRef(downloaded);
  useEffect(() => {
    localUrlRef.current = localUrl;
    downloadedRef.current = downloaded;
  }, [localUrl, downloaded]);

  const [track, setTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [time, setTime] = useState<TimeState>(ZERO_TIME);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [volume, setVolumeState] = useState(100);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");

  // Refs mirror state so async callbacks read the latest values.
  const queueRef = useRef<Track[]>([]);
  const queueIndexRef = useRef(-1);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<RepeatMode>("off");
  const volumeRef = useRef(100);
  const isPlayingRef = useRef(false);
  // Token to ignore stale async audio resolutions when the user skips fast.
  const loadTokenRef = useRef(0);
  // Active object-URL for an offline blob, revoked when the track changes.
  const objectUrlRef = useRef<string | null>(null);

  // Timeline DOM nodes, owned by <Player/> but driven from here.
  const seekBg = useRef<HTMLDivElement>(null);
  const seekBar = useRef<HTMLDivElement>(null);

  // The single HTML5 <audio> element that actually plays sound.
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- core: load + play a track at an index in a list --------------
  const playTrackAt = useCallback(async (index: number, list: Track[]) => {
    const t = list[index];
    const audio = audioRef.current;
    if (!t || !audio) return;

    const token = ++loadTokenRef.current;
    setTrack(t);
    setQueueIndex(index);
    queueIndexRef.current = index;
    setIsLoading(true);
    setIsPlaying(false);
    setTime(ZERO_TIME);
    if (seekBar.current) seekBar.current.style.width = "0%";

    // Free the previous local object-URL, if any.
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    try {
      // 1) Offline: a downloaded blob on this device always wins.
      let src: string | null = null;
      if (downloadedRef.current.has(t.id)) {
        src = await localUrlRef.current(t.id);
        if (src) objectUrlRef.current = src;
      }
      // 2) Already-resolved direct stream URL.
      if (!src) src = t.audioUrl;
      // 3) Resolve via JioSaavn (covers YouTube-sourced tracks).
      if (!src) {
        const resolved = await resolvePlayable(t);
        src = resolved?.audioUrl ?? null;
      }
      // A newer load started while we awaited — abandon this one.
      if (token !== loadTokenRef.current) return;

      if (!src) {
        console.error("No playable audio source for track", t.name);
        setIsLoading(false);
        return;
      }

      audio.src = src;
      audio.volume = volumeRef.current / 100;
      await audio.play();
    } catch (err) {
      if (token === loadTokenRef.current) {
        console.error("playback error", err);
        setIsLoading(false);
      }
    }
  }, []);

  // What to do when a track finishes: repeat-one > shuffle > advance,
  // wrapping back to the queue start when repeat is set to "all".
  const handleEnded = useCallback(() => {
    const audio = audioRef.current;
    const q = queueRef.current;
    const i = queueIndexRef.current;
    // "repeat once": keep looping the current song.
    if (repeatRef.current === "one" && audio) {
      audio.currentTime = 0;
      void audio.play();
      return;
    }
    if (shuffleRef.current && q.length > 1) {
      let r = i;
      while (r === i) r = Math.floor(Math.random() * q.length);
      void playTrackAt(r, q);
      return;
    }
    if (i + 1 < q.length) {
      void playTrackAt(i + 1, q);
      return;
    }
    // End of the queue: loop back to the start when repeating all.
    if (repeatRef.current === "all" && q.length > 0) void playTrackAt(0, q);
  }, [playTrackAt]);

  // --- create the <audio> element + wire its events once ------------
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onPlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onEnded = () => {
      setIsPlaying(false);
      handleEnded();
    };
    const onError = () => {
      setIsLoading(false);
      setIsPlaying(false);
    };
    const onTimeUpdate = () => {
      const dur = audio.duration || 0;
      const cur = audio.currentTime || 0;
      if (seekBar.current) {
        seekBar.current.style.width = dur ? `${(cur / dur) * 100}%` : "0%";
      }
      const c = toClock(cur);
      const d = toClock(dur);
      setTime((prev) =>
        prev.currentTime.min === c.min &&
        prev.currentTime.sec === c.sec &&
        prev.totalDuration.min === d.min &&
        prev.totalDuration.sec === d.sec
          ? prev
          : { currentTime: c, totalDuration: d }
      );
    };

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.pause();
      audio.src = "";
    };
  }, [handleEnded]);

  // --- public controls ----------------------------------------------
  const play = useCallback(() => {
    void audioRef.current?.play();
  }, []);
  const pause = useCallback(() => audioRef.current?.pause(), []);

  const playWithId = useCallback(
    (id: string, list?: Track[]) => {
      const q = list && list.length ? list : queueRef.current;
      if (list && list.length) {
        setQueue(list);
        queueRef.current = list;
      }
      const idx = q.findIndex((t) => t.id === id);
      if (idx === -1) return;
      void playTrackAt(idx, q);
    },
    [playTrackAt]
  );

  const next = useCallback(() => {
    const q = queueRef.current;
    const i = queueIndexRef.current;
    if (i + 1 < q.length) void playTrackAt(i + 1, q);
  }, [playTrackAt]);

  const previous = useCallback(() => {
    const q = queueRef.current;
    const i = queueIndexRef.current;
    if (i - 1 >= 0) void playTrackAt(i - 1, q);
  }, [playTrackAt]);

  const seekSong = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !seekBg.current) return;
    const dur = audio.duration || 0;
    if (!dur) return;
    const rect = seekBg.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * dur;
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(100, Math.max(0, v));
    volumeRef.current = clamped;
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped / 100;
    if (audioRef.current?.muted) {
      audioRef.current.muted = false;
      setMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setMuted((m) => {
      const nextMuted = !m;
      audio.muted = nextMuted;
      return nextMuted;
    });
  }, []);

  // Seek relative to the current position, clamped to [0, duration].
  const seekBy = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = audio.duration || 0;
    const cur = audio.currentTime || 0;
    audio.currentTime = Math.max(0, dur ? Math.min(dur, cur + delta) : cur + delta);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((s) => {
      shuffleRef.current = !s;
      return !s;
    });
  }, []);

  // Cycle off -> all -> one -> off.
  const toggleRepeat = useCallback(() => {
    setRepeat((r) => {
      const nextMode = REPEAT_CYCLE[(REPEAT_CYCLE.indexOf(r) + 1) % REPEAT_CYCLE.length];
      repeatRef.current = nextMode;
      return nextMode;
    });
  }, []);

  // Keep the playback-state ref fresh for the keydown handler.
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // --- global keyboard shortcuts ------------------------------------
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (isPlayingRef.current) pause();
          else play();
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(10);
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(-10);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(volumeRef.current + 5);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(volumeRef.current - 5);
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyN":
          next();
          break;
        case "KeyP":
          previous();
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [play, pause, next, previous, seekBy, setVolume, toggleMute]);

  // --- Native Media Session: metadata (lock screen / notification) ---
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (!track) {
      navigator.mediaSession.metadata = null;
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artist,
      album: track.album,
      artwork: track.thumbnail
        ? [{ src: track.thumbnail, sizes: "500x500", type: "image/jpeg" }]
        : [],
    });
  }, [track]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler("play", () => play());
    ms.setActionHandler("pause", () => pause());
    ms.setActionHandler("previoustrack", () => previous());
    ms.setActionHandler("nexttrack", () => next());
    return () => {
      ms.setActionHandler("play", null);
      ms.setActionHandler("pause", null);
      ms.setActionHandler("previoustrack", null);
      ms.setActionHandler("nexttrack", null);
    };
  }, [play, pause, next, previous]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      track,
      isPlaying,
      isLoading,
      time,
      queue,
      volume,
      muted,
      shuffle,
      repeat,
      hasNext: queueIndex >= 0 && queueIndex < queue.length - 1,
      hasPrev: queueIndex > 0,
      seekBg,
      seekBar,
      play,
      pause,
      playWithId,
      next,
      previous,
      seekSong,
      setVolume,
      toggleMute,
      toggleShuffle,
      toggleRepeat,
    }),
    [
      track,
      isPlaying,
      isLoading,
      time,
      queue,
      volume,
      muted,
      shuffle,
      repeat,
      queueIndex,
      play,
      pause,
      playWithId,
      next,
      previous,
      seekSong,
      setVolume,
      toggleMute,
      toggleShuffle,
      toggleRepeat,
    ]
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}
