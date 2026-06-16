// --- On-device accounts (no backend, no data collection) --------------
//
// Username + password are stored ONLY on this device. The password is never
// kept in plain text: we store a SHA-256 hash of (per-user salt + password).
// "Account recovery" simply means logging back in with the same username and
// password — the data is still here as long as the app's storage isn't wiped.
//
// This is intentionally simple and private. It is NOT a substitute for a real
// auth server and offers no cross-device sync or server-side recovery; that is
// the tradeoff for collecting zero user data.

import { KEYS, readJSON, writeJSON, readString, writeString } from "./storage";

export interface StoredUser {
  username: string;
  salt: string; // hex
  hash: string; // hex SHA-256(salt + password)
  createdAt: number;
}

export interface PublicUser {
  username: string;
  createdAt: number;
}

type UserMap = Record<string, StoredUser>;

function loadUsers(): UserMap {
  return readJSON<UserMap>(KEYS.users, {});
}
function saveUsers(map: UserMap): void {
  writeJSON(KEYS.users, map);
}

/** Normalize a username for use as a stable key (case-insensitive, trimmed). */
function normalize(username: string): string {
  return username.trim().toLowerCase();
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(salt: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

function toPublic(u: StoredUser): PublicUser {
  return { username: u.username, createdAt: u.createdAt };
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  user?: PublicUser;
}

/** Create a new local account and start a session for it. */
export async function signUp(
  usernameRaw: string,
  password: string
): Promise<AuthResult> {
  const username = usernameRaw.trim();
  const key = normalize(username);
  if (username.length < 2)
    return { ok: false, error: "Username must be at least 2 characters." };
  if (password.length < 4)
    return { ok: false, error: "Password must be at least 4 characters." };

  const users = loadUsers();
  if (users[key])
    return {
      ok: false,
      error: "That username already exists on this device. Log in instead.",
    };

  const salt = randomSalt();
  const hash = await hashPassword(salt, password);
  const user: StoredUser = {
    username,
    salt,
    hash,
    createdAt: Date.now(),
  };
  users[key] = user;
  saveUsers(users);
  setSession(username);
  return { ok: true, user: toPublic(user) };
}

/** Verify credentials and, on success, start a session. */
export async function logIn(
  usernameRaw: string,
  password: string
): Promise<AuthResult> {
  const key = normalize(usernameRaw);
  const users = loadUsers();
  const user = users[key];
  if (!user)
    return {
      ok: false,
      error: "No account with that username on this device.",
    };
  const hash = await hashPassword(user.salt, password);
  if (hash !== user.hash)
    return { ok: false, error: "Incorrect password." };
  setSession(user.username);
  return { ok: true, user: toPublic(user) };
}

/** Permanently delete an account and all of its data is handled by callers. */
export async function deleteAccount(
  usernameRaw: string,
  password: string
): Promise<AuthResult> {
  const verify = await logIn(usernameRaw, password);
  if (!verify.ok) return verify;
  const key = normalize(usernameRaw);
  const users = loadUsers();
  delete users[key];
  saveUsers(users);
  clearSession();
  return { ok: true };
}

// --- Session -----------------------------------------------------------

export function setSession(username: string): void {
  writeString(KEYS.session, username);
}

export function clearSession(): void {
  writeString(KEYS.session, null);
}

/** The currently logged-in user, or null. Validates against the user store. */
export function getCurrentUser(): PublicUser | null {
  const username = readString(KEYS.session);
  if (!username) return null;
  const user = loadUsers()[normalize(username)];
  return user ? toPublic(user) : null;
}

export function hasAnyAccount(): boolean {
  return Object.keys(loadUsers()).length > 0;
}
