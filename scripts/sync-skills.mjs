#!/usr/bin/env node
// sync-skills.mjs — stamp the .grok twins from the .claude source of truth.
//
// `.claude/skills/*` and `.grok/skills/*` are verbatim twins: two CLI
// ecosystems each read their own tree, so NEITHER tree may ever be deleted.
// When a pair drifts, .claude wins; this script copies it over the .grok twin.
//
// Usage: npm run sync:skills   (== `node scripts/sync-skills.mjs`)
// No dependencies. Plain Node >= 18.

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TWIN_SKILLS = ["elsewhere-deploy", "elsewhere-troubleshoot"];

const rel = (p) => path.relative(repoRoot, p);

let updated = 0;
let failures = 0;

for (const skill of TWIN_SKILLS) {
  const source = path.join(repoRoot, ".claude", "skills", skill, "SKILL.md");
  const targetDir = path.join(repoRoot, ".grok", "skills", skill);
  const target = path.join(targetDir, "SKILL.md");

  if (!existsSync(source)) {
    console.error(`MISSING SOURCE  ${rel(source)} — nothing to copy from.`);
    failures += 1;
    continue;
  }

  mkdirSync(targetDir, { recursive: true });

  const after = readFileSync(source);
  let before = null;
  if (existsSync(target)) {
    before = readFileSync(target);
  }

  copyFileSync(source, target);

  if (before && before.equals(after)) {
    console.log(`current         ${rel(target)} (already identical)`);
  } else {
    console.log(`synced          ${rel(source)} -> ${rel(target)}`);
    updated += 1;
  }
}

console.log(
  `sync-skills: ${updated} twin(s) updated, ` +
    `${TWIN_SKILLS.length - updated - failures} already current, ${failures} error(s).`,
);

if (failures > 0) {
  process.exitCode = 1;
}
