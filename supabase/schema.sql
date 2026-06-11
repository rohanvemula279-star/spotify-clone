-- =============================================================
-- Spotube :: track_cache
-- Run this in the Supabase SQL Editor (Dashboard -> SQL -> New query)
-- Purpose: cache the Spotify -> YouTube video-id mapping so we only
-- ever spend YouTube Data API quota the FIRST time a song is played.
-- =============================================================

create table if not exists public.track_cache (
  spotify_id        text primary key,
  youtube_video_id  text not null,
  track_name        text,
  artist_name       text,
  created_at        timestamptz not null default now()
);

-- Helpful when you later want to inspect/expire stale cache rows.
create index if not exists track_cache_created_at_idx
  on public.track_cache (created_at);

-- ----------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------
-- We ONLY ever touch this table from our Next.js server (route
-- handlers) using the SERVICE ROLE key, which bypasses RLS. So we
-- enable RLS and add NO public policies: the browser/anon key can
-- never read or write the cache directly. This keeps your quota-
-- saving table from being scraped by clients.
alter table public.track_cache enable row level security;

-- =============================================================
-- Spotube :: personal playlists + bulk importer
-- A playlist is a named collection of JioSaavn tracks. The importer
-- (/api/playlists/import) resolves "Track - Artist" lines to JioSaavn
-- matches and stores them here. Played the same way as search results:
-- jiosaavn_id flows through /api/resolve as the cache key.
-- =============================================================

create table if not exists public.personal_playlists (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.playlist_tracks (
  id           uuid primary key default gen_random_uuid(),
  playlist_id  uuid not null references public.personal_playlists (id) on delete cascade,
  jiosaavn_id  text not null,
  track_name   text,
  artist_name  text,
  album_art    text,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

-- Fetch a playlist's tracks in display order.
create index if not exists playlist_tracks_playlist_position_idx
  on public.playlist_tracks (playlist_id, position);

-- Same posture as track_cache: server-only access via the service role.
alter table public.personal_playlists enable row level security;
alter table public.playlist_tracks enable row level security;
