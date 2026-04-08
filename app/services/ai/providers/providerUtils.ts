import type { Station } from "~/types/radio";

export function normalizePreferenceList(values?: string[]): string[] {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

export function filterStationCandidates(
  stations: Station[],
  options?: { minBitrate?: number }
): Station[] {
  const minBitrate = options?.minBitrate ?? 64;
  return stations.filter((station) => {
    const hasStream = Boolean(station.streamUrl);
    const bitrateOk = typeof station.bitrate === "number" ? station.bitrate >= minBitrate : true;
    const healthy = station.isStreamHealthy !== false;
    return hasStream && bitrateOk && healthy;
  });
}

export function dedupeStations(stations: Station[]): Station[] {
  const seen = new Set<string>();
  const result: Station[] = [];
  for (const station of stations) {
    if (!station?.uuid) continue;
    if (seen.has(station.uuid)) continue;
    seen.add(station.uuid);
    result.push(station);
  }
  return result;
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  return null;
}

function stripJsonComments(text: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      result += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < text.length && text[index] !== "\n") {
        index += 1;
      }
      result += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (
        index < text.length &&
        !(text[index] === "*" && text[index + 1] === "/")
      ) {
        index += 1;
      }
      index += 1;
      continue;
    }

    result += char;
  }

  return result;
}

function stripTrailingCommas(text: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      result += char;
      continue;
    }

    if (char === ",") {
      let nextIndex = index + 1;
      while (/\s/.test(text[nextIndex] ?? "")) {
        nextIndex += 1;
      }
      if (text[nextIndex] === "}" || text[nextIndex] === "]") {
        continue;
      }
    }

    result += char;
  }

  return result;
}

export function parseJsonObjectFromText(text: string): Record<string, unknown> {
  const jsonText = extractFirstJsonObject(text);
  if (!jsonText) {
    throw new Error("Could not find a valid JSON object in the AI response.");
  }

  try {
    return JSON.parse(jsonText) as Record<string, unknown>;
  } catch (originalError) {
    const relaxedJson = stripTrailingCommas(stripJsonComments(jsonText));
    try {
      return JSON.parse(relaxedJson) as Record<string, unknown>;
    } catch {
      throw originalError;
    }
  }
}
