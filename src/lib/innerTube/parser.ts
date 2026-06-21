import type {
  SongItem,
  AlbumItem,
  ArtistItem,
  PlaylistItem,
  YTItem,
  Thumbnail,
  Format,
  PlayerResponse,
  Artist,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function getRunsText(obj: any): string {
  if (!obj) return "";
  if (typeof obj.simpleText === "string") return obj.simpleText;
  if (Array.isArray(obj.runs)) {
    return obj.runs.map((r: any) => String(r.text ?? "")).join("");
  }
  return "";
}

function getThumbnails(obj: any): Thumbnail[] {
  if (!obj) return [];
  if (Array.isArray(obj.thumbnails)) {
    return obj.thumbnails.map((t: any) => ({
      url: String(t.url ?? ""),
      width: Number(t.width) || undefined,
      height: Number(t.height) || undefined,
    }));
  }
  return [];
}

function pickThumbnail(thumbnails: Thumbnail[]): string | undefined {
  if (thumbnails.length === 0) return undefined;
  return thumbnails[thumbnails.length - 1]?.url;
}

function getArtists(runs: any[]): Artist[] {
  if (!runs) return [];
  const artists: Artist[] = [];
  for (const run of runs) {
    if (run.navigationEndpoint?.browseEndpoint?.browseId) {
      artists.push({
        name: String(run.text ?? ""),
        id: String(run.navigationEndpoint.browseEndpoint.browseId),
      });
      continue;
    }
    if (artists.length === 0 || artists[artists.length - 1].name !== run.text) {
      artists.push({ name: String(run.text ?? "") });
    }
  }
  return artists;
}

function parseDuration(durationText: string): number {
  if (!durationText) return 0;
  const parts = durationText.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function getFlexColumnText(flexColumns: any[], index: number): any {
  const col = flexColumns[index];
  if (!col) return undefined;
  return col.musicResponsiveListItemFlexColumnRenderer?.text;
}

function parseSongFromResponsiveListItem(renderer: any): SongItem | null {
  const flexColumns = renderer.flexColumns;
  if (!flexColumns || flexColumns.length < 2) return null;

  const titleCol = getFlexColumnText(flexColumns, 0);
  const subtitleCol = getFlexColumnText(flexColumns, 1);

  const title = getRunsText(titleCol);
  if (!title) return null;

  const videoId = renderer.playlistItemData?.videoId;
  if (!videoId) return null;

  const subtitleRuns = subtitleCol?.runs ?? [];
  const artists = getArtists(subtitleRuns);

  const lastRun = subtitleRuns[subtitleRuns.length - 1];
  const duration = parseDuration(lastRun?.text ?? "");

  const albumRun = subtitleRuns.find(
    (r: any) =>
      r.navigationEndpoint?.browseEndpoint?.browseId?.toString().startsWith("MPREb_")
  );

  let album: { name: string; id?: string } | undefined;
  if (albumRun) {
    album = {
      name: String(albumRun.text ?? ""),
      id: String(albumRun.navigationEndpoint?.browseEndpoint?.browseId ?? ""),
    };
  }

  const thumbnail = pickThumbnail(
    getThumbnails(renderer.thumbnail?.musicThumbnailRenderer)
  );

  return {
    type: "song" as const,
    videoId,
    title,
    artists,
    album,
    duration,
    thumbnail,
    setVideoId: renderer.playlistItemData?.setVideoId,
  };
}

function parseAlbumFromTwoRowItem(renderer: any): AlbumItem | null {
  const title = getRunsText(renderer.title);
  if (!title) return null;

  const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId;
  if (!browseId) return null;

  const subtitleRuns = renderer.subtitle?.runs ?? [];
  const artists = getArtists(subtitleRuns);

  const thumbnail = pickThumbnail(
    getThumbnails(renderer.thumbnailRenderer?.musicThumbnailRenderer)
  );

  return {
    type: "album" as const,
    browseId,
    title,
    artists,
    thumbnail,
  };
}

function parseArtistFromTwoRowItem(renderer: any): ArtistItem | null {
  const title = getRunsText(renderer.title);
  if (!title) return null;

  const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId;
  if (!browseId) return null;

  const thumbnail = pickThumbnail(
    getThumbnails(renderer.thumbnailRenderer?.musicThumbnailRenderer)
  );

  return {
    type: "artist" as const,
    id: browseId,
    title,
    thumbnail,
  };
}

function parsePlaylistFromResponsiveListItem(renderer: any): PlaylistItem | null {
  const flexColumns = renderer.flexColumns;
  if (!flexColumns) return null;

  const titleCol = getFlexColumnText(flexColumns, 0);
  const title = getRunsText(titleCol);
  if (!title) return null;

  const playlistId =
    renderer.navigationEndpoint?.browseEndpoint?.browseId?.replace("VL", "");
  if (!playlistId) return null;

  const thumbnail = pickThumbnail(
    getThumbnails(renderer.thumbnail?.musicThumbnailRenderer)
  );

  return {
    type: "playlist" as const,
    id: playlistId,
    title,
    thumbnail,
  };
}

export function parseSearchResults(data: any): YTItem[] {
  const contents = data.contents?.tabbedSearchResultsRenderer;
  if (!contents) return [];

  const firstTab = contents.tabs?.[0]?.tabRenderer;
  if (!firstTab) return [];

  const sectionList = firstTab.content?.sectionListRenderer;
  if (!sectionList) return [];

  const sections = sectionList.contents ?? [];
  const items: YTItem[] = [];

  for (const section of sections) {
    const musicShelf = section.musicShelfRenderer;
    if (!musicShelf) continue;

    const contents2 = musicShelf.contents ?? [];
    for (const item of contents2) {
      const renderer = item.musicResponsiveListItemRenderer;
      if (!renderer) continue;

      const parsed = parseSongFromResponsiveListItem(renderer);
      if (parsed) items.push(parsed);
    }
  }

  return items;
}

export function parseSearchSummary(
  data: any
): Array<{ title: string; items: YTItem[] }> {
  const contents = data.contents?.tabbedSearchResultsRenderer;
  if (!contents) return [];

  const firstTab = contents.tabs?.[0]?.tabRenderer;
  if (!firstTab) return [];

  const sectionList = firstTab.content?.sectionListRenderer;
  if (!sectionList) return [];

  const sections = sectionList.contents ?? [];
  const summaries: Array<{ title: string; items: YTItem[] }> = [];

  for (const section of sections) {
    const musicCardShelf = section.musicCardShelfRenderer;
    const musicShelf = section.musicShelfRenderer;

    if (musicCardShelf) {
      const title = musicCardShelf.header?.musicCardShelfHeaderBasicRenderer;
      const shelfTitle =
        title?.title?.runs?.[0]?.text ?? "Top result";

      const items: YTItem[] = [];

      const flatItems = musicCardShelf.contents ?? [];
      for (const fi of flatItems) {
        const renderer = fi.musicResponsiveListItemRenderer;
        if (renderer) {
          const song = parseSongFromResponsiveListItem(renderer);
          if (song) items.push(song);
        }
      }

      if (items.length > 0) {
        summaries.push({ title: shelfTitle, items });
      }
    } else if (musicShelf) {
      const shelfTitle = getRunsText(musicShelf.title) || "Results";
      const items: YTItem[] = [];

      const contents2 = musicShelf.contents ?? [];
      for (const item of contents2) {
        const renderer = item.musicResponsiveListItemRenderer;
        if (renderer) {
          const song = parseSongFromResponsiveListItem(renderer);
          if (song) items.push(song);
        }
      }

      if (items.length > 0) {
        summaries.push({ title: shelfTitle, items });
      }
    }
  }

  return summaries;
}

export function parsePlayerResponse(data: any): PlayerResponse {
  const videoDetails = data.videoDetails;
  const streamingData = data.streamingData;
  const playabilityStatus = data.playabilityStatus;

  const formats: Format[] = [];
  if (streamingData?.formats) {
    for (const f of streamingData.formats) {
      formats.push({
        itag: Number(f.itag),
        url: f.url,
        mimeType: String(f.mimeType ?? ""),
        bitrate: Number(f.bitrate) || undefined,
        width: Number(f.width) || undefined,
        height: Number(f.height) || undefined,
        contentLength: f.contentLength,
        audioQuality: f.audioQuality,
        signatureCipher: f.signatureCipher,
        cipher: f.cipher,
      });
    }
  }

  const adaptiveFormats: Format[] = [];
  if (streamingData?.adaptiveFormats) {
    for (const f of streamingData.adaptiveFormats) {
      adaptiveFormats.push({
        itag: Number(f.itag),
        url: f.url,
        mimeType: String(f.mimeType ?? ""),
        bitrate: Number(f.bitrate) || undefined,
        width: Number(f.width) || undefined,
        height: Number(f.height) || undefined,
        contentLength: f.contentLength,
        audioQuality: f.audioQuality,
        audioSampleRate: f.audioSampleRate,
        audioChannels: Number(f.audioChannels) || undefined,
        initRange: f.initRange,
        indexRange: f.indexRange,
        signatureCipher: f.signatureCipher,
        cipher: f.cipher,
      });
    }
  }

  let thumbnails: Thumbnail[] = [];
  if (videoDetails?.thumbnail?.thumbnails) {
    thumbnails = getThumbnails(videoDetails.thumbnail);
  }

  return {
    videoDetails: videoDetails
      ? {
          videoId: String(videoDetails.videoId ?? ""),
          title: String(videoDetails.title ?? ""),
          lengthSeconds: String(videoDetails.lengthSeconds ?? "0"),
          channelId: String(videoDetails.channelId ?? ""),
          author: String(videoDetails.author ?? ""),
          thumbnails,
        }
      : undefined,
    streamingData: streamingData
      ? {
          expiresInSeconds: String(streamingData.expiresInSeconds ?? "0"),
          formats,
          adaptiveFormats,
        }
      : undefined,
    playabilityStatus: playabilityStatus
      ? {
          status: String(playabilityStatus.status ?? ""),
          reason: playabilityStatus.reason,
        }
      : undefined,
  };
}

export function parseSearchSuggestions(data: any): { queries: string[] } {
  const contents = data.contents;
  if (!contents) return { queries: [] };

  const suggestions = contents[0]?.searchSuggestionsSectionRenderer?.contents;
  if (!suggestions) return { queries: [] };

  const queries: string[] = [];
  for (const s of suggestions) {
    const renderer = s.searchSuggestionRenderer;
    if (renderer) {
      const q = getRunsText(renderer.suggestion);
      if (q) queries.push(q);
    }
  }

  return { queries };
}

export function getContinuation(data: any): string | undefined {
  const contents = data.contents?.tabbedSearchResultsRenderer;
  if (!contents) return undefined;

  const firstTab = contents.tabs?.[0]?.tabRenderer;
  if (!firstTab) return undefined;

  const sectionList = firstTab.content?.sectionListRenderer;
  if (!sectionList) return undefined;

  const sections = sectionList.contents ?? [];
  for (const section of sections) {
    const musicShelfRenderer = section.musicShelfRenderer;
    if (musicShelfRenderer) {
      const continuations = musicShelfRenderer.continuations;
      if (continuations?.length > 0) {
        return continuations[0]?.nextContinuationData?.continuation;
      }
    }
  }

  return undefined;
}
