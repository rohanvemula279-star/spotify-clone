"use client";

import { useEffect, useState } from "react";
import { searchTracks } from "@/lib/saavn";
import { HomeRow } from "@/components/HomeRow";
import type { Track } from "@/lib/types";

// Curated browse rows. Each is just a JioSaavn search the app runs on load,
// so there's no database — the home screen is fully self-contained.
const ROWS = [
  { id: "trending", title: "Trending Now", query: "trending" },
  { id: "hindi", title: "Bollywood Hits", query: "bollywood hits" },
  { id: "english", title: "English Top", query: "english top songs" },
  { id: "punjabi", title: "Punjabi", query: "punjabi hits" },
  { id: "telugu", title: "Telugu", query: "telugu hits" },
  { id: "love", title: "Romance", query: "romantic songs" },
];

export default function HomePage() {
  const [rows, setRows] = useState<{ id: string; title: string; tracks: Track[] }[]>(
    []
  );

  useEffect(() => {
    let active = true;
    Promise.all(
      ROWS.map(async (r) => ({
        ...r,
        tracks: await searchTracks(r.query, 12).catch(() => [] as Track[]),
      }))
    ).then((loaded) => {
      if (active) setRows(loaded.filter((r) => r.tracks.length > 0));
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-white">Good evening</h1>

      {rows.length === 0 ? (
        <div className="rounded-lg bg-elevated p-8 text-center text-muted">
          Loading music…
        </div>
      ) : (
        rows.map((row) => (
          <HomeRow key={row.id} title={row.title} tracks={row.tracks} />
        ))
      )}
    </div>
  );
}
