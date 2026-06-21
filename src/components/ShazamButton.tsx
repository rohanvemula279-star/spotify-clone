"use client";

import { useState, useRef, useCallback } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { AudioRecognizer } from "@/lib/shazam";
import type { RecognitionStatus, RecognitionResult } from "@/lib/shazam";

export function ShazamButton() {
  const { playWithId } = usePlayer();
  const [status, setStatus] = useState<RecognitionStatus>({ type: "idle" });
  const recognizerRef = useRef<AudioRecognizer | null>(null);

  const handleStatusChange = useCallback((s: RecognitionStatus) => {
    setStatus(s);
  }, []);

  const toggle = useCallback(() => {
    if (status.type === "listening") {
      recognizerRef.current?.stop();
      setStatus({ type: "idle" });
      return;
    }

    const recognizer = new AudioRecognizer(handleStatusChange);
    recognizerRef.current = recognizer;
    recognizer.start();
  }, [status.type, handleStatusChange]);

  const playResult = useCallback(
    (result: RecognitionResult) => {
      const track = {
        id: result.trackId,
        name: result.title,
        artist: result.artist,
        album: result.album ?? "",
        duration: 0,
        audioUrl: null,
        source: "shazam" as const,
        thumbnail: result.coverArtUrl,
      };
      playWithId(track.id, [track]);
      setStatus({ type: "idle" });
    },
    [playWithId]
  );

  const retry = useCallback(() => {
    setStatus({ type: "idle" });
  }, []);

  // Status indicator colors
  const isListening = status.type === "listening";
  const isProcessing = status.type === "processing";
  const isError = status.type === "error";
  const isNoMatch = status.type === "no_match";
  const isSuccess = status.type === "success";

  return (
    <div className="relative">
      <button
        onClick={toggle}
        disabled={isProcessing}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition hover:scale-105 disabled:opacity-50 ${
          isListening
            ? "animate-pulse bg-accent text-black"
            : isSuccess
            ? "bg-accent text-black"
            : isError || isNoMatch
            ? "bg-red-500/20 text-red-400"
            : "bg-highlight text-muted hover:text-white"
        }`}
        aria-label={
          isListening
            ? "Stop listening"
            : isProcessing
            ? "Processing…"
            : "Identify song"
        }
        title="Identify song (Shazam)"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <path d="M12 3a6 6 0 00-6 6v3a6 6 0 0012 0V9a6 6 0 00-6-6zm3 9a3 3 0 01-6 0V9a3 3 0 016 0v3zM11 18.93V21h2v-2.07A7.99 7.99 0 0019 12h-2a6 6 0 01-6 6 6 6 0 01-6-6H5a7.99 7.99 0 006 6.93z" />
        </svg>
      </button>

      {/* Status popup */}
      {(isListening || isProcessing || isError || isNoMatch || isSuccess) && (
        <div className="absolute bottom-12 right-0 z-30 w-64 rounded-lg border border-white/10 bg-base p-4 shadow-2xl">
          {isListening && (
            <div className="text-center">
              <div className="mb-2 text-sm font-medium text-white">Listening…</div>
              <div className="flex items-center justify-center gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="text-center text-sm text-muted">Matching song…</div>
          )}

          {isError && (
            <div className="text-center">
              <div className="mb-2 text-sm text-red-400">{status.message}</div>
              <button onClick={retry} className="text-xs text-accent hover:underline">
                Try again
              </button>
            </div>
          )}

          {isNoMatch && (
            <div className="text-center">
              <div className="mb-2 text-sm text-muted">No song identified</div>
              <button onClick={retry} className="text-xs text-accent hover:underline">
                Try again
              </button>
            </div>
          )}

          {isSuccess && (
            <div>
              <div className="mb-2 flex items-center gap-3">
                {status.result.coverArtUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={status.result.coverArtUrl}
                    alt=""
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-highlight text-xl">
                    ♪
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">
                    {status.result.title}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {status.result.artist}
                  </div>
                </div>
              </div>
              <button
                onClick={() => playResult(status.result)}
                className="mt-2 w-full rounded-full bg-accent py-1.5 text-xs font-semibold text-black transition hover:bg-accent/80"
              >
                Play
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
