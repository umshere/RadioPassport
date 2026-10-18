/**
 * The redesign preview flag. `?redesign=1` turns the new home and desk on for
 * this browser (a cookie, so every page agrees and the server renders the
 * right one), `?redesign=0` turns it off. Without either, the cookie decides;
 * without a cookie the old home and desk are the default.
 */
export const REDESIGN_COOKIE = "ew-redesign";

export type RedesignFlag = { on: boolean; setCookie: string | null };

export function readRedesignFlag(request: Request): RedesignFlag {
  const param = new URL(request.url).searchParams.get("redesign");
  if (param === "1") {
    return { on: true, setCookie: `${REDESIGN_COOKIE}=1; Path=/; Max-Age=2592000; SameSite=Lax` };
  }
  if (param === "0") {
    return { on: false, setCookie: `${REDESIGN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax` };
  }
  const cookies = request.headers.get("Cookie") ?? "";
  const on = cookies.split(/;\s*/).some((part) => part === `${REDESIGN_COOKIE}=1`);
  return { on, setCookie: null };
}

export function redesignHeaders(flag: RedesignFlag, base: HeadersInit = {}): Headers {
  const headers = new Headers(base);
  if (flag.setCookie) headers.append("Set-Cookie", flag.setCookie);
  headers.set("Vary", "Cookie");
  return headers;
}
