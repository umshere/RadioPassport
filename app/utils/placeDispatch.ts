import type { DispatchRequest, PlaceDispatch } from "~/types/ai";

export function dispatchCacheKey(request: DispatchRequest) {
  const hour = request.localTimeISO.slice(0, 13);
  const track =
    request.track?.raw ??
    `${request.track?.artist ?? ""}|${request.track?.title ?? ""}`;
  return `${request.stationId}|${track}|${hour}`;
}

export function templateDispatch(request: DispatchRequest): PlaceDispatch {
  const when = new Date(request.localTimeISO);
  const clock = Number.isNaN(when.getTime())
    ? "this hour"
    : when.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
  const city = request.city || request.country || "the air";
  const track =
    request.track?.artist && request.track?.title
      ? `${request.track.artist} — ${request.track.title}`
      : request.track?.title || request.track?.raw || null;
  return {
    id: dispatchCacheKey(request),
    headline: `Live from ${city}`,
    body: track
      ? `${request.stationName} is carrying ${track} through ${city}.`
      : `${request.stationName} is on the air from ${city}. This station is not sending track titles.`,
    mood: request.tags?.[0] || request.language || "live",
    localLabel: `${clock} in ${city}`,
  };
}
