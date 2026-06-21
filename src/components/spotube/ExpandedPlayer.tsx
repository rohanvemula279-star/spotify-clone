"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { Icon } from "./Icon";
import { SimilarTrackRail } from "@/components/recommendation/SimilarTrackRail";
import { useLibrary } from "@/context/LibraryContext";
import type { Track } from "@/lib/types";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ExpandedPlayer({ onClose }: { onClose: () => void }) {
  const {
    track, isPlaying, isLoading, time, volume, muted, shuffle, repeat, radio,
    hasNext, hasPrev, play, pause, next, previous, seekSong, seekBg, seekBar,
    setVolume, toggleMute, toggleShuffle, toggleRepeat, toggleRadio,
  } = usePlayer();
  const { songs } = useLibrary();

  const totalSec = time.totalDuration.min * 60 + time.totalDuration.sec;
  const currentSec = time.currentTime.min * 60 + time.currentTime.sec;
  const progress = totalSec > 0 ? (currentSec / totalSec) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-surface" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-on-surface-dim transition-colors hover:bg-surface-hover hover:text-on-surface"
        >
          <Icon path="M5 11h14v2H5z" size={24} />
        </button>
        <span className="text-xs font-medium tracking-widest text-on-surface-dim uppercase">
          Now Playing
        </span>
        <button className="flex h-9 w-9 items-center justify-center rounded-xl text-on-surface-dim transition-colors hover:bg-surface-hover hover:text-on-surface">
          <Icon path="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" size={20} />
        </button>
      </div>

      {/* Album Art */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6">
        <div className="group relative aspect-square w-full max-w-[340px]">
          {/* Glow effect */}
          <div className="absolute -inset-4 rounded-full bg-primary/10 opacity-50 blur-3xl" />
          {track?.thumbnail && (
            <div
              className="absolute -inset-2 rounded-full blur-2xl"
              style={{
                backgroundImage: `url(${track.thumbnail})`,
                backgroundSize: 'cover',
                opacity: 0.2,
              }}
            />
          )}
          {/* Artwork */}
          <div className="relative aspect-square overflow-hidden rounded-3xl shadow-2xl">
            {track?.thumbnail ? (
              <img
                src={track.thumbnail}
                alt={track.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-surface-hover text-on-surface-dim">
                <Icon path="M21 3H3v18h18V3zm-2 16H5V5h14v14zm-5-7c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" size={64} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Song Info */}
      <div className="relative z-10 px-6 pt-4">
        <p className="text-xl font-bold text-on-surface line-clamp-1">
          {track?.name ?? "No track selected"}
        </p>
        <p className="mt-1 text-sm text-on-surface-dim line-clamp-1">
          {track?.artist ?? ""}
        </p>
      </div>

      {/* Progress */}
      <div className="relative z-10 px-6 pt-4">
        <div
          ref={seekBg}
          className="group relative h-2 cursor-pointer rounded-full bg-surface-hover md:h-1.5"
          onClick={seekSong}
          onTouchStart={(e) => { e.stopPropagation(); seekSong(e); }}
          onTouchMove={(e) => { e.stopPropagation(); seekSong(e); }}
        >
          <div
            ref={seekBar}
            className="h-full rounded-full bg-gradient-primary transition-all"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -mt-[7px] h-3.5 w-3.5 rounded-full bg-primary shadow-glow opacity-0 transition-opacity group-hover:opacity-100"
            style={{ left: `calc(${progress}% - 7px)` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-on-surface-dim">
          <span>{fmt(currentSec)}</span>
          <span>{fmt(totalSec)}</span>
        </div>
      </div>

      {/* Radio toggle */}
      <div className="relative z-10 flex items-center justify-center gap-2 px-6 py-1">
        <button
          onClick={toggleRadio}
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs transition-colors ${radio ? "bg-primary/20 text-primary" : "text-on-surface-dim hover:text-on-surface"}`}
        >
          <Icon path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" size={14} />
          {radio ? "Radio On" : "Radio Off"}
        </button>
      </div>

      {/* Controls */}
      <div className="relative z-10 flex items-center justify-center gap-4 px-6 py-4">
        <button onClick={toggleShuffle} className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${shuffle ? "text-primary" : "text-on-surface-dim hover:text-on-surface"}`}>
          <Icon path="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" size={22} />
        </button>
        <button onClick={previous} className="flex h-12 w-12 items-center justify-center rounded-xl text-on-surface transition-colors hover:bg-surface-hover">
          <Icon path="M18 6l-8.5 6L18 18V6zM8 6v12H6V6h2z" size={28} />
        </button>
        <button onClick={isPlaying ? pause : play} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-on-primary shadow-glow transition-transform active:scale-95">
          <Icon path={isPlaying ? "M6 5h4v14H6zm8 0h4v14h-4z" : "M8 5v14l11-7z"} size={32} />
        </button>
        <button onClick={next} className="flex h-12 w-12 items-center justify-center rounded-xl text-on-surface transition-colors hover:bg-surface-hover">
          <Icon path="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" size={28} />
        </button>
        <button onClick={toggleRepeat} className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${repeat !== "off" ? "text-primary" : "text-on-surface-dim hover:text-on-surface"}`}>
          <Icon path={repeat === "one"
            ? "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zM13 15V9h-1l-2 1v1h1.5v4H13z"
            : "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"
          } size={22} />
        </button>
      </div>

      {/* Volume */}
      <div className="relative z-10 mx-auto flex w-full max-w-md items-center gap-3 px-6 pb-6">
        <button onClick={toggleMute} className="flex h-8 w-8 items-center justify-center text-on-surface-dim hover:text-on-surface">
          <Icon path={muted || volume === 0
            ? "M3 10v4h4l5 5V5L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
            : "M3 10v4h4l5 5V5L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
          } size={18} />
        </button>
        <div className="relative flex-1">
          <div className="h-1 rounded-full bg-surface-hover">
            <div
              className="h-full rounded-full bg-gradient-primary transition-all"
              style={{ width: `${muted ? 0 : volume}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      </div>

      {/* Similar tracks rail */}
      {track && songs.length > 0 && (
        <div className="relative z-10 px-6 pb-6">
          <SimilarTrackRail seed={track} candidates={songs} title="From Your Library" />
        </div>
      )}
    </div>
  );
}
