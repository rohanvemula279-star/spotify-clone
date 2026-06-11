import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// This reads the DB on every request; never statically cache it.
export const dynamic = "force-dynamic";

// GET /api/playlists
// Returns all personal playlists for the sidebar nav. The browser can't
// query Supabase directly (service-role only lives on the server), so the
// client Sidebar fetches this instead.
export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("personal_playlists")
      .select("id, name, created_at")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ playlists: data ?? [] });
  } catch (err) {
    console.error("[/api/playlists]", err);
    return NextResponse.json(
      { error: "Failed to load playlists", playlists: [] },
      { status: 500 }
    );
  }
}
