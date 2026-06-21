import { NextResponse } from "next/server";
import { getSong } from "@/lib/saavn/upstream";

// Resolve a single song id to a fresh, playable Track. Used as the fallback
// when a search result's audio URL has expired.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json({ track: null }, { status: 400 });
  }

  try {
    const track = await getSong(id);
    return NextResponse.json({ track });
  } catch (err) {
    console.error("saavn song lookup failed:", err);
    return NextResponse.json({ track: null }, { status: 502 });
  }
}
