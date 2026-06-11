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

// MM:SS broken into numeric parts, matching the project blueprint shape.
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

interface PlayerContextValue {
  // --- states ---
  track: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  time: TimeState;
  queue: Track[];
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  // --- refs (timeline DOM nodes, attached by <Player/>) ---
  seekBg: React.RefObject<HTMLDivElement>;
  seekBar: React.RefObject<HTMLDivElement>;
  // --- functions ---
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

const YT_API_SRC = "https://www.youtube.com/iframe_api";

/** Convert a seconds float into {min, sec}. */
function toClock(seconds: number): Clock {
  const s = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return { min: Math.floor(s / 60), sec: Math.floor(s % 60) };
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [track, setTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [time, setTime] = useState<TimeState>(ZERO_TIME);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [volume, setVolumeState] = useState(100);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  // Refs mirror state for async callbacks (ENDED handler, next/prev) so
  // they read the latest values without stale closures.
  const queueRef = useRef<Track[]>([]);
  const queueIndexRef = useRef(-1);
  const shuffleRef = useRef(false);
  const repeatRef = useRef(false);
  const volumeRef = useRef(100);
  const mutedRef = useRef(false);
  // Mirrors isPlaying so the (stable) keydown handler can read the latest
  // playback state without re-subscribing the window listener every render.
  const isPlayingRef = useRef(false);

  // Timeline DOM nodes, owned by <Player/> but driven from here.
  const seekBg = useRef<HTMLDivElement>(null);
  const seekBar = useRef<HTMLDivElement>(null);

  const playerRef = useRef<YTPlayer | null>(null);
  const playerReadyRef = useRef(false);
  const pendingVideoIdRef = useRef<string | null>(null);

  // --- load a resolved YouTube id into the player --------------------
  const loadVideo = useCallback((videoId: string) => {
    if (playerReadyRef.current && playerRef.current) {
      playerRef.current.loadVideoById(videoId); // autoplays
    } else {
      pendingVideoIdRef.current = videoId;
    }
  }, []);

  // --- resolve metadata -> YouTube id -> playback --------------------
  const playTrackAt = useCallback(
    async (index: number, list: Track[]) => {
      const t = list[index];
      if (!t) return;

      setTrack(t);
      setQueueIndex(index);
      queueIndexRef.current = index;
      setIsLoading(true);
      setIsPlaying(false);
      // Reset the timeline for the new track.
      setTime(ZERO_TIME);
      if (seekBar.current) seekBar.current.style.width = "0%";

      try {
        const res = await fetch("/api/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spotifyId: t.spotifyId,
            trackName: t.name,
            artistName: t.artist,
          }),
        });
        if (!res.ok) {
          console.error("resolve failed", await res.text());
          setIsLoading(false);
          return;
        }
        const data = (await res.json()) as { youtubeVideoId: string };
        loadVideo(data.youtubeVideoId);
      } catch (err) {
        console.error("resolve error", err);
        setIsLoading(false);
      }
    },
    [loadVideo]
  );

  // --- create the (hidden) IFrame player once -----------------------
  useEffect(() => {
    function createPlayer() {
      if (playerRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player("yt-player", {
        height: "200",
        width: "200",
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1 },
        events: {
          onReady: () => {
            playerReadyRef.current = true;
            playerRef.current?.setVolume(volumeRef.current);
            if (pendingVideoIdRef.current) {
              playerRef.current?.loadVideoById(pendingVideoIdRef.current);
              pendingVideoIdRef.current = null;
            }
          },
          onStateChange: (event) => {
            const S = window.YT?.PlayerState;
            if (!S) return;
            const state = event.data;
            if (state === S.PLAYING) {
              setIsPlaying(true);
              setIsLoading(false);
            } else if (state === S.PAUSED) {
              setIsPlaying(false);
            } else if (state === S.BUFFERING) {
              setIsLoading(true);
            } else if (state === S.ENDED) {
              setIsPlaying(false);
              handleEnded();
            }
          },
          onError: () => {
            setIsLoading(false);
            setIsPlaying(false);
          },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        createPlayer();
      };
      if (!document.querySelector(`script[src="${YT_API_SRC}"]`)) {
        const tag = document.createElement("script");
        tag.src = YT_API_SRC;
        document.body.appendChild(tag);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // What to do when a track finishes: repeat > shuffle > advance.
  const handleEnded = useCallback(() => {
    const q = queueRef.current;
    const i = queueIndexRef.current;
    if (repeatRef.current) {
      playerRef.current?.seekTo(0, true);
      playerRef.current?.playVideo();
      return;
    }
    if (shuffleRef.current && q.length > 1) {
      let r = i;
      while (r === i) r = Math.floor(Math.random() * q.length);
      void playTrackAt(r, q);
      return;
    }
    if (i + 1 < q.length) void playTrackAt(i + 1, q);
  }, [playTrackAt]);

  // --- timeline polling: drive the seek bar + MM:SS text ------------
  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p || !playerReadyRef.current || typeof p.getDuration !== "function") {
        return;
      }
      const dur = p.getDuration() || 0;
      const cur = p.getCurrentTime() || 0;
      // Fill the bar imperatively every tick for smoothness (no re-render).
      if (seekBar.current) {
        seekBar.current.style.width = dur ? `${(cur / dur) * 100}%` : "0%";
      }
      // Only push state when the displayed second actually changes, so the
      // context re-renders ~1x/sec instead of 4x/sec.
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
    }, 250);
    return () => clearInterval(id);
  }, []);

  // --- public controls ----------------------------------------------
  const play = useCallback(() => playerRef.current?.playVideo(), []);
  const pause = useCallback(() => playerRef.current?.pauseVideo(), []);

  const playWithId = useCallback(
    (id: string, list?: Track[]) => {
      const q = list && list.length ? list : queueRef.current;
      if (list && list.length) {
        setQueue(list);
        queueRef.current = list;
      }
      const idx = q.findIndex((t) => t.spotifyId === id);
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
    const p = playerRef.current;
    if (!p || !playerReadyRef.current || !seekBg.current) return;
    const dur = typeof p.getDuration === "function" ? p.getDuration() : 0;
    if (!dur) return;
    const rect = seekBg.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    p.seekTo(ratio * dur, true);
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(100, Math.max(0, v));
    volumeRef.current = clamped;
    setVolumeState(clamped);
    playerRef.current?.setVolume(clamped);
    // Any explicit volume change lifts mute (matches Spotify's behaviour).
    if (mutedRef.current) {
      mutedRef.current = false;
      setMuted(false);
      playerRef.current?.unMute();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    setMuted((m) => {
      const nextMuted = !m;
      mutedRef.current = nextMuted;
      if (nextMuted) p.mute();
      else p.unMute();
      return nextMuted;
    });
  }, []);

  // Seek relative to the current position, clamped to [0, duration].
  const seekBy = useCallback((delta: number) => {
    const p = playerRef.current;
    if (!p || !playerReadyRef.current || typeof p.getCurrentTime !== "function") {
      return;
    }
    const dur = typeof p.getDuration === "function" ? p.getDuration() : 0;
    const cur = p.getCurrentTime() || 0;
    const target = Math.max(0, dur ? Math.min(dur, cur + delta) : cur + delta);
    p.seekTo(target, true);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((s) => {
      shuffleRef.current = !s;
      return !s;
    });
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat((r) => {
      repeatRef.current = !r;
      return !r;
    });
  }, []);

  // Keep the playback-state ref fresh for the keydown handler below.
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // --- global keyboard shortcuts ------------------------------------
  // Registered once; every action is a stable useCallback (or reads a ref),
  // so the listener never needs to re-subscribe on state changes.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Guard clause: never hijack keys while typing in a field.
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      // Switch on e.code (physical key) so letter shortcuts are
      // caps/locale-independent and Space/Arrows map cleanly.
      switch (e.code) {
        case "Space":
          e.preventDefault(); // stop the page from scrolling down
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

  // --- Native Media Session: metadata (system overlay / lock screen) --
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
      artwork: track.albumArt
        ? [{ src: track.albumArt, sizes: "500x500", type: "image/jpeg" }]
        : [],
    });
  }, [track]);

  // --- Native Media Session: playback state + hardware/key handlers ---
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
    <PlayerContext.Provider value={value}>
      {children}
      {/*
        COMPLIANCE: the YouTube IFrame must NOT be display:none or 0x0 or
        YouTube blocks playback. We keep it at the mandatory 200x200 layout
        size but throw it ~9999px off the left edge (transparent +
        non-interactive) so it never shows through the dark-theme UI.
      */}
      <div
        aria-hidden
        className="fixed top-0 -left-[9999px] w-[200px] h-[200px] pointer-events-none opacity-[0.001] overflow-hidden"
      >
        <div id="yt-player" />
      </div>
    </PlayerContext.Provider>
  );
}
