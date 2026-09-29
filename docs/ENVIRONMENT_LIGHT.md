# Environment light

One fixed layer (`EnvLayer`, `app/styles/15-env.css`) of soft foliage light: warm flecks in the Night room, leaf shade in the Day room. It is one state, not four themes: `.ew-env[data-hour]` sets angle, stretch, softness, tint and breeze together; a change of hour transitions them over 3.3–4.7s and sends one WAAPI gust (damped sway) through both sprite layers.

- Hour source: home gate, else the home sky's city, else the playing station's solar hour, else the listener's own.
- Sprites are baked by `node scripts/gen-foliage.mjs` into `public/env/*.webp`. Nothing filters at runtime; idle motion is transform/opacity only.
- Budget: peak alpha ≤ .10 (tested). Phones use one sprite, sit between the gates and the dock, and feather at the edges.
- Reduced motion: no drift, no gust; hour changes become a 1.2s ease. Room swaps are a cut. Hidden tab pauses. Save-data shows the tint only.
- Design spec came from an Opus review; tune `--env-peak` per hour first if it reads as "leaves".
