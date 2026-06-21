"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { getYoutubeKey, setYoutubeKey } from "@/lib/storage";
import { validateYoutubeKey } from "@/lib/youtube";
import { Icon } from "@/components/spotube/Icon";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function SettingsView() {
  const { user, logOut, deleteAccount } = useAuth();
  const { songs, downloaded, downloadBytes } = useLibrary();

  const [key, setKey] = useState("");
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [isWeb, setIsWeb] = useState(false);
  const [delMsg, setDelMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setKey(getYoutubeKey() ?? "");
    const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    setIsWeb(!cap?.isNativePlatform?.());
  }, []);

  async function saveKey() {
    const trimmed = key.trim();
    if (!trimmed) {
      setYoutubeKey(null);
      setKeyMsg("Key cleared");
      return;
    }
    setChecking(true);
    setKeyMsg(null);
    const valid = await validateYoutubeKey(trimmed);
    setChecking(false);
    if (!valid) {
      setKeyMsg("Invalid key");
      return;
    }
    setYoutubeKey(trimmed);
    setKeyMsg("Key saved");
  }

  return (
    <div className="space-y-3 px-4 py-4 pb-24 md:px-6">
      {/* Account */}
      <div className="rounded-xl bg-elevated p-4">
        <h2 className="text-sm font-semibold text-on-surface">Account</h2>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-dim text-accent">
            <Icon path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-on-surface">{user?.username ?? "Guest"}</p>
            <p className="text-xs text-muted">{songs.length} saved songs</p>
          </div>
        </div>
        {user && (
          <button onClick={logOut} className="mt-3 rounded-lg bg-elevated-hover px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-on-surface">
            Log out
          </button>
        )}
      </div>

      {/* YouTube Key */}
      <div className="rounded-xl bg-elevated p-4">
        <h2 className="text-sm font-semibold text-on-surface">YouTube API Key</h2>
        <p className="mt-1 text-xs text-muted">For search fallback</p>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIzaSy..."
          className="mt-3 w-full rounded-lg bg-elevated-hover px-3 py-2 text-sm text-on-surface placeholder:text-dim focus:outline-none"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={saveKey}
            disabled={checking}
            className="rounded-lg bg-accent-dim px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
          >
            {checking ? "Checking..." : "Save"}
          </button>
          {keyMsg && <span className="text-xs text-muted">{keyMsg}</span>}
        </div>
      </div>

      {/* Storage */}
      <div className="rounded-xl bg-elevated p-4">
        <h2 className="text-sm font-semibold text-on-surface">Storage</h2>
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between text-muted">
            <span>Saved songs</span>
            <span className="text-on-surface">{songs.length}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Downloaded</span>
            <span className="text-on-surface">{downloaded.size}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Offline storage</span>
            <span className="text-on-surface">{formatBytes(downloadBytes)}</span>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="rounded-xl bg-elevated p-4">
        <h2 className="text-sm font-semibold text-on-surface">Flowz</h2>
        <div className="mt-2 text-xs text-muted space-y-1">
          <p>Download songs and play them offline — anywhere.</p>
          <p className="pt-2">Not affiliated with Spotify or YouTube.</p>
        </div>
        {user && (
          <div>
            <button
              onClick={async () => {
                const pw = prompt("Enter password to delete account:");
                if (!pw || !user) return;
                setDeleting(true);
                setDelMsg(null);
                const res = await deleteAccount(user.username, pw);
                setDeleting(false);
                if (!res.ok) {
                  setDelMsg(res.error ?? "Failed to delete account.");
                }
              }}
              disabled={deleting}
              className="mt-3 rounded-lg bg-error-dim px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/20 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete account"}
            </button>
            {delMsg && <p className="mt-1 text-xs text-error">{delMsg}</p>}
          </div>
        )}
      </div>

      {/* Contact & Support */}
      <div className="rounded-xl bg-elevated p-4">
        <h2 className="text-sm font-semibold text-on-surface">Support</h2>
        <div className="mt-3 space-y-2 text-xs text-muted">
          <p>
            Report bugs, request features, or ask questions at{" "}
            <a
              href="mailto:support@spotube.app"
              className="text-accent underline hover:text-accent-hover"
            >
              support@spotube.app
            </a>
          </p>
          <p>
            Or visit the{" "}
            <Link href="/contact" className="text-accent underline hover:text-accent-hover">
              Contact page
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Legal */}
      <div className="rounded-xl bg-elevated p-4">
        <h2 className="text-sm font-semibold text-on-surface">Legal</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link
            href="/privacy"
            className="rounded-lg bg-elevated-hover px-3 py-1.5 text-muted transition-colors hover:text-on-surface"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="rounded-lg bg-elevated-hover px-3 py-1.5 text-muted transition-colors hover:text-on-surface"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
