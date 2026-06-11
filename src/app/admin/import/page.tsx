"use client";

import { useMemo, useState } from "react";

interface LogEntry {
  index: number;
  status: "added" | "not_found" | "error";
  label: string;
}

export default function ImportPage() {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [donePlaylistId, setDonePlaylistId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live count of non-empty lines so the user sees how many will import.
  const lineCount = useMemo(
    () => text.split(/\r?\n/).filter((l) => l.trim()).length,
    [text]
  );

  async function runImport() {
    const songs = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (!name.trim() || songs.length === 0) {
      setError("Enter a playlist name and at least one song line.");
      return;
    }

    setRunning(true);
    setError(null);
    setLog([]);
    setDonePlaylistId(null);
    setProgress("Starting import…");

    try {
      const res = await fetch("/api/playlists/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), songs }),
      });

      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `Import failed (${res.status})`);
      }

      // Read the NDJSON stream line by line and update the UI as each
      // message arrives.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const raw = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!raw) continue;
          handleMessage(JSON.parse(raw));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  function handleMessage(msg: Record<string, unknown>) {
    switch (msg.type) {
      case "progress":
        setProgress(`Processing track ${msg.index} of ${msg.total}…`);
        break;
      case "track": {
        const status = msg.status as LogEntry["status"];
        const label =
          status === "added"
            ? `${msg.name} — ${msg.artist}`
            : (msg.query as string) ?? "";
        setLog((prev) => [
          ...prev,
          { index: msg.index as number, status, label },
        ]);
        break;
      }
      case "done":
        setProgress(
          `Done — added ${msg.added} of ${msg.total} (${msg.failed} skipped).`
        );
        setDonePlaylistId(msg.playlistId as string);
        break;
      case "fatal":
        setError(`Import aborted: ${msg.message}`);
        break;
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-2xl font-bold text-white">Import playlist</h1>
      <p className="mb-6 text-sm text-muted">
        Paste your songs one per line as{" "}
        <code className="rounded bg-white/10 px-1">Track Name - Artist</code>.
        Each line is matched against JioSaavn and saved to a new playlist.
      </p>

      <label className="mb-2 block text-sm font-semibold text-white">
        Playlist name
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={running}
        placeholder="My Liked Songs"
        className="mb-5 w-full rounded-md bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-muted focus:bg-white/15 focus:outline-none disabled:opacity-50"
      />

      <label className="mb-2 flex items-center justify-between text-sm font-semibold text-white">
        <span>Songs</span>
        <span className="font-normal text-muted">{lineCount} lines</span>
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={running}
        rows={12}
        placeholder={"Blinding Lights - The Weeknd\nLevitating - Dua Lipa\n…"}
        className="mb-5 w-full resize-y rounded-md bg-white/10 px-4 py-3 font-mono text-sm text-white placeholder:text-muted focus:bg-white/15 focus:outline-none disabled:opacity-50"
      />

      <button
        onClick={runImport}
        disabled={running}
        className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:opacity-50"
      >
        {running ? "Importing…" : "Import"}
      </button>

      {error && (
        <p className="mt-4 rounded-md bg-red-500/15 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {progress && (
        <p className="mt-4 text-sm font-medium text-white" aria-live="polite">
          {progress}
        </p>
      )}

      {donePlaylistId && (
        // Plain anchor (full navigation) so the sidebar refetches and shows
        // the newly created playlist.
        <a
          href={`/playlist/${donePlaylistId}`}
          className="mt-2 inline-block text-sm font-semibold text-accent hover:underline"
        >
          View playlist →
        </a>
      )}

      {log.length > 0 && (
        <ul className="mt-6 flex flex-col gap-1 text-xs">
          {log.map((entry) => (
            <li
              key={entry.index}
              className={
                entry.status === "added"
                  ? "text-muted"
                  : "text-yellow-400/80"
              }
            >
              <span className="mr-2 inline-block w-8 text-right text-muted">
                {entry.index}.
              </span>
              {entry.status === "added"
                ? entry.label
                : `${entry.status === "not_found" ? "No match" : "Error"}: ${entry.label}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
