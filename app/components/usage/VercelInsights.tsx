import { useEffect } from "react";

const SRC = "/_vercel/insights/script.js";

/**
 * Vercel Web Analytics, loaded directly (the wrapper package did not attach its
 * script in this Remix setup). Cookieless; it follows route changes itself. It
 * only exists on a Vercel deploy, so it stays off for localhost, and it honours
 * Do Not Track. Needs Analytics switched on in the Vercel project.
 */
export function VercelInsights() {
  useEffect(() => {
    if (navigator.doNotTrack === "1") return;
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return;
    const w = window as unknown as { va?: (...args: unknown[]) => void; vaq?: unknown[] };
    if (!w.va) {
      w.va = function (...args: unknown[]) {
        (w.vaq = w.vaq || []).push(args);
      };
    }
    if (document.querySelector(`script[src="${SRC}"]`)) return;
    const script = document.createElement("script");
    script.src = SRC;
    script.defer = true;
    document.head.appendChild(script);
  }, []);
  return null;
}
