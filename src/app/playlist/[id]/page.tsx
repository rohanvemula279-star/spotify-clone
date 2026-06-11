import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PlaylistView } from "@/components/PlaylistView";
import type { Track } from "@/lib/types";

// Reads the playlist + its tracks from Supabase on every request.
export const dynamic = "force-dynamic";

export default async function PlaylistPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = getSupabaseAdmin();

  const { data: playlist } = await supabase
    .from("personal_playlists")
    .select("id, name")
    .eq("id", params.id)
    .maybeSingle();

  if (!playlist) notFound();

  const { data: rows } = await supabase
    .from("playlist_tracks")
    .select("jiosaavn_id, track_name, artist_name, album_art, position")
    .eq("playlist_id", params.id)
    .order("position", { ascending: true });

  // Map DB rows back into the shared Track shape the player expects.
  // jiosaavn_id -> spotifyId keeps the resolve/cache path identical.
  const tracks: Track[] = (rows ?? []).map((r) => ({
    spotifyId: r.jiosaavn_id,
    name: r.track_name ?? "",
    artist: r.artist_name ?? "",
    album: "",
    albumArt: r.album_art ?? null,
  }));

  return <PlaylistView name={playlist.name} tracks={tracks} />;
}
