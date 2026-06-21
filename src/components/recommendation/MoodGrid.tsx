"use client";

import { useCallback, useState } from "react";
import type { Track } from "@/lib/types";
import { usePlayer } from "@/context/PlayerContext";
import { searchTracks } from "@/lib/saavn";
import { SongCard, SongCardShimmer } from "@/components/spotube/SongCard";
import { Icon } from "@/components/spotube/Icon";

interface MoodEntry {
  label: string;
  color: string;
  gradient: string;
  icon: string;
  query: string;
}

const MOODS: MoodEntry[] = [
  { label: "Chill", color: "#4A7C7C", gradient: "from-[#4A7C7C] to-[#2D5A5A]", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z", query: "chill music" },
  { label: "Focus", color: "#5B6E8A", gradient: "from-[#5B6E8A] to-[#3A4A5E]", icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", query: "focus music" },
  { label: "Energy", color: "#8A6E4A", gradient: "from-[#8A6E4A] to-[#6B4E2A]", icon: "M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.59-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z", query: "workout songs" },
  { label: "Romance", color: "#8A5B6E", gradient: "from-[#8A5B6E] to-[#6E3B52]", icon: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z", query: "romantic songs" },
  { label: "Sad", color: "#5B5B7C", gradient: "from-[#5B5B7C] to-[#3B3B5C]", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z", query: "sad songs" },
  { label: "Party", color: "#7C5B5B", gradient: "from-[#7C5B5B] to-[#5C3B3B]", icon: "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z", query: "party songs" },
  { label: "Sleep", color: "#4A5B6E", gradient: "from-[#4A5B6E] to-[#2A3B4E]", icon: "M9.27 3.22c-4.17.87-7.27 4.59-7.27 8.96 0 5.03 3.92 9.12 8.77 9.12 3.58 0 6.62-2.12 7.94-5.15-1.94.91-4.09 1.46-6.39 1.46C7.47 17.61 4 14.14 4 9.82c0-2.44.94-4.65 2.47-6.33-.28.03-.56.05-.84.08.28-.1.56-.2.84-.35z", query: "sleep music" },
  { label: "Travel", color: "#6E7C5B", gradient: "from-[#6E7C5B] to-[#4E5C3B]", icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z", query: "travel music" },
];

export function MoodGrid() {
  const { track, isPlaying, playWithId } = usePlayer();
  const [moodTracks, setMoodTracks] = useState<Map<string, Track[]>>(new Map());
  const [loadingMood, setLoadingMood] = useState<string | null>(null);

  const handleMoodClick = useCallback(async (mood: MoodEntry) => {
    if (loadingMood) return;
    setLoadingMood(mood.label);
    try {
      const tracks = await searchTracks(mood.query, 12);
      setMoodTracks((prev) => {
        const next = new Map(prev);
        next.set(mood.label, tracks);
        return next;
      });
      if (tracks.length > 0) {
        playWithId(tracks[0].id, tracks);
      }
    } catch {} finally {
      setLoadingMood(null);
    }
  }, [loadingMood, playWithId]);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-on-surface-dim uppercase tracking-wider">
        Moods & Activities
      </h3>
      <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
        {MOODS.map((mood) => (
          <button
            key={mood.label}
            onClick={() => handleMoodClick(mood)}
            disabled={loadingMood === mood.label}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all hover:scale-105 active:scale-95 bg-gradient-to-b ${mood.gradient}`}
          >
            <Icon path={mood.icon} size={20} className="text-white/90" />
            <span className="text-[10px] font-medium text-white/80 whitespace-nowrap">
              {mood.label}
            </span>
          </button>
        ))}
      </div>
      {Array.from(moodTracks.entries()).slice(0, 1).map(([label, tracks]) => (
        <div key={label} className="mt-4">
          <h4 className="mb-2 text-xs font-medium text-on-surface-dim">{label} Picks</h4>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar">
            {tracks.slice(0, 10).map((t) => (
              <SongCard
                key={t.id}
                title={t.name}
                artist={t.artist}
                thumbnail={t.thumbnail ?? ""}
                isActive={t.id === track?.id}
                isPlaying={isPlaying}
                onClick={() => playWithId(t.id, tracks)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
