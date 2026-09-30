# Environment light

The room's light: one fixed layer of soft foliage light that follows the hour. Warm flecks in the Night room, leaf shade on paper in the Day room. It is one state, not four themes.

Not to be confused with [ENVIRONMENT.md](./ENVIRONMENT.md), which lists environment variables.

## Files

| Path | Role |
|---|---|
| `app/components/env/EnvLayer.tsx` | The layer: hour source, landing, gusts, gyro, desktop clipping. Mounted once in `app/root.tsx` inside the page frame |
| `app/components/env/envModel.ts` | Pure maths: hours, durations, gain per page, gust and swing frames, per-station nudge |
| `app/state/envStore.ts` | `homeHour`: the hour the home is showing (gate, else the sky's station). Null off the home |
| `app/styles/15-env.css` | All look and motion. Last file in the cascade |
| `scripts/gen-foliage.mjs` | Bakes the four sprites with resvg. Run once; output is committed |
| `public/env/{fleck,shade}-{near,far}.webp` | The sprites, used as CSS masks so the hour colour fills them. Only the `fleck` pair is loaded, in both rooms; the `shade` files are unused |
| `tests/unit/env.test.ts` | Model, opacity budget, reduced-motion guards |

## How it behaves

- **Hour source:** the home's gate, else the home sky's city (`envStore`), else the playing station's solar hour, else the listener's own hour (refreshed every 5 minutes).
- **One state:** `.ew-env[data-hour]` (dawn, midday, dusk, night) sets angle, stretch, offset, softness, amplitude, breeze, tint and `--env-peak` together. The colour is the hour's own token (`--ew-hour-*`). In the Day room the same hue is deepened toward ink.
- **Hour change:** transitions over 2.6s plus 0.7s per step crossed (dawn to night is 4.7s) and sends one WAAPI gust (a damped sway, no bounce) through both sprite layers. The far layer lags by 180ms.
- **Page and station change:** each page holds the light at its own small angle and gain (`envGain`, `envPageTilt`); each station leans it a stable few degrees (`envNudge`). A page or station change sends a softer gust.
- **Landing:** on every load the room starts one hour back, hidden and half a turn (190 degrees) behind, stretched long. Once the sprites are up it sweeps once into the real hour over about 6 seconds, brightest at the start (bloom from 0.45 to 0.18 opacity), then stays quiet. No second pass.
- **Desktop (768px and up):** the layer is clipped to the sky panel's box (`.ew-sky`, measured with a ResizeObserver) and the sun anchors inside it, so the rest of the room stays black. Opacity gets a 1.35 boost there.
- **Phones:** one sprite layer, between the header and the dock (top 150px, bottom about 96px), feathered at both edges. "Lite" mode (narrow screen, 4GB or less memory, 4 cores or fewer) also drops the far layer.
- **Gyro parallax (touch devices):** tilting the phone shifts near leaves more than far ones, through two custom properties (`--env-px`, `--env-py`). One passive `deviceorientation` listener, resting pose follows slowly. iOS needs permission, requested on the first tap; if refused, nothing happens.
- **Idle motion:** transform and opacity only, incommensurate periods (29s to 59s) so it does not visibly repeat. Amplitude follows the hour, so night barely moves. Sprites load on idle, after the page is up. Nothing filters at runtime.
- **Reduced motion:** no drift, no gust, no landing sweep; hour changes become a 1.2s ease. A room swap (Night to Day) is a cut for everything. A hidden tab pauses the animations. Save-data or reduced-data hides the sprites.

## Budget

`--env-peak` is at most 0.10 for every hour in both rooms (tested). Layer opacity is that peak times far/near split, page gain and softness, multiplied by 5.5 for the mask. If it reads as "leaves" instead of light, lower `--env-peak` for that hour first.

## Art and licence

The sprites are our own drawing: branches with pointed almond leaves generated in `gen-foliage.mjs` and rasterised with resvg. A stock leaves image used in an early study (Sunlit's `leaves.png`, Adobe Stock, no licence) is not used. Movement is procedural (CSS drift, WAAPI gust).

## Known quirk

`.ew-env-tint` (a flat hour wash) is in the markup and the CSS but is `display: none`. It is off on purpose; the light comes from the sprites.
