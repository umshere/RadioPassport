# Motion design language — “Dots & Damping”

How to make the Tribe-style living geometry — dotted parametric figures that
breathe on their own and answer to scroll — and how to carry it across sites
without copying anyone's assets. Reference implementation: Elsewhere
(`motionField.ts`, `TusiField.tsx`, `ParticleGlobe.tsx` halo + scroll boost).

## The idea in one breath

Living geometry = **parametric curves drawn as dots** + **scroll-driven phase**
+ **springs that settle**. No physics engine, no WebGL. 2D canvas, sine waves,
and exponential damping. Cheap to run, crisp at any size, and it feels
physical because nothing ever snaps — everything eases.

## Primitives

### 1. Lissajous figure — the mark

A harmonograph curve: `x = sin(a·t + δ)`, `y = sin(b·t)`, `t` in `[0, 2π]`.
Small integer ratios (`3:2`, `4:3`, `5:4`) give the woven geometric knots.
Use for: card marks, section sigils, loading figures, empty-state companions.

Variants: `rings` (concentric amplitude steps), `spiral` (amplitude grows with
`t`), `orbits` (tilted ellipses), inner curve at a second `δ` for depth.

### 2. Tusi field — the room

A hypotrochoid (spirograph): point on a small circle rolling inside a big one.
Parameters `R` (outer), `r` (roller), `d` (pen offset). The namesake Tusi
couple (`R = 2r`, `d = r`) draws a straight line — the seed of every Islamic
geometric pattern. Use for: hero backdrops, footer washes, theater skies.

Render as 2–3 nested curves at different `δ` offsets, dotted, low alpha. The
overlap is where the richness comes from, not any single curve.

### 3. Dithered dots — the material

Never stroke the curve. Sample it (256–512 points) and draw each sample as a
circle whose radius falls off with distance from the viewer/center:
`size = base · clamp(falloff · contrast, 0, 1)`, skipping dots below ~0.25.
This stipple is the whole look — print-like, calm, and it hides aliasing.

Color: cycle 2–3 brand hues across dots (never one flat color). Alpha stays
low (0.1–0.4); density does the talking, not brightness.

### 4. Damped phase — the physics

Two numbers run every figure:

- `phase` — advances with time (`phase += speed · dt`) **plus** scroll
  (`phase += |scrollVelocity| · gain`). Scrolling literally winds the figure.
- `boost` — scroll injects velocity; each frame it decays exponentially
  (`boost → 0` at ~2.5/s) so motion flares while scrolling and settles after.
  This flare-and-settle is the “adhering to physics” feeling.

Rule: ease everything with `dampTowards(current, target, rate, dt)` —
`current + (target − current) · (1 − e^(−rate·dt))`. Rate 4–8/s feels alive;
above 12 feels snappy; below 2 feels drunk.

### 5. Node lifecycles — the living part

Dots are born at full size and die small: each node carries an age, and alpha
follows `sin(π · progress)` over a 4–8s life with a randomized offset. A
fraction of nodes are always mid-fade, so the field shimmers without any
global pulsing. Never pulse the whole canvas at once — it reads as a loading
spinner.

## Tokens

| Token | Role | Elsewhere value |
|---|---|---|
| `--ew-foil` | primary node hue (gold) | `198,165,106` |
| `--ew-ether` | secondary node hue (teal) | `126,184,180` |
| `--ew-bone` | tertiary node hue (ink/paper) | `232,223,208` |
| `--ew-live` | accent, sparingly (the now) | `#C73A3A` |
| dot base | canvas dot radius | 1.1–1.6px @ dpr≤2 |
| dot count | field density | 200–320 per curve |
| phase speed | idle breathe | 0.15–0.35 rad/s |
| scroll gain | scroll → phase | ~0.0016 rad/px |
| settle rate | boost decay | ~2.5–3/s |

Read hues from CSS custom properties at paint time (see `GalaxyBackdrop`
`tintOf`) so day/night rooms re-tint the field for free.

## Recipes

### Hero field (behind content, `z-0`, `pointer-events: none`)

1. Full-bleed canvas, `aria-hidden`, absolute inset-0.
2. Two hypotrochoids (`R:r` ≈ `5:3` and `7:4`), 220 dots each, foil + ether,
   alpha ≤ 0.28.
3. Phase breathes at 0.2 rad/s; scroll winds it; boost settles at 3/s.
4. Pause offscreen (`IntersectionObserver`), single static paint under
   `prefers-reduced-motion`.

### Card mark (88–120px sigil)

1. Lissajous `3:2`, 256 samples, one brand hue.
2. Animate `δ` slowly (draw/pulse via dash offset, or redraw dots).
3. Morph `a:b` per card (`3:2` Map, `4:3` Build, `5:4` Activate) so siblings
   rhyme without repeating.

### Scroll-scrubbed figure

Drive `δ` or phase directly from section progress (`ScrollTrigger scrub` or a
passive scroll listener + damping). The figure should complete roughly one
morph per viewport of travel — more feels seasick, less feels dead.

## Performance rules

- Cap DPR at 2. Skip resize work unless the box actually moved.
- One rAF per canvas; throttle ambient fields to ~12fps (80ms) like
  `GalaxyBackdrop` — dots don't need 60fps.
- Pause when `document.hidden` or offscreen. Never run more than two fields
  per viewport.
- `prefers-reduced-motion`: paint one static frame, kill the loop. Non-motion
  users get the composition, not a blank box.

## Porting checklist (new site, same language)

1. Pick 3 hues (primary, secondary, paper) + 1 rare accent.
2. Copy `motionField.ts` math (no dependencies) into the new repo.
3. Build the hero field first — it sets the tone for everything downstream.
4. Give each section one Lissajous ratio; keep counts, speeds, gains identical
   so the family resemblance holds.
5. Keep copy in the site's own voice; the motion is the through-line, not
   the words.
6. Test on a mid-range phone at 4x CPU throttle: if it warms the phone, halve
   the dots before touching anything else.

## Elsewhere mapping

- `app/components/radio-passport/motionField.ts` — math core (pure, tested).
- `app/components/radio-passport/TusiField.tsx` — hero field in `.rp-globe-side`.
- `app/components/radio-passport/ParticleGlobe.tsx` — scroll-boost spin with
  exponential settle + dotted halo ring in foil/ether/bone.
- `app/components/radio-passport/TheaterWell.tsx` — `drawOrbitSky`: the three
  meridian curves as dotted crawling flows with lacquer travelers, pulsing
  knowledge threads, twinkling seat glows. Seats never move, so the DOM
  buttons stay exactly where the canvas glows. Loop throttled to ~12fps and
  paused offscreen; one static frame under reduced motion.
- Voice stays Elsewhere (`land · dusk · hour · stamp · live · cover ·
  elsewhere · now`); the motion carries the Tribe influence, never the words.
