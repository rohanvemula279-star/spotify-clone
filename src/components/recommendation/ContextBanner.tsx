"use client";

import { useEffect, useState } from "react";
import type { PlayContext } from "@/lib/recommendation";
import { getContextHint, getMoodSuggestions } from "@/lib/recommendation";

export function ContextBanner() {
  const [context, setContext] = useState<PlayContext>(() => buildContext());
  const [hint, setHint] = useState("");
  const [moods, setMoods] = useState<string[]>([]);

  useEffect(() => {
    const ctx = buildContext();
    setContext(ctx);
    setHint(getContextHint(ctx));
    setMoods(getMoodSuggestions(ctx));

    const interval = setInterval(() => {
      const ctx = buildContext();
      setContext(ctx);
      setHint(getContextHint(ctx));
      setMoods(getMoodSuggestions(ctx));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-4 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
      <div className="flex items-center gap-2 text-xs text-on-surface-dim">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
        </svg>
        <span>{hint}</span>
      </div>
      {moods.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {moods.map((m) => (
            <span
              key={m}
              className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-on-surface-dim"
            >
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function buildContext(): PlayContext {
  const now = new Date();
  return {
    hourOfDay: now.getHours(),
    dayOfWeek: now.getDay(),
    deviceType: "web",
    sessionId: `session_${Date.now()}`,
    sessionTrackCount: 0,
  };
}
