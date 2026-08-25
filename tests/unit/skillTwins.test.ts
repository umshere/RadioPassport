import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// `.claude/skills/*` and `.grok/skills/*` are verbatim twins: two CLI
// ecosystems each read their own tree, so NEITHER tree may ever be deleted.
// This guard fails loudly if a pair drifts or if one side goes missing.
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const TWIN_SKILLS = ["elsewhere-deploy", "elsewhere-troubleshoot"];

describe("skill twins (.claude <-> .grok)", () => {
  for (const skill of TWIN_SKILLS) {
    it(`${skill}: SKILL.md is byte-identical across .claude and .grok`, () => {
      const claudePath = path.join(repoRoot, ".claude", "skills", skill, "SKILL.md");
      const grokPath = path.join(repoRoot, ".grok", "skills", skill, "SKILL.md");

      let claudeBytes: Buffer;
      let grokBytes: Buffer;
      try {
        claudeBytes = readFileSync(claudePath);
        grokBytes = readFileSync(grokPath);
      } catch (error) {
        const missing =
          (error as NodeJS.ErrnoException).path ?? "(unknown path)";
        throw new Error(
          `Twin skill tree incomplete — cannot read ${missing}. ` +
            `.claude/skills and .grok/skills are verbatim twins and NEITHER ` +
            `tree may ever be deleted; restore both sides of ${skill}.`,
        );
      }

      if (!claudeBytes.equals(grokBytes)) {
        throw new Error(
          `Skill twins drifted for ${skill}: ` +
            `${path.relative(repoRoot, claudePath)} != ` +
            `${path.relative(repoRoot, grokPath)}. ` +
            `Copy the .claude version over the .grok twin ` +
            `(npm run sync:skills).`,
        );
      }

      expect(claudeBytes.equals(grokBytes)).toBe(true);
    });
  }
});
