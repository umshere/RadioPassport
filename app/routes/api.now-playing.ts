import { json, type LoaderFunctionArgs } from "@remix-run/node";
import type { NowPlayingResponse } from "~/types/nowPlaying";

const REQUEST_TIMEOUT_MS = 8000;
const MAX_METADATA_BLOCKS = 3;

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^\[::1\]$/i,
];

function isBlockedHost(hostname: string) {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function parseStreamTitle(raw: string) {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return { title: null, artist: null };
  }

  const separatorMatch = cleaned.match(/\s[-–—]\s/);
  if (!separatorMatch) {
    return { title: cleaned, artist: null };
  }

  const separator = separatorMatch[0];
  const [left = "", ...rest] = cleaned.split(separator);
  const right = rest.join(separator).trim();
  const leftTrimmed = left.trim();

  if (!leftTrimmed && right) {
    return { title: right, artist: null };
  }

  if (leftTrimmed && right) {
    return { title: right, artist: leftTrimmed };
  }

  return { title: cleaned, artist: null };
}

function concatChunks(a: Uint8Array, b: Uint8Array) {
  const merged = new Uint8Array(a.length + b.length);
  merged.set(a, 0);
  merged.set(b, a.length);
  return merged;
}

function sanitizeMetadata(raw: string) {
  return raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").trim();
}

function decodeMetadataPayload(payload: Uint8Array) {
  const utf8 = new TextDecoder("utf-8").decode(payload);
  const needsFallback = /\uFFFD/.test(utf8) || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(utf8);
  if (!needsFallback) return sanitizeMetadata(utf8);
  const latin1 = new TextDecoder("iso-8859-1").decode(payload);
  return sanitizeMetadata(latin1);
}

async function readIcyMetadata(stream: ReadableStream<Uint8Array>, metaint: number) {
  const reader = stream.getReader();
  let buffer = new Uint8Array(0);

  const readBytes = async (length: number): Promise<Uint8Array | null> => {
    while (buffer.length < length) {
      const { value, done } = await reader.read();
      if (done) return null;
      if (value) buffer = concatChunks(buffer, value);
    }
    const out = buffer.slice(0, length);
    buffer = buffer.slice(length);
    return out;
  };

  for (let block = 0; block < MAX_METADATA_BLOCKS; block += 1) {
    const skipped = await readBytes(metaint);
    if (!skipped) return null;
    const metaLenByte = await readBytes(1);
    if (!metaLenByte) return null;
    const metaLenSize = metaLenByte[0];
    if (metaLenSize === undefined) return null;
    const metaLen = metaLenSize * 16;
    if (!metaLen) continue;
    const metaPayload = await readBytes(metaLen);
    if (!metaPayload) return null;
    const raw = decodeMetadataPayload(metaPayload).replace(/\0+$/, "").trim();
    if (raw) return raw;
  }

  return null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const streamUrl = url.searchParams.get("url");

  if (!streamUrl) {
    return json<NowPlayingResponse>(
      { status: "error", reason: "Missing stream URL." },
      { status: 400 }
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(streamUrl);
  } catch {
    return json<NowPlayingResponse>(
      { status: "error", reason: "Invalid stream URL." },
      { status: 400 }
    );
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return json<NowPlayingResponse>(
      { status: "error", reason: "Unsupported stream URL protocol." },
      { status: 400 }
    );
  }

  if (isBlockedHost(parsed.hostname)) {
    return json<NowPlayingResponse>(
      { status: "error", reason: "Stream host is not allowed." },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(streamUrl, {
      method: "GET",
      headers: {
        "Icy-MetaData": "1",
        "User-Agent": "radio-passport/1.0",
      },
      signal: controller.signal,
    });

    const metaintHeader = response.headers.get("icy-metaint");
    const metaint = metaintHeader ? Number.parseInt(metaintHeader, 10) : 0;
    if (!response.ok || !response.body || !metaint || Number.isNaN(metaint)) {
      return json<NowPlayingResponse>({
        status: "empty",
        reason: "No ICY metadata available.",
      });
    }

    const rawMetadata = await readIcyMetadata(response.body, metaint);
    if (!rawMetadata) {
      return json<NowPlayingResponse>({
        status: "empty",
        reason: "No ICY metadata blocks found.",
      });
    }

    const streamTitleMatch = rawMetadata.match(/StreamTitle='([^']*)'/i);
    const streamTitle = streamTitleMatch?.[1]?.trim() ?? "";
    if (!streamTitle) {
      return json<NowPlayingResponse>({
        status: "empty",
        reason: "Stream metadata is empty.",
      });
    }

    const parsedTitle = parseStreamTitle(streamTitle);

    return json<NowPlayingResponse>({
      status: "ok",
      track: {
        raw: streamTitle,
        title: parsedTitle.title,
        artist: parsedTitle.artist,
        source: "icy",
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const reason =
      (error as Error).name === "AbortError"
        ? "Stream metadata timed out."
        : "Failed to read stream metadata.";
    return json<NowPlayingResponse>({ status: "error", reason }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
