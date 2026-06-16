"use client";

import { usePlayer } from "@/context/PlayerContext";

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-5 w-5 fill-current"}
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  play: "M8 5v14l11-7z",
  pause: "M6 5h4v14H6zm8 0h4v14h-4z",
  next: "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",
  prev: "M18 6l-8.5 6L18 18V6zM8 6v12H6V6h2z",
  shuffle:
    "M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z",
  repeat:
    "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
  repeatOne:
    "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zM13 15V9h-1l-2 1v1h1.5v4H13z",
  volume:
    "M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 00-2.5-4.03v8.05A4.5 4.5 0 0016.5 12z",
  queue: "M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z",
};

/** Format a {min, sec} clock into "M:SS". */
function fmt(t: { min: number; sec: number }) {
  return `${t.min}:${String(t.sec).padStart(2, "0")}`;
}

export function Player() {
  const {
    track,
    isPlaying,
    isLoading,
    time,
    seekBg,
    seekBar,
    play,
    pause,
    next,
    previous,
    seekSong,
    hasNext,
    hasPrev,
    volume,
    setVolume,
    shuffle,
    repeat,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();

  // A thin, non-interactive progress line for the compact mobile bar (the full
  // draggable timeline below is desktop-only). Derived from the time state so
  // it needs no extra DOM ref.
  const curSecs = time.currentTime.min * 60 + time.currentTime.sec;
  const totSecs = time.totalDuration.min * 60 + time.totalDuration.sec;
  const progressPct = totSecs ? Math.min(100, (curSecs / totSecs) * 100) : 0;

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 flex h-16 items-center justify-between gap-3 border-t border-white/10 bg-base px-3 md:grid md:h-[90px] md:grid-cols-3 md:gap-0 md:px-4">
      {/* Mobile-only thin progress line pinned to the top edge of the bar. */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-white/20 md:hidden">
        <div className="h-full bg-accent" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Left: now-playing metadata */}
      <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded bg-highlight text-xl text-muted md:h-14 md:w-14">
          {track?.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.thumbnail}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            "♪"
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">
            {track?.name ?? "Nothing playing"}
          </div>
          <div className="truncate text-xs text-muted">
            {track?.artist ?? "Search and hit play"}
          </div>
        </div>
      </div>

      {/* Center: transport controls + timeline */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-3 md:gap-5">
          <button
            onClick={toggleShuffle}
            className={`transition hover:text-white ${
              shuffle ? "text-accent" : "text-muted"
            }`}
            aria-label="Shuffle"
            aria-pressed={shuffle}
          >
            <Icon path={ICONS.shuffle} className="h-4 w-4 fill-current" />
          </button>

          <button
            onClick={previous}
            disabled={!hasPrev}
            className="text-muted transition hover:text-white disabled:opacity-30"
            aria-label="Previous"
          >
            <Icon path={ICONS.prev} />
          </button>

          <button
            onClick={isPlaying ? pause : play}
            disabled={!track || isLoading}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:scale-105 disabled:opacity-40"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
            ) : (
              <Icon
                path={isPlaying ? ICONS.pause : ICONS.play}
                className="h-5 w-5 fill-current"
              />
            )}
          </button>

          <button
            onClick={next}
            disabled={!hasNext}
            className="text-muted transition hover:text-white disabled:opacity-30"
            aria-label="Next"
          >
            <Icon path={ICONS.next} />
          </button>

          <button
            onClick={toggleRepeat}
            className={`transition hover:text-white ${
              repeat !== "off" ? "text-accent" : "text-muted"
            }`}
            aria-label={
              repeat === "one"
                ? "Repeat one"
                : repeat === "all"
                ? "Repeat all"
                : "Repeat off"
            }
            aria-pressed={repeat !== "off"}
            title={
              repeat === "one"
                ? "Repeat one"
                : repeat === "all"
                ? "Repeat all"
                : "Repeat off"
            }
          >
            <Icon
              path={repeat === "one" ? ICONS.repeatOne : ICONS.repeat}
              className="h-4 w-4 fill-current"
            />
          </button>
        </div>

        {/* Timeline: current time | seekBg(seekBar) | total duration.
            Desktop only — mobile uses the thin top line above. */}
        <div className="hidden w-full max-w-[520px] items-center gap-2 md:flex">
          <span className="w-10 text-right text-[11px] tabular-nums text-muted">
            {fmt(time.currentTime)}
          </span>
          <div
            ref={seekBg}
            onClick={seekSong}
            className="group relative h-1 flex-1 cursor-pointer rounded-full bg-white/30"
          >
            <div
              ref={seekBar}
              className="absolute left-0 top-0 h-1 rounded-full bg-white group-hover:bg-accent"
              style={{ width: "0%" }}
            />
          </div>
          <span className="w-10 text-[11px] tabular-nums text-muted">
            {fmt(time.totalDuration)}
          </span>
        </div>
      </div>

      {/* Right: volume + queue (desktop — phones use hardware volume). */}
      <div className="hidden items-center justify-end gap-3 md:flex">
        <button className="text-muted hover:text-white" aria-label="Queue">
          <Icon path={ICONS.queue} className="h-4 w-4 fill-current" />
        </button>
        <Icon path={ICONS.volume} className="h-4 w-4 fill-current text-muted" />
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volume"
          className="h-1 w-24 cursor-pointer accent-accent"
        />
      </div>
    </footer>
  );
}
