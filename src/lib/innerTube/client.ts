const API_BASE = "https://music.youtube.com/youtubei/v1/";
const API_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX3";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0";

export interface InnerTubeClient {
  clientName: string;
  clientVersion: string;
  clientId: string;
  userAgent: string;
  osName?: string;
  osVersion?: string;
  deviceMake?: string;
  deviceModel?: string;
  androidSdkVersion?: string;
  visitorData?: string;
  loginSupported?: boolean;
  useSignatureTimestamp?: boolean;
  isEmbedded?: boolean;
}

export const CLIENTS = {
  WEB: {
    clientName: "WEB",
    clientVersion: "2.20260213.00.00",
    clientId: "1",
    userAgent: USER_AGENT,
  },
  WEB_REMIX: {
    clientName: "WEB_REMIX",
    clientVersion: "1.20260213.01.00",
    clientId: "67",
    userAgent: USER_AGENT,
    loginSupported: true,
    useSignatureTimestamp: true,
  },
  ANDROID_VR: {
    clientName: "ANDROID_VR",
    clientVersion: "1.43.32",
    clientId: "28",
    userAgent:
      "com.google.android.apps.youtube.vr.oculus/1.43.32 (Linux; U; Android 12; en_US; Quest 3; Build/SQ3A.220605.009.A1; Cronet/107.0.5284.2)",
    osName: "Android",
    osVersion: "12",
    deviceMake: "Oculus",
    deviceModel: "Quest 3",
    androidSdkVersion: "32",
  },
  TVHTML5_EMBEDDED: {
    clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    clientVersion: "2.0",
    clientId: "85",
    userAgent:
      "Mozilla/5.0 (PlayStation; PlayStation 4/12.02) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15",
    isEmbedded: true,
    useSignatureTimestamp: true,
  },
} as const satisfies Record<string, InnerTubeClient>;

interface ContextClient {
  clientName: string;
  clientVersion: string;
  osName?: string;
  osVersion?: string;
  deviceMake?: string;
  deviceModel?: string;
  androidSdkVersion?: string;
  gl: string;
  hl: string;
  visitorData?: string;
}

interface Context {
  client: ContextClient;
  user?: { onBehalfOfUser?: string };
  thirdParty?: { embedUrl: string };
  request?: { useSsl: boolean };
}

function buildContext(
  client: InnerTubeClient,
  gl = "US",
  hl = "en"
): Context {
  return {
    client: {
      clientName: client.clientName,
      clientVersion: client.clientVersion,
      osName: client.osName,
      osVersion: client.osVersion,
      deviceMake: client.deviceMake,
      deviceModel: client.deviceModel,
      androidSdkVersion: client.androidSdkVersion,
      gl,
      hl,
    },
    request: { useSsl: true },
  };
}

interface RequestOptions {
  endpoint: string;
  body: Record<string, unknown>;
  client: InnerTubeClient;
  params?: Record<string, string>;
  useAuth?: boolean;
}

async function makeRequest({
  endpoint,
  body,
  client,
  params,
}: RequestOptions): Promise<Record<string, unknown>> {
  const url = new URL(endpoint, API_BASE);
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("prettyPrint", "false");

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Goog-Api-Format-Version": "1",
    "X-YouTube-Client-Name": client.clientId,
    "X-YouTube-Client-Version": client.clientVersion,
    "X-Origin": "https://music.youtube.com",
    Referer: "https://music.youtube.com/",
    "User-Agent": client.userAgent,
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`YouTube Music API error: ${res.status}`);
  }

  return (await res.json()) as Record<string, unknown>;
}

async function makePlayerRequest(
  videoId: string,
  playlistId?: string
): Promise<Record<string, unknown>> {
  const client = CLIENTS.WEB_REMIX;

  const body: Record<string, unknown> = {
    context: buildContext(client),
    videoId,
  };

  if (playlistId) body.playlistId = playlistId;

  return makeRequest({
    endpoint: "player",
    body,
    client,
  });
}

export async function searchYTMusic(
  query: string,
  filter?: string
): Promise<Record<string, unknown>> {
  const client = CLIENTS.WEB_REMIX;
  const body: Record<string, unknown> = {
    context: buildContext(client),
    query,
  };

  if (filter) body.params = filter;

  return makeRequest({ endpoint: "search", body, client });
}

export async function browseYTMusic(
  browseId: string,
  params?: string,
  continuation?: string
): Promise<Record<string, unknown>> {
  const client = CLIENTS.WEB_REMIX;
  const body: Record<string, unknown> = {
    context: buildContext(client),
  };

  let actualEndpoint = "browse";

  if (continuation) {
    body.continuation = continuation;
  } else {
    if (browseId) body.browseId = browseId;
    if (params) body.params = params;
  }

  if (continuation) {
    // Use search endpoint for continuations
    body.params = body.continuation;
    delete body.continuation;
    return makeRequest({
      endpoint: "search",
      body: { ...body, query: "" },
      client,
      params: { continuation },
    });
  }

  return makeRequest({ endpoint: actualEndpoint, body, client });
}

export async function getPlayer(
  videoId: string,
  playlistId?: string
): Promise<Record<string, unknown>> {
  return makePlayerRequest(videoId, playlistId);
}

export async function getSearchSuggestions(
  input: string
): Promise<Record<string, unknown>> {
  const client = CLIENTS.WEB_REMIX;
  const body: Record<string, unknown> = {
    context: buildContext(client),
    input,
  };

  return makeRequest({ endpoint: "music/get_search_suggestions", body, client });
}

export async function getNext(
  videoId: string,
  playlistId?: string
): Promise<Record<string, unknown>> {
  const client = CLIENTS.WEB_REMIX;
  const body: Record<string, unknown> = {
    context: buildContext(client),
    videoId,
  };

  if (playlistId) body.playlistId = playlistId;

  return makeRequest({ endpoint: "next", body, client });
}
