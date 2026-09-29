// Bakes the four foliage sprites used by the environment layer (app/components/env).
// Real branches with pointed leaves; "near" is crisp, "far" is out of focus.
// Run once: node scripts/gen-foliage.mjs. Output is committed; nothing filters at runtime.
import { Resvg } from "@resvg/resvg-js";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";

const SIZE = 1024;
mkdirSync("public/env", { recursive: true });

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// A pointed almond leaf, base at the origin, tip at (len, 0).
const leafPath = (len, wid) =>
  `M0 0 C${len * 0.25} ${-wid} ${len * 0.75} ${-wid * 0.9} ${len} 0 C${len * 0.75} ${wid * 0.9} ${len * 0.25} ${wid} 0 0Z`;

function branches(seed, scale) {
  const r = rng(seed);
  const out = [];
  // Boughs hang in from the top and right, like a tree outside a window.
  const starts = [
    [SIZE * 0.95, -30, 2.2], [SIZE * 0.6, -30, 1.9], [SIZE * 0.25, -30, 1.4],
    [SIZE + 30, SIZE * 0.3, 2.9], [SIZE + 30, SIZE * 0.7, 3.3], [SIZE * 0.05, -30, 1.15],
    [SIZE * 0.8, -30, 2.05], [SIZE * 0.42, -30, 1.7], [SIZE + 30, SIZE * 0.05, 2.6], [SIZE + 30, SIZE * 0.5, 3.1],
    [-30, SIZE * 0.2, 0.3], [SIZE * 0.15, -30, 1.3],
  ];
  for (const [x0, y0, ang] of starts) {
    const length = 420 + r() * 380;
    const bend = (r() - 0.5) * 1.3;
    let x = x0, y = y0, a = ang;
    const pts = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      pts.push([x, y, a]);
      const seg = length / steps;
      a += bend / steps + (r() - 0.5) * 0.35;
      x += Math.cos(a) * seg;
      y += Math.sin(a) * seg;
    }
    out.push(`<path d="M${pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L")}" fill="none" stroke="currentColor" stroke-width="${(4 + r() * 3).toFixed(1)}" stroke-linecap="round"/>`);
    pts.forEach(([px, py, pa], i) => {
      if (i < 2) return;
      const taper = 1 - i / (steps + 8);
      const n = 2 + (r() < 0.5 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        if (r() < 0.12) continue;
        const side = r() < 0.5 ? -1 : 1;
        const la = pa + side * (0.35 + r() * 1.1);
        const len = (55 + r() * 110) * taper * scale;
        const wid = len * (0.28 + r() * 0.2);
        out.push(`<path d="${leafPath(len.toFixed(1), wid.toFixed(1))}" transform="translate(${(px + (r() - 0.5) * 20).toFixed(1)} ${(py + (r() - 0.5) * 20).toFixed(1)}) rotate(${((la * 180) / Math.PI).toFixed(1)})"/>`);
      }
    });
  }
  return out.join("");
}

function canopy(seed, color, blur, scale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <filter id="f" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="2" seed="${seed}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="46" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="${blur}"/>
    </filter>
    <radialGradient id="v"><stop offset=".62" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
    <mask id="m"><rect width="${SIZE}" height="${SIZE}" fill="url(#v)"/></mask>
  </defs>
  <g mask="url(#m)"><g fill="${color}" color="${color}" filter="url(#f)">${branches(seed, scale)}</g></g>
</svg>`;
}

const sprites = [
  ["fleck-near", 11, "#F3E4C8", 2.2, 1.0],
  ["fleck-far", 23, "#F3E4C8", 12, 1.25],
  ["shade-near", 11, "#2A2118", 2.2, 1.0],
  ["shade-far", 23, "#2A2118", 12, 1.25],
];

for (const [name, seed, color, blur, scale] of sprites) {
  const png = new Resvg(canopy(seed, color, blur, scale)).render().asPng();
  const tmp = `public/env/${name}.png`;
  writeFileSync(tmp, png);
  execFileSync("cwebp", ["-q", "72", "-alpha_q", "72", "-quiet", tmp, "-o", `public/env/${name}.webp`]);
  if (name === "shade-near") writeFileSync(`/tmp/${name}-preview.png`, png);
  unlinkSync(tmp);
}
console.log("foliage sprites written to public/env");
