import { NextResponse } from "next/server";
import { searchTracks } from "@/lib/saavn";

// GET /api/search?q=...
// Step 1 of the flow: fetch track metadata (name, artist, art, id) from the
// public JioSaavn API. The frontend's `q` param is forwarded as the JioSaavn
// `query`. No YouTube or Supabase work happens here.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ tracks: [] });
  }

  try {
    const tracks = await searchTracks(q);
    return NextResponse.json({ tracks });
  } catch (err) {
    console.error("[/api/search]", err);
    return NextResponse.json(
      { error: "Search failed", tracks: [] },
      { status: 500 }
    );
  }
}
