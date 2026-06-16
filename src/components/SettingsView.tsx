"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { getYoutubeKey, setYoutubeKey } from "@/lib/storage";
import { validateYoutubeKey } from "@/lib/youtube";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 rounded-lg bg-elevated p-5">
      <h2 className="mb-3 text-lg font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsView() {
  const { user, logOut, deleteAccount } = useAuth();
  const { songs, downloaded, downloadBytes } = useLibrary();

  const [key, setKey] = useState("");
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  // True when this is the web app (not the installed Android APK). Only the web
  // build offers the APK download. Resolved after mount to stay export-safe.
  const [isWeb, setIsWeb] = useState(false);

  useEffect(() => {
    setKey(getYoutubeKey() ?? "");
    const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor;
    setIsWeb(!cap?.isNativePlatform?.());
  }, []);

  async function saveKey() {
    const trimmed = key.trim();
    if (!trimmed) {
      setYoutubeKey(null);
      setKeyMsg("Key cleared. Search is disabled until you add one.");
      return;
    }
    setChecking(true);
    setKeyMsg(null);
    const valid = await validateYoutubeKey(trimmed);
    setChecking(false);
    if (!valid) {
      setKeyMsg("That key didn't work — check it's valid with quota remaining.");
      return;
    }
    setYoutubeKey(trimmed);
    setKeyMsg("Saved ✓");
  }

  async function onDelete() {
    const password = prompt(
      "This permanently deletes your account and all saved/downloaded songs on this device. Enter your password to confirm:"
    );
    if (password == null) return;
    const res = await deleteAccount(user!.username, password);
    if (!res.ok) alert(res.error ?? "Could not delete account.");
    // On success the auth gate takes over automatically.
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-white">Settings</h1>

      <Card title="YouTube search key">
        <p className="mb-3 text-sm text-muted">
          Used only to search YouTube&apos;s catalog. Stored on this device.
        </p>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIza…"
          spellCheck={false}
          className="mb-3 w-full rounded-lg bg-white/10 px-4 py-3 text-sm text-white placeholder:text-muted focus:bg-white/15 focus:outline-none"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={saveKey}
            disabled={checking}
            className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
          >
            {checking ? "Checking…" : "Save key"}
          </button>
          {keyMsg && <span className="text-sm text-muted">{keyMsg}</span>}
        </div>
      </Card>

      {isWeb && (
        <Card title="Get the Android app">
          <p className="mb-3 text-sm text-muted">
            Install Spotube on your phone for a full-screen, app-like experience
            with offline downloads. Android only.
          </p>
          <a
            href="/spotube.apk"
            download
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-black transition hover:scale-[1.02]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M5 20h14v-2H5v2zM12 3v10l4-4 1.4 1.4L12 16 6.6 10.4 8 9l4 4z" />
            </svg>
            Download APK
          </a>
          <p className="mt-3 text-xs text-muted">
            After it downloads, open the file and allow installation from your
            browser when Android prompts you.
          </p>
        </Card>
      )}

      <Card title="Storage on this device">
        <div className="grid grid-cols-3 gap-4 text-center">
          <Stat label="Saved" value={String(songs.length)} />
          <Stat label="Offline" value={String(downloaded.size)} />
          <Stat label="Used" value={formatBytes(downloadBytes)} />
        </div>
        <p className="mt-3 text-xs text-muted">
          Downloaded audio is kept only on this phone and counts toward its
          storage. Remove songs from the Library → Offline tab to free space.
        </p>
      </Card>

      <Card title="Account">
        <p className="mb-3 text-sm text-muted">
          Signed in as <strong className="text-white">{user?.username}</strong>.
          Your account and library live only on this device.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={logOut}
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            Log out
          </button>
          <button
            onClick={onDelete}
            className="rounded-full bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/30"
          >
            Delete account & data
          </button>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-highlight p-4">
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
