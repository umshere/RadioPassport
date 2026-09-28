import { useEffect, useState } from "react";
import {
  intentSearchString,
  parseInitialIntent,
  parseInitialQuery,
} from "~/components/radio-passport/searchState";
import type { SolarHour } from "~/utils/localTime";

/**
 * What the listener asked for — an hour, a place, a free-text query — seeded
 * from the URL and mirrored back into it. The board mirrors itself in the URL
 * (replace, never push): theater trips and reloads land on the same intent.
 * replaceState skips Remix loader revalidation; unrelated params (e.g.
 * passport) are preserved.
 */
export function useHomeIntent(search: string) {
  const seed = `https://radio.example/?${search}`;
  const [hour, setHour] = useState<SolarHour | null>(
    () => parseInitialIntent(seed).hour as SolarHour | null,
  );
  const [place, setPlace] = useState<string | null>(
    () => parseInitialIntent(seed).place,
  );
  const [query, setQuery] = useState(() => parseInitialQuery(seed));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = intentSearchString(window.location.search, { query, hour, place });
    if (window.location.search === next) return;
    // Carry history.state through: React Router keeps { usr, key, idx } there,
    // and nulling it collapses this entry's ScrollRestoration key to "default"
    // and resets the router's stack index.
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${next}${window.location.hash}`,
    );
  }, [query, hour, place]);

  return { hour, setHour, place, setPlace, query, setQuery };
}
