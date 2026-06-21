import { NextResponse } from "next/server";
import { relatedSongs } from "@/lib/saavn/upstream";

// Songs related to a seed track — JioSaavn station / "song radio". This is the
// Anchor/Momentum source for the Echo-Brain autoplay engine.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim();
  const k = Math.min(30, Math.max(1, Number(searchParams.get("k")) || 15));

  if (!id) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await relatedSongs(id, k);
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, max-age=600, s-maxage=600" } }
    );
  } catch (err) {
    console.error("saavn related failed:", err);
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}
