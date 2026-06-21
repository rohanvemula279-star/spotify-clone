"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import { DynamicBackground } from "@/components/visual/DynamicBackground";

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 180) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, a1: number, a2: number) {
  const s = polarToCartesian(cx, cy, r, a2);
  const e = polarToCartesian(cx, cy, r, a1);
  const l = a2 - a1 <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${l} 0 ${e.x} ${e.y}`;
}

const CX = 190;
const CY = 210;
const R = 150;
const S = 0;
const E = 180;

/** A short, uppercase label for a track shown along the radial arc. */
function arcLabel(t: { name: string } | undefined, fallback: string): string {
  if (!t) return fallback;
  return t.name.slice(0, 12).toUpperCase();
}

export function NowPlayingScreen() {
  const router = useRouter();
  const {
    track,
    isPlaying,
    time,
    queue,
    shuffle,
    repeat,
    play,
    pause,
    next,
    previous,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();
  const { isSaved, saveSong, unsaveSong } = useLibrary();
  const [progress] = useState(0.53);

  const totalSec = time.totalDuration.min * 60 + time.totalDuration.sec;
  const currentSec = time.currentTime.min * 60 + time.currentTime.sec;
  const liveProgress = totalSec > 0 ? currentSec / totalSec : progress;

  // Find the current track in the queue so we can label its neighbours.
  const idx = track ? queue.findIndex((t) => t.id === track.id) : -1;
  const prevLabel = arcLabel(idx > 0 ? queue[idx - 1] : undefined, "");
  const nextLabel = arcLabel(idx >= 0 ? queue[idx + 1] : undefined, "");

  const saved = track ? isSaved(track.id) : false;
  const toggleSave = () => {
    if (!track) return;
    if (saved) void unsaveSong(track.id);
    else void saveSong(track);
  };
  const goBack = () => router.push("/viper");

  const thumb = useMemo(
    () => polarToCartesian(CX, CY, R, S + (E - S) * Math.min(1, liveProgress)),
    [liveProgress]
  );

  return (
    <DynamicBackground track={track} isPlaying={isPlaying}>
      <div className="relative flex h-screen w-full flex-col overflow-hidden bg-black text-white md:items-center md:justify-center">
      {/* ============ MOBILE LAYOUT ============ */}
      <div className="flex w-full flex-1 flex-col md:hidden">
        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-3">
          <button
            onClick={goBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/40 hover:text-white/80"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <span className="text-[10px] font-semibold tracking-[0.25em] text-white/40 uppercase">
            Now Playing
          </span>
          <button
            onClick={goBack}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/40 hover:text-white/80"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Radial tracklist */}
        <div className="relative z-10 mt-0 flex h-24 items-center justify-center">
          <div className="relative h-full w-full max-w-sm">
            {/* Previous track — angled left */}
            <span
              className="absolute text-[10px] font-semibold tracking-[0.15em] text-white/25"
              style={{
                left: "4%",
                top: "60%",
                transform: "translateY(-50%) rotate(-22deg)",
                transformOrigin: "100% 50%",
              }}
            >
              {prevLabel}
            </span>
            {/* Active track — centered, vertical */}
            <div
              className="absolute flex flex-col items-center"
              style={{ left: "50%", top: "5%", transform: "translateX(-50%)" }}
            >
              <span className="text-sm font-extrabold tracking-[0.15em] text-white">
                {track ? track.name.slice(0, 12).toUpperCase() : "01 HUNNY"}
              </span>
              <span className="text-sm font-extrabold tracking-[0.15em] text-white">
                {track ? track.artist.slice(0, 14).toUpperCase() : "FRENCH POLICE"}
              </span>
            </div>
            {/* Next track — angled right */}
            <span
              className="absolute text-[10px] font-semibold tracking-[0.15em] text-white/25"
              style={{
                right: "4%",
                top: "60%",
                transform: "translateY(-50%) rotate(22deg)",
                transformOrigin: "0% 50%",
              }}
            >
              {nextLabel}
            </span>
          </div>
        </div>

        {/* SVG curved progress bar */}
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="relative w-full max-w-sm">
            <svg
              viewBox="0 0 380 280"
              className="h-auto w-full drop-shadow-[0_0_24px_rgba(255,20,68,0.12)]"
            >
              {/* Background arc */}
              <path
                d={describeArc(CX, CY, R, S, E)}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Progress arc */}
              <path
                d={describeArc(CX, CY, R, S, S + (E - S) * Math.min(1, liveProgress))}
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Thumb handle */}
              <circle
                cx={thumb.x}
                cy={thumb.y}
                r="7"
                fill="white"
                stroke="#000"
                strokeWidth="2.5"
                style={{ filter: "drop-shadow(0 0 14px rgba(255,255,255,0.7))" }}
              />
            </svg>

            {/* Center content inside curve */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center pt-[30%]">
              {/* Heart — tap to save */}
              <button
                onClick={toggleSave}
                aria-label={saved ? "Remove from library" : "Save to library"}
                className="pointer-events-auto"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-6 w-6 transition-colors ${saved ? "fill-[#FF1444] drop-shadow-[0_0_8px_rgba(255,20,68,0.5)]" : "fill-white/30"}`}
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
              {/* Timestamp */}
              <span className="mt-1 text-xs font-medium tracking-wider text-white/80">
                {Math.floor(currentSec / 60)}:{(Math.floor(currentSec) % 60).toString().padStart(2, "0")} /{" "}
                {Math.floor(totalSec / 60)}:{(Math.floor(totalSec) % 60).toString().padStart(2, "0")}
              </span>
            </div>

            {/* Red glow radiating down from arc */}
            <div
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 opacity-60"
              style={{
                top: "52%",
                width: "70%",
                height: "100px",
                background:
                  "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(255,20,68,0.5) 0%, rgba(255,20,68,0.12) 35%, transparent 60%)",
                filter: "blur(24px)",
              }}
            />
          </div>
        </div>

        {/* Playback controls */}
        <div className="relative z-10">
          <div className="relative mx-auto w-full max-w-sm px-4">
            {/* Shuffle — top left */}
            <div className="absolute left-[9%] top-[-2px] z-20">
              <button
                onClick={toggleShuffle}
                aria-label="Shuffle"
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/5 backdrop-blur-sm ${shuffle ? "text-[#00FF66]" : "text-white/30 hover:text-white/60"}`}
              >
                <svg viewBox="0 0 24 24" className="h-[14px] w-[14px] fill-current">
                  <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                </svg>
              </button>
            </div>
            {/* Repeat — top right */}
            <div className="absolute right-[9%] top-[-2px] z-20">
              <button
                onClick={toggleRepeat}
                aria-label="Repeat"
                className={`relative flex h-8 w-8 items-center justify-center rounded-full bg-white/5 backdrop-blur-sm ${repeat !== "off" ? "text-[#00FF66]" : "text-white/30 hover:text-white/60"}`}
              >
                <svg viewBox="0 0 24 24" className="h-[14px] w-[14px] fill-current">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                </svg>
                {repeat === "one" && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#00FF66] text-[7px] font-black text-black">
                    1
                  </span>
                )}
              </button>
            </div>

            {/* Dark glass control bar */}
            <div className="rounded-[28px] bg-gradient-to-t from-[#0a0a0e] via-[#111118] to-[#15151d] shadow-[0_-20px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              <div className="flex items-center justify-center gap-8 px-4 py-5">
                {/* Previous */}
                <button
                  onClick={previous}
                  className="flex h-10 w-10 items-center justify-center text-white/50 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>

                {/* Play/Pause with concentric rings */}
                <div className="relative flex items-center justify-center">
                  {/* Ring 1 */}
                  <motion.div
                    className="absolute rounded-full border border-[#FF1444]/20"
                    style={{ width: 110, height: 110 }}
                    animate={{ scale: [1, 1.18, 1], opacity: [0.25, 0.04, 0.25] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {/* Ring 2 */}
                  <motion.div
                    className="absolute rounded-full border border-[#FF1444]/12"
                    style={{ width: 90, height: 90 }}
                    animate={{ scale: [1, 1.22, 1], opacity: [0.15, 0.02, 0.15] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                  />
                  {/* Ring 3 */}
                  <motion.div
                    className="absolute rounded-full border border-[#FF1444]/8"
                    style={{ width: 72, height: 72 }}
                    animate={{ scale: [1, 1.28, 1], opacity: [0.1, 0.01, 0.1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                  />
                  {/* Red glow behind button */}
                  <div
                    className="absolute rounded-full bg-[#FF1444] opacity-25 blur-2xl"
                    style={{ width: 80, height: 80 }}
                  />
                  {/* Main button */}
                  <button
                    onClick={() => (isPlaying ? pause() : play())}
                    className="relative z-10 flex h-[64px] w-[64px] items-center justify-center rounded-full bg-white shadow-[0_0_40px_rgba(255,20,68,0.35)] transition-transform active:scale-90"
                  >
                    <svg viewBox="0 0 24 24" className={`h-7 w-7 fill-black ${isPlaying ? "" : "ml-0.5"}`}>
                      {isPlaying ? (
                        <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
                      ) : (
                        <path d="M8 5v14l11-7z" />
                      )}
                    </svg>
                  </button>
                </div>

                {/* Next */}
                <button
                  onClick={next}
                  className="flex h-10 w-10 items-center justify-center text-white/50 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="h-4" />
        </div>
      </div>

      {/* ============ DESKTOP LAYOUT ============ */}
      <div className="hidden w-full max-w-5xl flex-1 items-center justify-center md:flex">
        <div className="flex w-full items-center gap-8 px-12">
          {/* Left — album art / track info */}
          <div className="flex-1">
            <div className="mx-auto max-w-xs space-y-5">
              {/* Album art placeholder */}
              <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a0000] via-[#1a0000] to-black shadow-2xl shadow-red-950/40 ring-1 ring-white/5">
                {track?.thumbnail ? (
                  <img
                    src={track.thumbnail}
                    alt={track.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-16 w-16 fill-white/10">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Track info */}
              <div>
                <h3 className="text-xl font-bold text-white line-clamp-1">
                  {track?.name ?? "No track selected"}
                </h3>
                <p className="mt-1 text-sm text-white/50 line-clamp-1">
                  {track?.artist ?? "Select a song to play"}
                </p>
              </div>
            </div>
          </div>

          {/* Right — radial controls */}
          <div className="flex-1">
            <div className="relative mx-auto max-w-sm">
              {/* Radial tracklist */}
              <div className="relative mb-2 flex h-20 items-center justify-center">
                <div className="relative h-full w-full">
                  {/* Previous — angled left */}
                  <span
                    className="absolute text-xs font-semibold tracking-[0.15em] text-white/25"
                    style={{
                      left: "2%",
                      top: "60%",
                      transform: "translateY(-50%) rotate(-20deg)",
                      transformOrigin: "100% 50%",
                    }}
                  >
                    12 CRUSH
                  </span>
                  {/* Active — centered */}
                  <div
                    className="absolute flex flex-col items-center"
                    style={{ left: "50%", top: "0%", transform: "translateX(-50%)" }}
                  >
                    <span className="text-base font-extrabold tracking-[0.15em] text-white">
                      {track ? track.name.slice(0, 12).toUpperCase() : "01 HUNNY"}
                    </span>
                    <span className="text-base font-extrabold tracking-[0.15em] text-white/70">
                      {track ? track.artist.slice(0, 14).toUpperCase() : "FRENCH POLICE"}
                    </span>
                  </div>
                  {/* Next — angled right */}
                  <span
                    className="absolute text-xs font-semibold tracking-[0.15em] text-white/25"
                    style={{
                      right: "2%",
                      top: "60%",
                      transform: "translateY(-50%) rotate(20deg)",
                      transformOrigin: "0% 50%",
                    }}
                  >
                    02 STRESS TES
                  </span>
                </div>
              </div>

              {/* SVG arc progress */}
              <div className="relative w-full">
                <svg
                  viewBox="0 0 380 280"
                  className="h-auto w-full drop-shadow-[0_0_30px_rgba(255,20,68,0.15)]"
                >
                  {/* Background arc */}
                  <path
                    d={describeArc(CX, CY, R, S, E)}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Progress arc */}
                  <path
                    d={describeArc(CX, CY, R, S, S + (E - S) * Math.min(1, liveProgress))}
                    fill="none"
                    stroke="white"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Thumb */}
                  <circle
                    cx={thumb.x}
                    cy={thumb.y}
                    r="8"
                    fill="white"
                    stroke="#000"
                    strokeWidth="3"
                    style={{ filter: "drop-shadow(0 0 18px rgba(255,255,255,0.7))" }}
                  />
                </svg>

                {/* Center content */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center pt-[28%]">
                  <button
                    onClick={toggleSave}
                    aria-label={saved ? "Remove from library" : "Save to library"}
                    className="pointer-events-auto"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-8 w-8 transition-colors ${saved ? "fill-[#FF1444] drop-shadow-[0_0_12px_rgba(255,20,68,0.6)]" : "fill-white/30"}`}
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
                  <span className="mt-1 text-base font-medium tracking-wider text-white/80">
                    {Math.floor(currentSec / 60)}:{(Math.floor(currentSec) % 60).toString().padStart(2, "0")} /{" "}
                    {Math.floor(totalSec / 60)}:{(Math.floor(totalSec) % 60).toString().padStart(2, "0")}
                  </span>
                </div>

                {/* Red glow */}
                <div
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2 opacity-60"
                  style={{
                    top: "52%",
                    width: "75%",
                    height: "140px",
                    background:
                      "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(255,20,68,0.5) 0%, rgba(255,20,68,0.12) 35%, transparent 60%)",
                    filter: "blur(30px)",
                  }}
                />
              </div>

              {/* Shuffle/Repeat + Playback controls */}
              <div className="relative mt-[-20px]">
                {/* Shuffle — top left */}
                <div className="absolute left-[5%] top-[-6px] z-20">
                  <button
                    onClick={toggleShuffle}
                    aria-label="Shuffle"
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/5 backdrop-blur-sm ${shuffle ? "text-[#00FF66]" : "text-white/30 hover:text-white/60"}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                      <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                    </svg>
                  </button>
                </div>
                {/* Repeat — top right */}
                <div className="absolute right-[5%] top-[-6px] z-20">
                  <button
                    onClick={toggleRepeat}
                    aria-label="Repeat"
                    className={`relative flex h-9 w-9 items-center justify-center rounded-full bg-white/5 backdrop-blur-sm ${repeat !== "off" ? "text-[#00FF66]" : "text-white/30 hover:text-white/60"}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                    </svg>
                    {repeat === "one" && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#00FF66] text-[8px] font-black text-black">
                        1
                      </span>
                    )}
                  </button>
                </div>

                {/* Dark glass control bar */}
                <div className="rounded-[28px] bg-gradient-to-t from-[#0a0a0e] via-[#111118] to-[#15151d] shadow-[0_-20px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="flex items-center justify-center gap-10 px-8 py-6">
                    {/* Previous */}
                    <button
                      onClick={previous}
                      className="flex h-12 w-12 items-center justify-center text-white/50 hover:text-white"
                    >
                      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current">
                        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                      </svg>
                    </button>

                    {/* Play/Pause with rings */}
                    <div className="relative flex items-center justify-center">
                      {/* Ring 1 */}
                      <motion.div
                        className="absolute rounded-full border border-[#FF1444]/20"
                        style={{ width: 130, height: 130 }}
                        animate={{ scale: [1, 1.18, 1], opacity: [0.25, 0.04, 0.25] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      />
                      {/* Ring 2 */}
                      <motion.div
                        className="absolute rounded-full border border-[#FF1444]/12"
                        style={{ width: 108, height: 108 }}
                        animate={{ scale: [1, 1.22, 1], opacity: [0.15, 0.02, 0.15] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                      />
                      {/* Ring 3 */}
                      <motion.div
                        className="absolute rounded-full border border-[#FF1444]/8"
                        style={{ width: 86, height: 86 }}
                        animate={{ scale: [1, 1.28, 1], opacity: [0.1, 0.01, 0.1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                      />
                      {/* Red glow */}
                      <div
                        className="absolute rounded-full bg-[#FF1444] opacity-25 blur-2xl"
                        style={{ width: 100, height: 100 }}
                      />
                      {/* Main button */}
                      <button
                        onClick={() => (isPlaying ? pause() : play())}
                        className="relative z-10 flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white shadow-[0_0_50px_rgba(255,20,68,0.35)] transition-transform active:scale-90"
                      >
                        <svg viewBox="0 0 24 24" className={`h-8 w-8 fill-black ${isPlaying ? "" : "ml-0.5"}`}>
                          {isPlaying ? (
                            <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
                          ) : (
                            <path d="M8 5v14l11-7z" />
                          )}
                        </svg>
                      </button>
                    </div>

                    {/* Next */}
                    <button
                      onClick={next}
                      className="flex h-12 w-12 items-center justify-center text-white/50 hover:text-white"
                    >
                      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </DynamicBackground>
  );
}
