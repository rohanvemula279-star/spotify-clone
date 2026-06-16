// --- Tiny typed localStorage layer ------------------------------------
//
// All app config that must survive across launches lives here. It is the
// single source of truth for "has the user finished onboarding?" (API key)
// and "who is logged in?" (session). Works identically in a browser and in
// the Capacitor Android WebView — no native plugins required.
//
// NOTHING here is sent anywhere. It is on-device state only.

const PREFIX = "spotube:";

// Stable keys. Bump a value only with a migration in mind.
export const KEYS = {
  youtubeApiKey: `${PREFIX}youtubeApiKey`,
  users: `${PREFIX}users`, // map of username -> StoredUser
  session: `${PREFIX}session`, // username of the logged-in user
} as const;

/** Read + JSON.parse a key, returning `fallback` on miss/parse error. */
export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/** JSON.stringify + write a key. No-ops during SSR/export. */
export function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

/** Read a plain string key. */
export function readString(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

/** Write (or, with null, clear) a plain string key. */
export function writeString(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  if (value == null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, value);
}

// --- YouTube API key (the first-run gate) -----------------------------

export function getYoutubeKey(): string | null {
  const v = readString(KEYS.youtubeApiKey);
  return v && v.trim() ? v.trim() : null;
}

export function setYoutubeKey(key: string | null): void {
  writeString(KEYS.youtubeApiKey, key && key.trim() ? key.trim() : null);
}
