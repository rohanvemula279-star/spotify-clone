<<<<<<< HEAD
# Spotube

A Spotify-style music app: **Spotify Web API** for search/metadata + album art,
**Supabase** as a `spotify_id → youtube_video_id` cache, and the **YouTube
IFrame Player** for audio. The cache means you only spend YouTube Data API
quota the *first* time any given track is played.

> ⚠️ This architecture runs against both Spotify's and YouTube's Terms of
> Service (notably using YouTube as an audio-only backend and keeping the
> player off-screen). It's fine for personal/learning use — read those ToS
> before deploying anything public or commercial.

## Architecture / play flow

```
User clicks a track
   │
   ▼
1. Spotify metadata ──► already fetched at search time (/api/search)
   │
   ▼
2. POST /api/resolve { spotifyId, trackName, artistName }
   │
   ├─ 3. Supabase track_cache HIT  ──► return youtube_video_id   (0 quota)
   │
   └─ 4. MISS ──► YouTube Data API search "name artist official audio"
                  └─ take first id ──► INSERT into track_cache ──► return it
   │
   ▼
5. Client loads youtube_video_id into the off-screen YT IFrame player
```

Secrets (Spotify client secret, YouTube key, Supabase service-role key) live
only in server route handlers under `src/app/api/*`. The browser never sees them.

## Setup

1. **Install deps**
   ```bash
   npm install
   ```

2. **Create the database table.** In the Supabase dashboard → SQL Editor, run
   the contents of [`supabase/schema.sql`](./supabase/schema.sql).

3. **Configure env.** Copy the example and fill in real values:
   ```bash
   cp .env.local.example .env.local
   ```
   - Spotify app: https://developer.spotify.com/dashboard (Client ID + Secret)
   - YouTube Data API v3 key: Google Cloud Console
   - Supabase project URL + **service role** key: Project Settings → API

4. **Run**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000, search a song, and click it to play.

## Files

| Path | Purpose |
|------|---------|
| `supabase/schema.sql` | `track_cache` table + RLS |
| `src/lib/spotify.ts` | token caching + track search |
| `src/lib/youtube.ts` | YouTube Data API search (the only quota spend) |
| `src/lib/supabase.ts` | server-only service-role client |
| `src/app/api/search/route.ts` | Spotify search endpoint |
| `src/app/api/resolve/route.ts` | the cache-check / YouTube / insert flow |
| `src/components/PlayerProvider.tsx` | owns the IFrame player + track state |
| `src/components/Player.tsx` | bottom player bar UI |
| `src/components/Sidebar.tsx` · `SearchView.tsx` | layout + search |
=======
# spotify-clone
>>>>>>> 6a1001cdfc6ab08011f991414409c299603c4044
