export interface LrcLine {
  /** Timestamp in seconds */
  time: number;
  text: string;
  /** Agent/vocalist tag (e.g., "v1", "v2", "bg") */
  agent?: string;
}

export interface LrcWord {
  text: string;
  startTime: number;
  endTime: number;
}

export interface LrcData {
  lines: LrcLine[];
  words?: Map<number, LrcWord[]>;
}

export interface LyricsResult {
  source: string;
  lrc: LrcData;
  raw: string;
}
