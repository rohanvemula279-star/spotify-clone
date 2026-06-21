export interface Artist {
  name: string;
  id?: string;
}

export interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface SongItem {
  type: "song";
  videoId: string;
  title: string;
  artists: Artist[];
  album?: Album;
  duration: number;
  thumbnail?: string;
  explicit?: boolean;
  setVideoId?: string;
  videoType?: string;
  isAvailable?: boolean;
}

export interface AlbumItem {
  type: "album";
  browseId: string;
  playlistId?: string;
  title: string;
  artists: Artist[];
  year?: number;
  thumbnail?: string;
  explicit?: boolean;
  description?: string;
  songCount?: number;
}

export interface ArtistItem {
  type: "artist";
  id: string;
  title: string;
  thumbnail?: string;
  subscribers?: string;
  monthlyListeners?: string;
  description?: string;
  channelId?: string;
}

export interface PlaylistItem {
  type: "playlist";
  id: string;
  title: string;
  author?: Artist;
  songCount?: number;
  thumbnail?: string;
  isEditable?: boolean;
}

export type YTItem = SongItem | AlbumItem | ArtistItem | PlaylistItem;

export interface Album {
  name: string;
  id?: string;
}

export interface Format {
  itag: number;
  url?: string;
  mimeType: string;
  bitrate?: number;
  width?: number;
  height?: number;
  contentLength?: string;
  audioQuality?: string;
  audioSampleRate?: string;
  audioChannels?: number;
  initRange?: { start: string; end: string };
  indexRange?: { start: string; end: string };
  signatureCipher?: string;
  cipher?: string;
}

export interface PlayerResponse {
  videoDetails?: {
    videoId: string;
    title: string;
    lengthSeconds: string;
    channelId: string;
    author: string;
    thumbnails: Thumbnail[];
  };
  streamingData?: {
    expiresInSeconds: string;
    formats: Format[];
    adaptiveFormats: Format[];
  };
  playabilityStatus?: {
    status: string;
    reason?: string;
  };
}

export interface SearchResult {
  items: YTItem[];
  continuation?: string;
}

export interface SearchSummary {
  title: string;
  items: YTItem[];
}
