#!/usr/bin/env node
// ship.mjs — push main as umshere, then ride the Git auto-deploy.
//
// One push, one build: pushing main already triggers Vercel's Git
// auto-deploy, so ship waits for that deployment to go Ready instead of
// firing `vercel --prod` too (that double-built the same commit and the two
// production promotions raced). The only path that still uses the CLI
// deploy is --skip-push: with no push there is no Git trigger, so the CLI
// build is the single deploy (env-change redeploys use this).
//
// Usage: npm run ship
//        node scripts/ship.mjs --skip-push     (redeploy current main via CLI)
//        node scripts/ship.mjs --skip-vercel   (push only, do not wait)
//
// This machine has more than one `gh` login. The active account is often
// heuristicsai, which 403s on umshere/RadioPassport. `gh auth switch` can
// fail on the macOS keyring. SSH is not a fallback (no key).
// ~/.npm is also often root-owned here; npx/npm must use a writable cache.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const skipPush = args.has("--skip-push");
const skipVercel = args.has("--skip-vercel");
const npmCache =
  process.env.NPM_CACHE || path.join(os.tmpdir(), "elsewhere-npm-cache");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    env: options.env ?? process.env,
  });
  if (result.error) fail(`${command}: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    fail(
      detail
        ? `${command} ${commandArgs.join(" ")} failed:\n${detail}`
        : `${command} ${commandArgs.join(" ")} failed (exit ${result.status}).`,
    );
  }
  return (result.stdout || "").trim();
}

function git(commandArgs) {
  return run("git", commandArgs);
}

const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
if (branch !== "main") {
  fail(`Ship only from main (now on ${branch}).`);
}

if (!skipPush) {
  const tokenResult = spawnSync("gh", ["auth", "token", "-u", "umshere"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const token = (tokenResult.stdout || "").trim();
  if (tokenResult.status !== 0 || !token) {
    fail(
      "Need a GitHub token for umshere (`gh auth token -u umshere`). Do not push as heuristicsai.",
    );
  }

  const stamp = `${process.pid}-${Date.now()}`;
  const askDir = mkdtempSync(path.join(os.tmpdir(), "elsewhere-ship-"));
  const tokenFile = path.join(askDir, "token");
  const askPass = path.join(askDir, "askpass.sh");
  writeFileSync(tokenFile, `${token}\n`, { mode: 0o600 });
  writeFileSync(
    askPass,
    `#!/bin/sh\ncase "$1" in\n  *Username*) printf '%s\\n' umshere ;;\n  *) cat ${JSON.stringify(tokenFile)} ;;\nesac\n`,
    { mode: 0o700 },
  );

  console.log("Pushing origin main as umshere…");
  const helper = `!f() { echo username=umshere; echo password=$(cat ${JSON.stringify(tokenFile)}); }; f`;
  try {
    const push = spawnSync("git", ["push", "origin", "HEAD:main"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "inherit",
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_ASKPASS: askPass,
        SSH_ASKPASS: askPass,
        // Reset machine gh helpers (heuristicsai), then use umshere once.
        GIT_CONFIG_COUNT: "4",
        GIT_CONFIG_KEY_0: "credential.helper",
        GIT_CONFIG_VALUE_0: "",
        GIT_CONFIG_KEY_1: "credential.https://github.com.helper",
        GIT_CONFIG_VALUE_1: "",
        GIT_CONFIG_KEY_2: "credential.helper",
        GIT_CONFIG_VALUE_2: helper,
        GIT_CONFIG_KEY_3: "credential.https://github.com.helper",
        GIT_CONFIG_VALUE_3: helper,
        ELSEWHERE_SHIP_STAMP: stamp,
      },
    });
    if (push.status !== 0) {
      fail("git push origin main failed. Check umshere auth; do not switch gh accounts.");
    }
  } finally {
    rmSync(askDir, { recursive: true, force: true });
  }
}

if (!skipVercel) {
  if (!skipPush) {
    // The push above fired Vercel's Git auto-deploy for this exact commit.
    // Wait for it to go Ready instead of starting a second build.
    const sha = git(["rev-parse", "HEAD"]);
    const url = waitForGitDeploy(sha);
    console.log(`Production: ${url}`);
  } else {
    // No push, so no Git trigger: the CLI build is the single deploy.
    console.log(`Vercel prod, no push (npm cache ${npmCache})…`);
    const vercel = spawnSync(
      "npx",
      ["--yes", "--cache", npmCache, "vercel", "--prod", "--yes"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: "inherit",
        env: {
          ...process.env,
          npm_config_cache: npmCache,
        },
      },
    );
    if (vercel.status !== 0) {
      fail("npx vercel --prod --yes failed.");
    }
  }
}

/**
 * Poll `vercel ls` for the Git-triggered deployment of `sha` until it is
 * Ready. Returns its URL. Fails on Error/Canceled or after ~10 minutes —
 * the deploy may still finish on its own; check the dashboard.
 */
function waitForGitDeploy(sha) {
  const tries = 40;
  for (let attempt = 1; attempt <= tries; attempt++) {
    const listing = run(
      "npx",
      [
        "--yes",
        "--cache",
        npmCache,
        "vercel",
        "ls",
        "-m",
        `githubCommitSha=${sha}`,
      ],
      { env: { ...process.env, npm_config_cache: npmCache } },
    );
    const match = listing.match(/https:\/\/\S+\s+●\s+(\S+)/);
    if (match) {
      const status = match[1];
      const url = match[0].split(/\s+/)[0];
      if (status === "Ready") return url;
      if (status === "Error" || status === "Canceled" || status === "Cancelled") {
        fail(`Git deploy for ${sha} ended ${status}: ${url}`);
      }
    }
    if (attempt < tries) {
      if (attempt % 4 === 1) console.log(`…waiting on the Git deploy (${statusOf(match)})`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15000);
    }
  }
  fail(
    `No Ready Git deploy for ${sha} after ~10 minutes. ` +
      `Check the Vercel dashboard for umsheres-projects/radio-passport.`,
  );
}

function statusOf(match) {
  return match ? match[1] : "not listed yet";
}

console.log("Ship commands finished. Verify elsewheremusic.com before calling it live.");
