# Spotube

A Spotify-style music app you can ship to the public. Search any song, build a
personal library, organize songs into folders, and download tracks for fully
offline playback — all stored **only on the user's own device**. There is no
backend, no database, and no data collection: every account and every saved
file stays on the phone.

> ⚠️ Uses the public YouTube Data API (user-supplied key) for search and a
> public, unofficial JioSaavn API for audio. Review the relevant terms before
> deploying anything public or commercial.

## How it works

```
First launch ─► ask for a YouTube Data API key  (stored on-device)
            ─► create a local account (username + password)

Search       ─► YouTube Data API     (catalog: title / artist / thumbnail)
Play         ─► match on JioSaavn     (direct audio stream) ─► HTML5 <audio>
Download     ─► fetch that stream ─► save Blob in IndexedDB  (offline, on-device)
Offline play ─► load the saved Blob   (no network needed)
```

The YouTube key only does **search** (its API can't legally stream audio), so
audio is resolved by matching each result on JioSaavn. Both the key and the
match cache live in the browser/WebView — nothing is sent to a server we run.

## First-run experience

1. **YouTube key gate** — paste a free YouTube Data API v3 key (or skip).
   Remembered for every later launch; editable in **Settings**.
2. **Account gate** — sign up with a username + password (hashed on-device) or
   log back in. Returning users skip straight to the app.

Both gates only appear when needed, so second and later launches open directly
into the app.

## Accounts, library & storage (all on-device)

- **Accounts** are local: username + a salted SHA-256 password hash in
  `localStorage`. "Recovery" = logging back in with the same credentials.
  Deleting a account erases its library and downloads. *No server means no
  cross-device sync and no remote recovery — clearing app data is permanent.*
- **Library / folders / downloads** live in **IndexedDB**, namespaced per user.
  Downloaded audio is stored as Blobs that occupy the phone's own storage.

## Run on a computer (dev)

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Build the static web app

```bash
npm run build      # produces ./out (plain static files)
```

`out/` can be hosted anywhere; it only needs internet access to reach the
YouTube and JioSaavn APIs.

## Get the Android APK

The APK is built in the cloud by GitHub Actions (see
`.github/workflows`), or locally:

```bash
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
# APK at android/app/build/outputs/apk/debug/app-debug.apk
```

## Configuration

- **YouTube key** — entered in-app on first run / in Settings (per user/device).
- **JioSaavn base URL** (optional, build-time) in case the default instance is
  down:

```bash
NEXT_PUBLIC_SAAVN_API=https://your-saavn-instance npm run build
```

## Project layout

| Path | Purpose |
|------|---------|
| `src/lib/storage.ts` | typed localStorage (API key, session) |
| `src/lib/auth.ts` | on-device accounts (hashing, login, delete) |
| `src/lib/youtube.ts` | YouTube Data API search |
| `src/lib/resolve.ts` | YouTube result → JioSaavn playable audio (cached) |
| `src/lib/saavn.ts` | JioSaavn search + audio URL |
| `src/lib/db.ts` · `library` via `LibraryContext` | IndexedDB: songs, folders, downloaded blobs |
| `src/context/AuthContext.tsx` | current user + auth actions |
| `src/context/LibraryContext.tsx` | saved songs, folders, downloads |
| `src/context/PlayerContext.tsx` | `<audio>` engine (prefers offline blobs) |
| `src/components/AppGate.tsx` · `gates/*` | first-run key + account flow |
| `src/components/LibraryView.tsx` · `SettingsView.tsx` | library & settings UI |
| `capacitor.config.ts` | Android app wrapper config |

## Known limitations

- The YouTube Data API has a daily quota (~100 searches/day on a default free
  key); the app surfaces quota/invalid-key errors and caches results.
- Hybrid matching can occasionally miss an obscure track with no JioSaavn
  equivalent — the app reports it rather than failing silently.
