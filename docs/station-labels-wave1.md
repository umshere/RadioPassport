# Station labels, wave 1 (200-station run, 2026-10-17)

Offline Jev labelling: `scripts/label-stations.mjs` -> `app/data/stationLabels.json`, read via `app/services/catalog/stationLabels.ts`. Labels describe how a station presents itself (name + tags), never what is on air now. Never call Jev per visit.

Run: model jev-1.13.0, 200 stations, 200 ok, 0 failures, latency p50 120 ms / p95 193 ms / max 278 ms (concurrency 4).
Usage: 509,669 input + 349,787 output tokens (about 2.5k in / 1.75k out per station, 5 questions each; output includes the full probability distribution). Full 500 pool is roughly 1.25M in / 0.87M out. Price per token not known to us; multiply by the TypeSafe rate.

Confidence (median / p25): format 1.0 / 0.96, family 1.0 / 0.91, label1 0.91 / 0.67, label2 0.72 / 0.55, label3 0.56 / 0.45.
Threshold chosen: `STATION_LABEL_MIN_CONFIDENCE = 0.6`. Wrong or off-topic answers seen at 0.42-0.54 ("Public radio" for BBC Radio 1 Dance, "Classic rock" for a blues/rock mix); format/family are right at nearly every confidence.
Slots 2 and 3 often repeat slot 1 or say little; the loader dedupes. A full run could drop label3.
