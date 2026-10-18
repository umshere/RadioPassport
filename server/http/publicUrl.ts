import { isIP } from "node:net";

/**
 * Server-side fetches in this app take URLs from clients (a stream for ICY
 * metadata, a shelf to probe). Only public http(s) hosts are allowed: no
 * localhost, no link-local or private ranges, no cloud metadata names, and no
 * credentials in the URL. Redirects are re-checked hop by hop because a public
 * host can redirect to an internal one.
 */

const MAX_REDIRECTS = 3;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return true;
  const octets = parts.map((part) =>
    /^\d{1,3}$/.test(part) ? Number(part) : Number.NaN
  );
  if (octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return true;
  }
  const [a = 0, b = 0, c = 0] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 169 && b === 254) return true; // link-local, cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // documentation
  if (a === 203 && b === 0 && c === 113) return true; // documentation
  if (a >= 224) return true; // multicast and reserved
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const host = ip.toLowerCase();
  if (host === "::" || host === "::1") return true;
  if (host.startsWith("fc") || host.startsWith("fd")) return true; // unique local
  if (/^fe[89ab]/.test(host)) return true; // link-local
  if (host.startsWith("ff")) return true; // multicast
  if (host.startsWith("2001:db8")) return true; // documentation

  const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPrivateIpv4(mapped[1]);

  const mappedHex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex?.[1] && mappedHex[2]) {
    const hi = Number.parseInt(mappedHex[1], 16);
    const lo = Number.parseInt(mappedHex[2], 16);
    return isPrivateIpv4(
      `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`
    );
  }

  return false;
}

export function isPublicHttpUrl(input: string | URL): boolean {
  let url: URL;
  try {
    url = typeof input === "string" ? new URL(input) : input;
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host) return false;

  const version = isIP(host);
  if (version === 4) return !isPrivateIpv4(host);
  if (version === 6) return !isPrivateIpv6(host);

  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host === "metadata.google.internal" || host.endsWith(".internal")) return false;
  if (host.endsWith(".local")) return false;
  // Single-label names resolve through internal search domains; public DNS
  // names have at least one dot.
  if (!host.includes(".")) return false;
  if (/^\d+$/.test(host)) return false;

  return true;
}

/** Fetch that validates the first URL and every redirect target. */
export async function fetchPublicUrl(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  let current = input;
  const rest = { ...init };
  delete (rest as { redirect?: unknown }).redirect;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!isPublicHttpUrl(current)) {
      throw new Error("Blocked URL: not a public http(s) host.");
    }
    const response = await fetch(current, { ...rest, redirect: "manual" });
    if (!REDIRECT_STATUSES.has(response.status)) return response;

    const location = response.headers.get("location");
    if (!location) return response;
    current = new URL(location, current).toString();
  }

  throw new Error("Blocked URL: too many redirects.");
}
