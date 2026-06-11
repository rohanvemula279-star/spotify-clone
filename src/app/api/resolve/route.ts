import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { findYoutubeVideoId } from "@/lib/youtube";

// This route hits external services + the DB on every request; never
// attempt to statically optimize or cache it.
export const dynamic = "force-dynamic";

// POST /api/resolve
// body: { spotifyId, trackName, artistName }
//
// NOTE: `spotifyId` now carries a JioSaavn track id (the search source
// changed from Spotify to JioSaavn). It's an opaque cache key here, so the
// field name and the `spotify_id` column are kept for schema compatibility.
//
// Implements the core quota-saving sequence (steps 2-4):
//   2. Look up spotify_id in the Supabase `track_cache`.
//   3. Cache HIT  -> return the stored youtube_video_id (0 quota).
//   4. Cache MISS -> call YouTube search, take the first id, INSERT it
//                    into the cache, then return it.
//
// Step 5 (handing the id to the IFrame player) happens on the client.
export async function POST(request: Request) {
  let body: {
    spotifyId?: string;
    trackName?: string;
    artistName?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { spotifyId, trackName, artistName } = body;
  if (!spotifyId || !trackName || !artistName) {
    return NextResponse.json(
      { error: "spotifyId, trackName and artistName are required" },
      { status: 400 }
    );
  }

  try {
    // --- Step 2/3: cache check -----------------------------------
    const { data: cached, error: selectError } = await getSupabaseAdmin()
      .from("track_cache")
      .select("youtube_video_id")
      .eq("spotify_id", spotifyId)
      .maybeSingle();

    if (selectError) throw selectError;

    if (cached?.youtube_video_id) {
      return NextResponse.json({
        youtubeVideoId: cached.youtube_video_id,
        cached: true,
      });
    }

    // --- Step 4: cache miss -> spend YouTube quota ---------------
    const videoId = await findYoutubeVideoId(trackName, artistName);
    if (!videoId) {
      return NextResponse.json(
        { error: "No playable YouTube video found for this track" },
        { status: 404 }
      );
    }

    // Insert the new mapping. upsert (not insert) guards against the
    // race where two clients resolve the same brand-new track at once;
    // ignoreDuplicates keeps the first writer's row.
    const { error: upsertError } = await getSupabaseAdmin()
      .from("track_cache")
      .upsert(
        {
          spotify_id: spotifyId,
          youtube_video_id: videoId,
          track_name: trackName,
          artist_name: artistName,
        },
        { onConflict: "spotify_id", ignoreDuplicates: true }
      );

    if (upsertError) {
      // Cache write failed, but we still have a usable id — log and
      // let playback proceed rather than blocking the user.
      console.error("[/api/resolve] cache write failed", upsertError);
    }

    return NextResponse.json({ youtubeVideoId: videoId, cached: false });
  } catch (err) {
    console.error("[/api/resolve]", err);
    return NextResponse.json({ error: "Resolve failed" }, { status: 500 });
  }
}
