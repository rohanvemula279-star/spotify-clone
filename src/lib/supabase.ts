import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client.
//
// Uses the SERVICE ROLE key, which bypasses Row Level Security. This
// module must NEVER be imported into a client component — it is only
// referenced from route handlers under src/app/api/*.
//
// The client is created lazily on first use (not at import time) so that
// `next build` can evaluate the route modules without the env vars being
// present, and so a missing var surfaces as a request-time error rather
// than a build-time crash.
let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // supabase-js queries go through the global fetch, which Next.js
      // caches by default. That made route handlers replay stale rows
      // (e.g. an empty playlist list cached before the first import).
      // Force every query to hit PostgREST fresh.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return client;
}

export interface TrackCacheRow {
  spotify_id: string;
  youtube_video_id: string;
  track_name: string | null;
  artist_name: string | null;
  created_at: string;
}
