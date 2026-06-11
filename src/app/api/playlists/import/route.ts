import { getSupabaseAdmin } from "@/lib/supabase";
import { searchTracks } from "@/lib/saavn";

// Imports can take a while (one JioSaavn lookup per line), so never cache
// and allow a generous execution window.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/playlists/import
// body: { name: string, songs?: string[], text?: string }
//   - `songs` is an array of "Track Name - Artist" lines, OR
//   - `text`  is the raw pasted block (split on newlines server-side).
//
// Streams newline-delimited JSON (NDJSON) so the UI can show live progress.
// Message shapes (one JSON object per line):
//   { type: "start",    playlistId, total }
//   { type: "progress", index, total, query }     // about to process a line
//   { type: "track",    index, status, ... }       // result of a line
//   { type: "done",     playlistId, total, added, failed }
//   { type: "fatal",    message }                   // aborted before finishing

/** Split a "Track Name - Artist" line into its two parts. */
function parseLine(raw: string): { track: string; artist: string } {
  // Drop a leading list number like "1. " or "12) " from pasted exports.
  const line = raw.trim().replace(/^\d+[.)]\s+/, "");
  const sep = line.indexOf(" - ");
  if (sep === -1) return { track: line, artist: "" };
  return {
    track: line.slice(0, sep).trim(),
    artist: line.slice(sep + 3).trim(),
  };
}

export async function POST(request: Request) {
  let body: { name?: string; songs?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";

  // Accept either a pre-split array or a raw text block.
  const rawLines: string[] = Array.isArray(body.songs)
    ? (body.songs as unknown[]).map(String)
    : typeof body.text === "string"
      ? body.text.split(/\r?\n/)
      : [];
  const songs = rawLines.map((l) => l.trim()).filter(Boolean);

  if (!name) {
    return Response.json({ error: "Playlist name is required" }, { status: 400 });
  }
  if (songs.length === 0) {
    return Response.json(
      { error: "At least one song line is required" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        const supabase = getSupabaseAdmin();

        // 1. Create the playlist row up front so we have an id to attach
        //    tracks to (and to redirect the user to when finished).
        const { data: playlist, error: createError } = await supabase
          .from("personal_playlists")
          .insert({ name })
          .select("id")
          .single();
        if (createError) throw createError;

        send({ type: "start", playlistId: playlist.id, total: songs.length });

        let added = 0;
        let failed = 0;
        let position = 0;

        // 2. Resolve each line against JioSaavn and insert the best match.
        for (let i = 0; i < songs.length; i++) {
          const line = songs[i];
          send({ type: "progress", index: i + 1, total: songs.length, query: line });

          try {
            const { track, artist } = parseLine(line);
            const query = `${track} ${artist}`.trim();
            const results = await searchTracks(query);
            const best = results[0];

            if (!best) {
              failed++;
              send({ type: "track", index: i + 1, status: "not_found", query: line });
              continue;
            }

            const { error: insertError } = await supabase
              .from("playlist_tracks")
              .insert({
                playlist_id: playlist.id,
                jiosaavn_id: best.spotifyId, // spotifyId carries the JioSaavn id
                track_name: best.name,
                artist_name: best.artist,
                album_art: best.albumArt,
                position: position++,
              });
            if (insertError) throw insertError;

            added++;
            send({
              type: "track",
              index: i + 1,
              status: "added",
              name: best.name,
              artist: best.artist,
            });
          } catch (err) {
            failed++;
            send({
              type: "track",
              index: i + 1,
              status: "error",
              query: line,
              message: err instanceof Error ? err.message : String(err),
            });
          }
        }

        send({
          type: "done",
          playlistId: playlist.id,
          total: songs.length,
          added,
          failed,
        });
      } catch (err) {
        console.error("[/api/playlists/import]", err);
        send({
          type: "fatal",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
