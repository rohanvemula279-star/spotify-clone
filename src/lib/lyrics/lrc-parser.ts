import type { LrcData, LrcLine, LrcWord } from "./types";

function parseTimestamp(ts: string): number {
  const m = ts.match(/^(\d+):(\d+)(?:[.:](\d+))?$/);
  if (!m) return 0;
  const min = parseInt(m[1], 10);
  const sec = parseInt(m[2], 10);
  const ms = m[3] ? parseInt(m[3].padEnd(3, "0").slice(0, 3), 10) : 0;
  return min * 60 + sec + ms / 1000;
}

export function parseLrc(text: string): LrcData {
  const lines: LrcLine[] = [];
  const words = new Map<number, LrcWord[]>();
  let wordLineIndex = 0;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const wordMatch = line.match(/^<(.+)>$/);
    if (wordMatch) {
      const wordList = wordMatch[1].split("|").map((w) => {
        const parts = w.split(":");
        return {
          text: parts[0],
          startTime: parseFloat(parts[1] || "0"),
          endTime: parseFloat(parts[2] || "0"),
        } as LrcWord;
      });
      if (wordList.length > 0) {
        words.set(wordLineIndex, wordList);
      }
      continue;
    }

    const lrcMatch = line.match(/^\[(\d+:\d+[.:]\d+)\](?:{(.*?)})?(.*)/);
    if (lrcMatch) {
      const time = parseTimestamp(lrcMatch[1]);
      const agent = lrcMatch[2] || undefined;
      const text = lrcMatch[3].trim();
      wordLineIndex = lines.length;
      lines.push({ time, text, agent });
    }
  }

  return { lines, words: words.size > 0 ? words : undefined };
}

export function findCurrentLine(lines: LrcLine[], currentTime: number): number {
  if (lines.length === 0) return -1;

  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTime + 0.05) {
      idx = i;
    } else {
      break;
    }
  }
  return idx;
}
