import { NextResponse } from "next/server";
import { searchSongs } from "@/lib/saavn/upstream";

// Proxy + decrypt JioSaavn search results. Runs on the server (Node) so we
// can DES-decrypt audio URLs and dodge JioSaavn's lack of CORS.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("n")) || 30));

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchSongs(query, limit);
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } }
    );
  } catch (err) {
    console.error("saavn search failed:", err);
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}
