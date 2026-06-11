import { getSupabaseAdmin } from "@/lib/supabase";
import { HomeRow } from "@/components/HomeRow";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RawRow {
  playlist_id: string;
  jiosaavn_id: string;
  track_name: string | null;
  artist_name: string | null;
  album_art: string | null;
  position: number | null;
  created_at: string;
}

interface Row {
  id: string;
  title: string;
  tracks: Track[];
}

function toTrack(r: RawRow): Track {
  return {
    spotifyId: r.jiosaavn_id,
    name: r.track_name ?? "",
    artist: r.artist_name ?? "",
    album: "",
    albumArt: r.album_art ?? null,
  };
}

/** Drop duplicate tracks (same id) so React keys stay unique within a row. */
function dedupe(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  return tracks.filter((t) => {
    if (seen.has(t.spotifyId)) return false;
    seen.add(t.spotifyId);
    return true;
  });
}

export default async function HomePage() {
  const supabase = getSupabaseAdmin();

  const [{ data: playlists }, { data: trackRows }] = await Promise.all([
    supabase
      .from("personal_playlists")
      .select("id, name, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("playlist_tracks")
      .select(
        "playlist_id, jiosaavn_id, track_name, artist_name, album_art, position, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const rows: Row[] = [];
  const all = (trackRows ?? []) as RawRow[];

  // "Recently Imported": newest tracks across every playlist.
  const recent = dedupe(all.map(toTrack)).slice(0, 12);
  if (recent.length) {
    rows.push({ id: "recent", title: "Recently Imported", tracks: recent });
  }

  // One row per playlist, tracks in their saved order.
  for (const pl of playlists ?? []) {
    const tracks = dedupe(
      all
        .filter((r) => r.playlist_id === pl.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(toTrack)
    );
    if (tracks.length) rows.push({ id: pl.id, title: pl.name, tracks });
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-white">Good evening</h1>

      {rows.length === 0 ? (
        <div className="rounded-lg bg-elevated p-8 text-center text-muted">
          No tracks yet.{" "}
          <a href="/admin/import" className="text-accent hover:underline">
            Import a playlist
          </a>{" "}
          to get started.
        </div>
      ) : (
        rows.map((row) => (
          <HomeRow key={row.id} title={row.title} tracks={row.tracks} />
        ))
      )}
    </div>
  );
}
