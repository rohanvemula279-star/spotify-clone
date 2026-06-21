"use client";

import { useEffect, useRef } from "react";
import { useLyrics } from "@/context/LyricsContext";

export function LyricsView() {
  const { lyrics, currentLineIndex, loading, error, visible, toggle } =
    useLyrics();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current line
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const active = activeRef.current;
      const offset = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2;
      container.scrollTo({ top: offset, behavior: "smooth" });
    }
  }, [currentLineIndex]);

  if (!visible) {
    return (
      <button
        onClick={toggle}
        className="fixed bottom-20 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-accent/80 text-black shadow-lg transition hover:bg-accent md:bottom-24"
        aria-label="Toggle lyrics"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <path d="M6 6h12v2H6zm0 4h12v2H6zm0 4h8v2H6z" />
        </svg>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={toggle}
        className="fixed bottom-20 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-black shadow-lg md:bottom-24"
        aria-label="Close lyrics"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>

      <div
        ref={containerRef}
        className="scroll-area fixed bottom-0 left-0 right-0 z-10 h-[calc(100vh-64px-90px)] overflow-y-auto bg-base/95 px-6 pb-32 pt-4 backdrop-blur-md md:left-64"
      >
        {loading ? (
          <div className="flex items-center justify-center pt-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : error ? (
          <div className="pt-20 text-center text-sm text-muted">{error}</div>
        ) : lyrics ? (
          <div className="mx-auto max-w-lg">
            <div className="mb-2 text-center text-xs text-muted">
              {lyrics.source}
            </div>
            {lyrics.lrc.lines.length === 0 ? (
              <div className="whitespace-pre-wrap text-center text-sm text-muted">
                {lyrics.raw}
              </div>
            ) : (
              lyrics.lrc.lines.map((line, i) => {
                const isActive = i === currentLineIndex;
                const isPast = i < currentLineIndex;
                return (
                  <div
                    key={i}
                    ref={isActive ? activeRef : undefined}
                    className={`py-2 text-center text-lg leading-relaxed transition-all duration-300 ${
                      isActive
                        ? "scale-105 font-bold text-white"
                        : isPast
                        ? "text-white/30"
                        : "text-white/60"
                    }`}
                  >
                    {line.text}
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
