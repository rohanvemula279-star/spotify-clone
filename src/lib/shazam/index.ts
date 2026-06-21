import type { RecognitionResult, RecognitionStatus } from "./types";

export type { RecognitionResult, RecognitionStatus };

const USER_AGENTS = [
  "Dalvik/2.1.0 (Linux; U; Android 5.0.2; VS980 4G Build/LRX22G)",
  "Dalvik/1.6.0 (Linux; U; Android 4.4.2; SM-T210 Build/KOT49H)",
  "Dalvik/2.1.0 (Linux; U; Android 5.1.1; SM-P905V Build/LMY47X)",
  "Dalvik/2.1.0 (Linux; U; Android 6.0.1; SM-G920F Build/MMB29K)",
];

const TIMEZONES = [
  "Europe/Paris", "Europe/London", "America/New_York",
  "America/Los_Angeles", "Asia/Tokyo", "Asia/Dubai",
];

function uuid(): string {
  return crypto.randomUUID();
}

interface ShazamRequest {
  geolocation: {
    altitude: number;
    latitude: number;
    longitude: number;
  };
  signature: {
    samplems: number;
    timestamp: number;
    uri: string;
  };
  timestamp: number;
  timezone: string;
}

class ShazamClient {
  private lastRequestTime = 0;
  private minIntervalMs = 1000;
  private maxRetries = 3;
  private cache = new Map<string, { result: RecognitionResult; time: number }>();
  private cacheDurationMs = 300000;

  private async enforceRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      await new Promise((r) => setTimeout(r, this.minIntervalMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private getCached(key: string): RecognitionResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time > this.cacheDurationMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.result;
  }

  private cacheResult(key: string, result: RecognitionResult) {
    this.cache.set(key, { result, time: Date.now() });
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.cache) {
        if (now - v.time > this.cacheDurationMs) this.cache.delete(k);
      }
    }
  }

  async recognize(signature: string, sampleDurationMs: number): Promise<RecognitionResult> {
    const cacheKey = signature;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await this.enforceRateLimit();

        const timestamp = Math.floor(Date.now() / 1000);
        const uuid1 = uuid().toUpperCase();
        const uuid2 = uuid();

        const body: ShazamRequest = {
          geolocation: {
            altitude: Math.random() * 400 + 100,
            latitude: Math.random() * 180 - 90,
            longitude: Math.random() * 360 - 180,
          },
          signature: {
            samplems: sampleDurationMs,
            timestamp,
            uri: signature,
          },
          timestamp,
          timezone: TIMEZONES[Math.floor(Math.random() * TIMEZONES.length)],
        };

        const res = await fetch(
          `https://amp.shazam.com/discovery/v5/en/US/android/-/tag/${uuid1}/${uuid2}?sync=true&webv3=true&sampling=true&connected=&shazamapiversion=v3&sharehub=true`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
              "Content-Language": "en_US",
            },
            body: JSON.stringify(body),
          }
        );

        if (res.status === 429) {
          if (attempt < this.maxRetries - 1) {
            await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
            continue;
          }
          throw new Error("Too many requests");
        }
        if (res.status === 404) throw new Error("No match found");
        if (res.status >= 500) throw new Error("Shazam service temporarily unavailable");
        if (!res.ok) throw new Error(`Recognition failed (${res.status})`);

        const data = await res.json();
        const result = this.parseResponse(data);
        if (!result) throw new Error("No match found");

        this.cacheResult(cacheKey, result);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries - 1 && err instanceof Error && err.message.includes("429")) {
          continue;
        }
        throw lastError;
      }
    }

    throw lastError || new Error("Recognition failed");
  }

  private parseResponse(data: any): RecognitionResult | null {
    const track = data.track;
    if (!track) return null;

    const songSection = track.sections?.find((s: any) => s?.type === "SONG");
    const metadata = songSection?.metadata;
    const album = metadata?.find((m: any) => m?.title === "Album")?.text;
    const label = metadata?.find((m: any) => m?.title === "Label")?.text;
    const releaseDate = metadata?.find((m: any) => m?.title === "Released")?.text;

    const lyricsSection = track.sections?.find((s: any) => s?.type === "LYRICS");
    const lyrics = lyricsSection?.text;

    const appleAction = track.hub?.options?.find(
      (o: any) => o?.providername?.toLowerCase().includes("apple")
    )?.actions?.[0];

    const spotifyProvider = track.hub?.providers?.find(
      (p: any) => p?.caption?.toLowerCase().includes("spotify")
    );

    const youtubeAction = track.hub?.options?.find(
      (o: any) => o?.type?.toLowerCase().includes("video")
    )?.actions?.[0];

    const youtubeVideoId = youtubeAction?.uri
      ?.split("v=")?.[1]
      ?.split("&")?.[0]
      ?.substring(0, 11);

    return {
      trackId: track.key || data.tagid || "",
      title: track.title || "",
      artist: track.subtitle || "",
      album,
      coverArtUrl: track.images?.coverart,
      coverArtHqUrl: track.images?.coverarthq,
      genre: track.genres?.primary,
      releaseDate,
      label,
      lyrics,
      shazamUrl: track.url,
      appleMusicUrl: appleAction?.uri,
      spotifyUrl: spotifyProvider?.actions?.[0]?.uri,
      youtubeVideoId,
    };
  }
}

export const shazam = new ShazamClient();

export class AudioRecognizer {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private onStatusChange: (status: RecognitionStatus) => void;

  constructor(onStatusChange: (status: RecognitionStatus) => void) {
    this.onStatusChange = onStatusChange;
  }

  async start(): Promise<void> {
    try {
      this.onStatusChange({ type: "listening" });

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();

      // Record for ~6 seconds (optimal for Shazam)
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      this.chunks = [];
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.mediaRecorder.onstop = async () => {
        await this.processRecording();
      };

      this.mediaRecorder.start();

      // Auto-stop after 6 seconds
      setTimeout(() => {
        if (this.mediaRecorder?.state === "recording") {
          this.mediaRecorder.stop();
        }
      }, 6000);
    } catch (err) {
      this.onStatusChange({
        type: "error",
        message: "Microphone access denied or unavailable",
      });
    }
  }

  stop(): void {
    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  private async processRecording(): Promise<void> {
    if (this.chunks.length === 0) {
      this.onStatusChange({ type: "no_match" });
      return;
    }

    this.onStatusChange({ type: "processing" });

    try {
      const blob = new Blob(this.chunks, { type: "audio/webm" });
      const arrayBuffer = await blob.arrayBuffer();

      // Convert to base64
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      // Try Shazam recognition with the raw audio as signature
      const result = await shazam.recognize(base64, 6000);
      this.onStatusChange({ type: "success", result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Recognition failed";
      if (message.includes("No match") || message.includes("404")) {
        this.onStatusChange({ type: "no_match" });
      } else {
        this.onStatusChange({ type: "error", message });
      }
    } finally {
      this.cleanup();
    }
  }

  private cleanup(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try { this.mediaRecorder.stop(); } catch { /* ignore */ }
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.stream = null;
    this.mediaRecorder = null;
    this.audioContext = null;
  }
}
