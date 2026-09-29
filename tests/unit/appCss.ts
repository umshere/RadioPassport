import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** app/tailwind.css is an ordered list of @imports; tests read the whole cascade. */
export function readAppCss(): string {
  const root = resolve(__dirname, "../../app");
  const entry = readFileSync(resolve(root, "tailwind.css"), "utf8");
  const parts = [...entry.matchAll(/@import "\.\/([^"]+)";/g)].map((m) =>
    readFileSync(resolve(root, m[1]!), "utf8"),
  );
  return parts.join("\n");
}
