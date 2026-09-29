// Bakes the four foliage sprites used by the environment layer (app/components/env).
// Run once: node scripts/gen-foliage.mjs. Output is committed; nothing filters at runtime.
import { Resvg } from "@resvg/resvg-js";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";

const SIZE = 512;
mkdirSync("public/env", { recursive: true });

// Small seeded PRNG so the sprites are reproducible.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canopy(seed, color, blur, count) {
  const r = rng(seed);
  const clumps = [
    [0.28, 0.3],
    [0.72, 0.42],
    [0.44, 0.78],
  ];
  const leaves = [];
  for (let i = 0; i < count; i++) {
    const [cx, cy] = clumps[i % clumps.length];
    const x = (cx + (r() - 0.5) * 0.46) * SIZE;
    const y = (cy + (r() - 0.5) * 0.46) * SIZE;
    const rx = (6 + r() * 16) * (SIZE / 512) * 1.4;
    const ry = rx * (0.38 + r() * 0.25);
    const rot = r() * 180;
    leaves.push(
      `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <filter id="f" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="${seed}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="38" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="${blur}"/>
    </filter>
    <radialGradient id="v"><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
    <mask id="m"><rect width="${SIZE}" height="${SIZE}" fill="url(#v)"/></mask>
  </defs>
  <g mask="url(#m)"><g fill="${color}" filter="url(#f)">${leaves.join("")}</g></g>
</svg>`;
}

const sprites = [
  ["fleck-near", 11, "#F3E4C8", 5, 120],
  ["fleck-far", 23, "#F3E4C8", 13, 110],
  ["shade-near", 11, "#2A2118", 5, 120],
  ["shade-far", 23, "#2A2118", 13, 110],
];

for (const [name, seed, color, blur, count] of sprites) {
  const png = new Resvg(canopy(seed, color, blur, count)).render().asPng();
  const tmp = `public/env/${name}.png`;
  writeFileSync(tmp, png);
  execFileSync("cwebp", ["-q", "70", "-alpha_q", "70", "-quiet", tmp, "-o", `public/env/${name}.webp`]);
  unlinkSync(tmp);
}
console.log("foliage sprites written to public/env");
