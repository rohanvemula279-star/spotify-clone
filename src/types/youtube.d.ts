// Minimal ambient types for the YouTube IFrame Player API, which is
// loaded at runtime from https://www.youtube.com/iframe_api and is not
// otherwise typed. We only declare the surface we actually use.

export {};

declare global {
  interface YTPlayer {
    loadVideoById(videoId: string): void;
    playVideo(): void;
    pauseVideo(): void;
    getPlayerState(): number;
    getCurrentTime(): number;
    getDuration(): number;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;
    setVolume(volume: number): void;
    getVolume(): number;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    destroy(): void;
  }

  interface YTPlayerEvent {
    target: YTPlayer;
    data: number;
  }

  interface YTNamespace {
    Player: new (
      elementId: string | HTMLElement,
      options: {
        height?: string | number;
        width?: string | number;
        videoId?: string;
        playerVars?: Record<string, string | number>;
        events?: {
          onReady?: (event: YTPlayerEvent) => void;
          onStateChange?: (event: YTPlayerEvent) => void;
          onError?: (event: YTPlayerEvent) => void;
        };
      }
    ) => YTPlayer;
    PlayerState: {
      UNSTARTED: number;
      ENDED: number;
      PLAYING: number;
      PAUSED: number;
      BUFFERING: number;
      CUED: number;
    };
  }

  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}
