# Scene Descriptor Contract

`SceneDescriptor` objects describe how AI-curated station scenes should look and sound. Providers must return JSON matching this shape:

```jsonc
{
  "visual": "3d_globe",           // matches a file in app/scenes/
  "mood": "psychedelic jazz",     // optional mood or vibe string
  "animation": "slow-tilt",       // optional animation hint for SceneManager
  "play": {
    "strategy": "autoplay_first", // autoplay_first | queue_only | preview_on_hover
    "crossfadeMs": 4000            // optional crossfade duration in ms
  },
  "reason": "Psychedelic + Jazz · High bitrate · Brazil", // optional explainer for the UI chip
  "stations": [                    // ordered by relevance before ranking adjustments
    {
      "uuid": "station-id",
      "name": "Radio XYZ",
      "country": "Brazil",
      "countryCode": "BR",
      "language": "Portuguese",
      "tagList": ["psychedelic", "jazz"],
      "bitrate": 192,
      "streamUrl": "https://...",
      "favicon": "https://.../icon.png",
      "highlight": "High-bitrate psychedelic jazz from São Paulo"
    }
  ]
}
```

Additional fields are ignored unless they are added to `app/scenes/types.ts` / `~/types/radio`. Providers should always supply at
least one station and prefer `uuid` + `streamUrl` so playback can begin immediately.
