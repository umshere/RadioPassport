import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

describe("controls", () => {
  it("every raw <button> declares its type (no accidental form submits)", () => {
    const bad: string[] = [];
    for (const file of walk(resolve(__dirname, "../../app"))) {
      const src = readFileSync(file, "utf8");
      for (const match of src.matchAll(/<button\b([^>]*)>/gs)) {
        if (!/\btype=/.test(match[1] ?? "") && !/\{\.\.\./.test(match[1] ?? "")) {
          bad.push(file.replace(/.*\/app\//, "app/"));
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
