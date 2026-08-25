# Graph Report - RadioPassport  (2026-08-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1553 nodes · 3176 edges · 107 communities (90 shown, 17 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 94 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3246eda8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Handoff README: Radio Passport Redesign
- promptIntent.ts
- api.now-playing-trivia.ts
- productFlow.ts
- devDependencies
- recommend.ts
- theaterLock.ts
- dependencies
- TheaterWell.tsx
- services/aiOrchestrator.ts
- providers/index.ts
- stationInsights.ts
- probe.ts
- OpenRouterProvider.ts
- PlayerDock.tsx
- root.tsx
- roomStore.ts
- zustand-lite.ts
- Architecture Overview
- radio.ts
- compilerOptions
- Documentation Index
- radioPassportRedesign.test.ts
- stationFilters.ts
- create
- useNowPlayingMetadata.ts
- listen.tsx
- useTrackTrivia.ts
- Station
- radioBrowser.ts
- RadioBrowserCatalogueGenerator
- atmosphere.ts
- stations.ts
- Constellation Fable Review
- discoveryFiltersAndAvailability.test.ts
- trivia.ts
- Elsewhere OG Social Share Card
- GalaxyBackdrop.tsx
- stationAvailabilityStore.ts
- StationRow.tsx
- zustand/index.ts
- pretextLayout.ts
- GeminiProvider
- elsewhereProduct.test.ts
- ParticleGlobe.tsx
- AI Prompt Enhancement Notes
- Design Specs
- Elsewhere Colophon Card
- zustand.ts
- Constellation Graph Handoff
- Current AI Pipeline Runbook
- SignalField.tsx
- manifest.json
- Pretext Hero Insights
- Elsewhere App Icon (icon.png)
- Elsewhere Brand Mark (512x512 JPEG)
- build_intent_vocabulary.py
- colorExtraction.ts
- Elsewhere Favicon Mark
- theaterLock.test.ts
- remix.env.d.ts
- POST /api/ai/interpret
- FTS.jpeg 404 Wallpaper
- Listening Zen Hero Banner
- Pretext Atlas Hero Artwork
- CLAUDE.md - Claude Entry Pointer
- CountryFlag.tsx
- UI Flow
- RPLOGO - Radio Passport Legacy Logo
- IntentBar.tsx
- test-api.cjs
- AGENTS.md
- entry.server.tsx
- MobileTabBar.tsx
- useFloatingMusicNotes.ts
- halftone.ts
- sync-skills.mjs
- test-ai-atlas.js
- test-openrouter.js
- test-openrouter-models.js
- VoiceInput.tsx
- PassportStampIcon.tsx
- render-og.mjs
- test-openrouter-local.js
- skillTwins.test.ts
- react-globe-gl.d.ts
- countryNames.ts
- vercel.json
- world.ts
- Brand Assets
- action
- Station

## God Nodes (most connected - your core abstractions)
1. `Station` - 72 edges
2. `SceneDescriptor` - 26 edges
3. `normalizeStations()` - 25 edges
4. `Architecture Overview` - 24 edges
5. `compilerOptions` - 20 edges
6. `rbFetchJson()` - 19 edges
7. `usePlayerStore` - 19 edges
8. `stationLocation()` - 18 edges
9. `Constellation Fable Review` - 16 edges
10. `AiProvider` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Intent Echo (commit 6a2a77e)` --semantically_similar_to--> `Modest Typo Recovery (trans -> trance)`  [INFERRED] [semantically similar]
  REVIEW_TASK.md → design_handoff_radio_passport/CLAUDE_FILTER_SEARCH_AVAILABILITY_HANDOFF.md
- `Site-Wide og:image Default In Root.tsx` --references--> `Elsewhere OG Social Share Card`  [EXTRACTED]
  app/root.tsx → public/elsewhere-og.jpg
- `Elsewhere Deploy Skill (.claude)` --semantically_similar_to--> `Elsewhere Deploy Skill (.grok)`  [INFERRED] [semantically similar]
  .claude/skills/elsewhere-deploy/SKILL.md → .grok/skills/elsewhere-deploy/SKILL.md
- `Elsewhere Troubleshoot Skill (.claude)` --semantically_similar_to--> `Elsewhere Troubleshoot Skill (.grok)`  [INFERRED] [semantically similar]
  .claude/skills/elsewhere-troubleshoot/SKILL.md → .grok/skills/elsewhere-troubleshoot/SKILL.md
- `Bounded Live Probe Shelf (server/stations/probe.ts)` --references--> `Radio Browser Catalog`  [INFERRED]
  design_handoff_radio_passport/CLAUDE_FILTER_SEARCH_AVAILABILITY_HANDOFF.md → LLM.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Theater Constellation Render Stack** — docs_theater_constellation_handoff_theater_lock, docs_theater_constellation_handoff_theater_well, docs_constellation_graph_handoff_field_knowledge_edges, docs_constellation_fable_review_field_tour_spans, docs_architecture_listen_route [INFERRED 0.85]
- **Discovery Filter State Model and Contract** — v2_pool_filter, design_handoff_radio_passport_claude_filter_search_availability_handoff_filter_state_problem, design_handoff_radio_passport_claude_filter_search_availability_handoff_interaction_contract, design_handoff_radio_passport_claude_filter_search_availability_handoff_url_query_hydration, design_handoff_radio_passport_claude_filter_search_availability_handoff_typo_recovery [INFERRED 0.85]
- **Passport Stamping Flow (dwell to ink to stub)** — design_handoff_radio_passport_readme_stamp_mechanic, review_task_stamp_ink_progress, review_task_ticket_stub_stamps, pw_passport_counter, pw_reentry_arrival_states [INFERRED 0.85]
- **Now-playing Trivia Enrichment Pipeline** — docs_ai_pipeline_api_now_playing_trivia, docs_pretext_hero_insights_use_track_trivia, docs_constellation_graph_handoff_musicbrainz_relations, docs_constellation_graph_handoff_ai_deepen, docs_theater_constellation_handoff_request_track_trivia [INFERRED 0.90]
- **Room Write Path (dock writes, routes read)** — docs_architecture_player_dock, docs_architecture_room_store, docs_architecture_open_room, docs_architecture_use_room, docs_theater_constellation_handoff_single_icy_poller [INFERRED 0.90]

## Communities (107 total, 17 thin omitted)

### Community 0 - "Handoff README: Radio Passport Redesign"
Cohesion: 0.06
Nodes (63): Auto-Skip Transparency, Claude Handoff: Discovery Filters, Search Clarity, Station Availability, Hidden Filter State Problem, React Hydration Errors #418/#423, Filter Interaction Contract (All moods / All places / Clear search), Bounded Live Probe Shelf (server/stations/probe.ts), Catalog Snapshot Payload Reduction, Station Availability Honesty (no stale Healthy labels) (+55 more)

### Community 1 - "promptIntent.ts"
Cohesion: 0.06
Nodes (48): action(), clearDispatchCache(), dispatchCache, normalizeDispatch(), readDispatch(), rememberDispatch(), writePlaceDispatch(), action() (+40 more)

### Community 2 - "api.now-playing-trivia.ts"
Cohesion: 0.08
Nodes (47): completeGeminiJson(), completeJsonPreferringGateway(), getGeminiModel(), hasGeminiKey(), trimEnv(), completeJson(), completeOnce(), completeText() (+39 more)

### Community 3 - "productFlow.ts"
Cohesion: 0.08
Nodes (45): connectionById(), connectionsForStep(), CoverArrival, CoverEmptyAction, CoverEmptyKind, CoverEmptyState, coverWhileSeeking(), describeCoverEmpty() (+37 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (47): autoprefixer, eslint, eslint-plugin-react-hooks, devDependencies, autoprefixer, eslint, eslint-plugin-react-hooks, @playwright/test (+39 more)

### Community 5 - "recommend.ts"
Cohesion: 0.08
Nodes (41): action(), AiRecommendationResponse, applyPostProcessing(), BASE_STATIONS, buildPreferredList(), buildProviderIntent(), buildRankingIntent(), buildRelatedLanguageSet() (+33 more)

### Community 6 - "theaterLock.ts"
Cohesion: 0.07
Nodes (35): advanceFieldTraveler(), FAMILY_HOME, FAMILY_KIND, FAMILY_LINKS, FAMILY_SIZE, FAMILY_TOUR, FieldBand, FieldDustGrain (+27 more)

### Community 7 - "dependencies"
Cohesion: 0.05
Nodes (39): @chenglou/pretext, @emotion/react, framer-motion, @google/genai, isbot, @mantine/carousel, @mantine/core, @mantine/hooks (+31 more)

### Community 8 - "TheaterWell.tsx"
Cohesion: 0.12
Nodes (18): fieldEdgeShimmer(), fieldGraphPulse(), fieldHopRelation(), FieldNode, FieldRelease, fieldStandingLabel(), fieldStarTwinkle(), fieldTourSpans() (+10 more)

### Community 9 - "services/aiOrchestrator.ts"
Cohesion: 0.09
Nodes (22): UseEventHandlersProps, aiCallStats, AiRecommendationResponse, buildRequestOptions(), CallType, fetchDescriptor(), isSceneDescriptor(), loadWorldDescriptor() (+14 more)

### Community 10 - "providers/index.ts"
Cohesion: 0.13
Nodes (15): AiProvider, FallbackProvider, HeuristicsProvider, getConfiguredProviderNames(), getProvider(), normalizeProviderName(), providerCache, ProviderName (+7 more)

### Community 11 - "stationInsights.ts"
Cohesion: 0.12
Nodes (27): NowPlayingState, applyAiPreviewPool(), canRestoreFocusToTrigger(), clean(), focusTrapTarget, isAiTrackOptedIn(), isFocusablePresentation(), isVisibleFocusableElement() (+19 more)

### Community 12 - "probe.ts"
Cohesion: 0.09
Nodes (24): decodeMetadataPayload(), isBlockedHost(), loader(), parseStreamTitle(), PRIVATE_HOST_PATTERNS, readIcyMetadata(), sanitizeMetadata(), action() (+16 more)

### Community 13 - "OpenRouterProvider.ts"
Cohesion: 0.16
Nodes (22): fetchStationPool(), ProviderSceneContext, ProviderSceneIntent, SceneDescriptorParser, PREFERRED_API_VERSIONS, PREFERRED_MODEL_ORDER, HeuristicsSceneResponse, isScenePlayOptions() (+14 more)

### Community 14 - "PlayerDock.tsx"
Cohesion: 0.12
Nodes (19): ClientOnly(), ClientOnlyProps, PlayerDock(), useHydrated(), useRadioPlayer(), useRoom(), UpNextRow(), usePlayerNoticeStore (+11 more)

### Community 15 - "root.tsx"
Cohesion: 0.18
Nodes (9): GlobalAudioBridge(), useStationAvailabilityStore, playbackNoticeCopy(), PlaybackNoticeKind, canRetryPlayback(), getRetryDelayMs(), RECOVERABLE_REASONS, RETRY_DELAYS_MS (+1 more)

### Community 16 - "roomStore.ts"
Cohesion: 0.11
Nodes (26): mergeTriviaGraphs(), captionForStation(), createRoom(), deriveRoomPhase(), dispatchRequestFor(), EMPTY_ROOM, emptyRoom(), IDLE_DOSSIER (+18 more)

### Community 17 - "zustand-lite.ts"
Cohesion: 0.12
Nodes (12): EqualityChecker, GetState, pendingRehydrations, PersistOptions, PersistStorage, Selector, SetState, StateCreator (+4 more)

### Community 18 - "Architecture Overview"
Cohesion: 0.13
Nodes (24): /api/ai/recommend, applyAiPreviewPool, Architecture Overview, GlobalAudioBridge, Home Route (/), JourneyBridge, journeyStore, Theater Route (/listen) (+16 more)

### Community 19 - "radio.ts"
Cohesion: 0.15
Nodes (9): useAtlasState(), Country, ListeningMode, PlayerCard, CONTINENT_MAP, createStationKey(), dedupeStations(), getContinent() (+1 more)

### Community 20 - "compilerOptions"
Cohesion: 0.08
Nodes (24): compilerOptions, allowJs, allowSyntheticDefaultImports, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, ignoreDeprecations, isolatedModules (+16 more)

### Community 21 - "Documentation Index"
Cohesion: 0.17
Nodes (23): DeepSeek V4 Flash, Changelog, elsewheremusic.com Domain Cutover, Galaxy Night Backdrop, Mantine Removal, Deploy Runbook, Ship Flow (test, commit, push main, vercel --prod), Post-deploy Verify Curls (+15 more)

### Community 22 - "radioPassportRedesign.test.ts"
Cohesion: 0.05
Nodes (52): describeAtlasEmpty(), homeWithPassportHref(), SiteBar(), BRAND, BrandPalette, useFavorites(), useShelfProbe(), aggregateCountryStationContext() (+44 more)

### Community 23 - "stationFilters.ts"
Cohesion: 0.14
Nodes (17): createDefaultStationFilters(), deriveQualitySteps(), deriveStationFilterOptions(), extractLanguages(), extractMoods(), formatFilterLabel(), isStationFilterDirty(), normalizeToken() (+9 more)

### Community 24 - "create"
Cohesion: 0.22
Nodes (6): PlayerNotice, PlayerNoticeKind, PlayerNoticeState, UIState, useUIStore, create

### Community 25 - "useNowPlayingMetadata.ts"
Cohesion: 0.48
Nodes (6): getStationStreamUrl(), INITIAL_STATE, metadataForCurrentSource(), PollTimer, sourceKeyForNowPlaying(), useNowPlayingMetadata()

### Community 26 - "listen.tsx"
Cohesion: 0.19
Nodes (15): theaterWithoutStation(), splitFieldTokens(), theaterReleases(), theaterSkyShrink(), theaterTrackCopy(), ListeningPage(), formatClock(), formatLocalLabel() (+7 more)

### Community 27 - "useTrackTrivia.ts"
Cohesion: 0.16
Nodes (20): shouldAnimateDock(), createNowPlayingPoller(), nextNowPlayingLoadingState(), AI_TRIVIA_CACHE, AI_TRIVIA_INFLIGHT, INITIAL_STATE, requestTrackTrivia(), resetTriviaRequestState() (+12 more)

### Community 28 - "Station"
Cohesion: 0.13
Nodes (4): ProbePatch, OllamaProvider, OpenAIProvider, Station

### Community 29 - "radioBrowser.ts"
Cohesion: 0.11
Nodes (25): buildSnapshot(), fetchCountries(), fetchLanguages(), fetchRadioBrowserCatalogSnapshot(), fetchStations(), fetchTags(), LanguageSummary, RadioBrowserCatalogSnapshot (+17 more)

### Community 30 - "RadioBrowserCatalogueGenerator"
Cohesion: 0.18
Nodes (10): Any, Response, main(), RadioBrowserCatalogueGenerator, Format a station into RAG-optimized document., Generate the complete RAG catalogue., Generate statistics about the catalogue., Find a working RadioBrowser mirror. (+2 more)

### Community 31 - "atmosphere.ts"
Cohesion: 0.22
Nodes (15): AtmosphereBridge(), AtmospherePin(), CHOICES, AtmosphereState, useAtmosphereStore, applyAtmosphere(), Atmosphere, ATMOSPHERE_THEME_COLOR (+7 more)

### Community 32 - "stations.ts"
Cohesion: 0.16
Nodes (12): CompactStationCardProps, CompactStationListProps, StationArtwork(), StationArtworkProps, failedArtworkUrls, INVALID_ASSET_TOKENS, isKnownFailedArtworkUrl(), markArtworkUrlFailed() (+4 more)

### Community 33 - "Constellation Fable Review"
Cohesion: 0.16
Nodes (18): useRoom Hook, Constellation Fable Review, FIELD_DEGREE_CAP, fieldTourSpans, FIELD_TRIANGLE_CAP, GalaxyBackdrop, Golden Angle Family Fan, Missing Meridian Wound (+10 more)

### Community 34 - "discoveryFiltersAndAvailability.test.ts"
Cohesion: 0.11
Nodes (28): BrowsingMode, catalogRequestState(), describeEmptyResults(), EmptyStateAction, EmptyStateInfo, hourTapNextState(), nextQueryHref(), parseInitialQuery() (+20 more)

### Community 35 - "trivia.ts"
Cohesion: 0.22
Nodes (8): TrackTrivia, TrackTriviaResponse, TriviaFact, TriviaGraph, TriviaGraphEdge, TriviaGraphKind, TriviaGraphNode, TriviaLink

### Community 36 - "Elsewhere OG Social Share Card"
Cohesion: 0.16
Nodes (17): Coverline: 'You Are Not Here.', Deck Line: Live Radio From Cities Awake Without You, Foil-Ringed Earth Limb With City Lights, Elsewhere Product Brand, Eyebrow Line: Live Radio - Someone Else's Now, Elsewhere Favicon Seal (public/elsewhere-favicon.svg), Foot Line: Stay Long Enough To Be Stamped, GalaxyBackdrop Component (+9 more)

### Community 37 - "GalaxyBackdrop.tsx"
Cohesion: 0.19
Nodes (14): HOME_SKY_SEED, tintOf(), createRng(), fieldDust(), fieldDustAlpha(), fieldDustPoint(), fieldDustTwinkle(), fieldMilkyWay() (+6 more)

### Community 38 - "stationAvailabilityStore.ts"
Cohesion: 0.25
Nodes (6): availabilityStorage, isStationTemporarilyUnavailable(), StationAvailabilityState, StationFailure, StationFailureReason, persist()

### Community 39 - "StationRow.tsx"
Cohesion: 0.48
Nodes (5): StationArt(), stationLocation(), stationPlaceLine(), StationRow(), tidyPlace()

### Community 40 - "zustand/index.ts"
Cohesion: 0.15
Nodes (10): GetState, Listener, PartialState, SetState, StateCreator, StoreApi, Subscribe, UseStore (+2 more)

### Community 41 - "pretextLayout.ts"
Cohesion: 0.22
Nodes (11): PretextMeasuredText(), PretextMeasuredTextProps, fitsPretextWidth(), getPretextLineCount(), getPretextLines(), getPretextTightWidth(), preparedCache, preparedKey() (+3 more)

### Community 43 - "GeminiProvider"
Cohesion: 0.19
Nodes (7): buildGenerationConfig(), GeminiProvider, getApiVersions(), getFallbackModels(), mockedNormalizeStations, mockedRbFetchJson, originalEnv

### Community 44 - "elsewhereProduct.test.ts"
Cohesion: 0.20
Nodes (11): buildGlobePlaces(), COUNTRY_CENTROIDS, COUNTRY_NAME_TO_ISO, countryCentroid(), GlobeCoords, GlobeCoordSource, globeFocusId(), globeStationPool() (+3 more)

### Community 45 - "ParticleGlobe.tsx"
Cohesion: 0.18
Nodes (13): facingRotation(), globeHitDistance(), GlobeTurn, nearestVisiblePlace(), nextGlobePlaceIndex(), ParticleGlobe(), projectPlace(), rotationAtTurn() (+5 more)

### Community 46 - "AI Prompt Enhancement Notes"
Cohesion: 0.24
Nodes (12): Scene Animation Cues, Card Stack Experience, AI Prompt Enhancement Notes, GeminiProvider.ts, OllamaProvider.ts, OpenAIProvider.ts, OpenRouterProvider.ts, Preview-on-hover Playback Strategy (+4 more)

### Community 47 - "Design Specs"
Cohesion: 0.29
Nodes (8): Day / Night Room, Banned Words, Design Specs, Lacquer #C73A3A, Passage Motion System (--ew-settle), Night / Day Token System, Newsreader / Schibsted Grotesk / Azeret Mono, Elsewhere Voice Lexicon

### Community 48 - "Elsewhere Colophon Card"
Cohesion: 0.29
Nodes (12): Figure on About 'The room' Page, Elsewhere Colophon Card, Dusk Grain Field, Sun-at-Horizon Dusk Motif, Foil Brass Gold (BRAND.foil), Brass Foil Horizon Rule, Lacquer-Red Sun Disc, Shadow Notch on Disc Limb (+4 more)

### Community 49 - "zustand.ts"
Cohesion: 0.17
Nodes (9): EqualityChecker, GetState, Listener, PartialState, Selector, SetState, StateCreator, StoreApi (+1 more)

### Community 50 - "Constellation Graph Handoff"
Cohesion: 0.33
Nodes (11): /api/now-playing-trivia, Sky Becomes Knowledge Pass, source=ai-deepen Second-Ring Pass, Star Birth Ripple, Constellation Graph Handoff, fieldKnowledgeEdges, MusicBrainz Verified Relations, normalizeTriviaPayload (+3 more)

### Community 51 - "Current AI Pipeline Runbook"
Cohesion: 0.21
Nodes (12): POST /api/ai/dispatch, build_intent_vocabulary.py, Current AI Pipeline Runbook, Gemini 2.5 Flash, generatedVocabulary.ts, getProvider(), Heuristics LiteLLM Gateway, Never Invent ICY Titles (+4 more)

### Community 52 - "SignalField.tsx"
Cohesion: 0.24
Nodes (7): createNotes(), createParticles(), getNoteCount(), getParticleCount(), Note, NOTE_GLYPHS, Particle

### Community 53 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 54 - "Pretext Hero Insights"
Cohesion: 0.31
Nodes (9): Pretext Hero Insights, Elastic Headline Surface, HeroSection.tsx, Hero Hydration Mismatch, Drifting Insight Cloud, Pretext Layout Engine, pretextLayout.ts, useNowPlayingMetadata (+1 more)

### Community 55 - "Elsewhere App Icon (icon.png)"
Cohesion: 0.28
Nodes (9): Favicon / PWA App Icon Usage, Elsewhere App Icon (icon.png), Circular Seal Medallion Composition, Deep Navy and Gold Palette, Elsewhere (formerly Radio Passport) Brand Identity, Legacy Unreferenced Design Asset, Live Web Radio Broadcasting, Possible Ring Inscription or Lettering (+1 more)

### Community 56 - "Elsewhere Brand Mark (512x512 JPEG)"
Cohesion: 0.33
Nodes (9): App Icon Role (favicon + apple-touch-icon), Elsewhere Brand Mark (512x512 JPEG), About Colophon Image (/elsewhere-colophon.jpg), Elsewhere (web radio app, formerly Radio Passport), Elsewhere Favicon SVG (vector seal, foil ring + lacquer disc on ink), Header Wordmark Lockup (LIVE RADIO + Elsewhere), Foil Ring + Lacquer Disc Seal Glyph, SignalMark React Component (header brand mark renderer) (+1 more)

### Community 58 - "build_intent_vocabulary.py"
Cohesion: 0.44
Nodes (8): aggregate_aliases(), build_country_map(), build_language_map(), build_tag_map(), fetch_catalog(), main(), title_case(), write_typescript()

### Community 59 - "colorExtraction.ts"
Cohesion: 0.28
Nodes (5): detectGenre(), ExtractedColors, GENRE_PALETTES, getGenrePalette(), getStationColors()

### Community 61 - "Elsewhere Favicon Mark"
Cohesion: 0.32
Nodes (8): Elsewhere Brand Identity, Dark Ground Field (#0C0B09), Gold Orbit Ring (#C6A56A, r=11 stroke), On-Air Live Dot Convention, Elsewhere Favicon Mark, 'You Are Not Here' Inverted Map Marker, Passport Stamp Ring Motif, Red Center Dot (#C73A3A, r=4.5 fill)

### Community 62 - "theaterLock.test.ts"
Cohesion: 0.12
Nodes (21): fieldBirthBloom(), fieldBirthRipple(), fieldDensestPoint(), fieldDensity, fieldDistance(), fieldEdges(), fieldFamiliesConnect(), fieldKnowledgeEdges() (+13 more)

### Community 63 - "remix.env.d.ts"
Cohesion: 0.25
Nodes (7): SpeechRecognition, SpeechRecognitionAlternative, SpeechRecognitionErrorEvent, SpeechRecognitionEvent, SpeechRecognitionResult, SpeechRecognitionResultList, Window

### Community 64 - "POST /api/ai/interpret"
Cohesion: 0.38
Nodes (7): POST /api/ai/interpret, extractPromptIntent, Intent Bar, Implementation Plan: Intent Echo, intentEchoFromInterpret, seekingStatus Contract, submitIntent Handler

### Community 65 - "FTS.jpeg 404 Wallpaper"
Cohesion: 0.38
Nodes (7): 404 Wallpaper Role (Preserved Asset), Lost / Off-the-Map Wayfinding Mood, Night Atmosphere Lock on 404, 404 NotFoundEasterEgg Surface, Hard-Rule Preservation Rationale, 128px Vertical Repeating Tile Strip, FTS.jpeg 404 Wallpaper

### Community 66 - "Listening Zen Hero Banner"
Cohesion: 0.43
Nodes (7): Listening Zen Hero Banner, Dusk Gradient Palette, Gold Glow with Concentric Rings, Setting Sun Reading of the Gold Glow, Horizon Signal Waves, Rounded Stamp Frame, Zen Listening Mood

### Community 67 - "Pretext Atlas Hero Artwork"
Cohesion: 0.38
Nodes (7): Pretext Atlas Hero Artwork, Atlas Heatmap Panel Backdrop, Atlas Overlay Feature, Global Listening Atmosphere, Pretext Homepage Hero Experiment, Pretext Typography System, World Map Motif

### Community 68 - "CLAUDE.md - Claude Entry Pointer"
Cohesion: 0.40
Nodes (5): CLAUDE.md - Claude Entry Pointer, Elsewhere Deploy Skill (.claude), Elsewhere Troubleshoot Skill (.claude), Elsewhere Deploy Skill (.grok), Elsewhere Troubleshoot Skill (.grok)

### Community 70 - "UI Flow"
Cohesion: 0.25
Nodes (9): .ew-horizon Hour Stops, Testing Guide, Every Empty State Offers a Next Step, productFlow.ts Contract, Product Loop (land-intent-tune-inhabit-stamp-next), UI Flow, Empty State Names the Next Move, Solar Hour Filter (+1 more)

### Community 71 - "RPLOGO - Radio Passport Legacy Logo"
Cohesion: 0.60
Nodes (5): Elsewhere web radio app, RPLOGO - Radio Passport Legacy Logo, Passport stamp / emblem motif, PASSPORT wordmark, Radio Passport (heritage brand)

### Community 74 - "test-api.cjs"
Cohesion: 0.50
Nodes (4): checkMirror(), https, mirrors, run()

### Community 75 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): Correspondent, Roadmap, Session Handoff

### Community 76 - "entry.server.tsx"
Cohesion: 0.83
Nodes (3): handleBotRequest(), handleBrowserRequest(), handleRequest()

### Community 79 - "halftone.ts"
Cohesion: 0.83
Nodes (3): grainPath(), grainRect(), inkTile()

### Community 81 - "test-ai-atlas.js"
Cohesion: 0.67
Nodes (3): runTests(), TEST_PROMPTS, testPrompt()

### Community 82 - "test-openrouter.js"
Cohesion: 0.67
Nodes (3): main(), testPrompts, testRecommendation()

### Community 83 - "test-openrouter-models.js"
Cohesion: 0.67
Nodes (3): MODELS, runTests(), testModel()

## Ambiguous Edges - Review These
- `Type System (Sora display, Plex Mono telemetry)` → `OG Still Brand Palette (night-earth washes)`  [AMBIGUOUS]
  scripts/og-still.html · relation: conceptually_related_to
- `Sun-at-Horizon Dusk Motif` → `Shadow Notch on Disc Limb`  [AMBIGUOUS]
  public/elsewhere-colophon.jpg · relation: conceptually_related_to
- `Passport-Stamp Seal Gesture` → `Elsewhere Colophon Card`  [AMBIGUOUS]
  public/elsewhere-colophon.jpg · relation: semantically_similar_to
- `Favicon / PWA App Icon Usage` → `Legacy Unreferenced Design Asset`  [AMBIGUOUS]
  icon.png · relation: conceptually_related_to
- `Possible Ring Inscription or Lettering` → `Elsewhere App Icon (icon.png)`  [AMBIGUOUS]
  icon.png · relation: references
- `Station Plate Fallback (mark shown when Radio Browser sent no art)` → `Elsewhere Brand Mark (512x512 JPEG)`  [AMBIGUOUS]
  public/elsewhere-mark.jpg · relation: conceptually_related_to
- `Gold Glow with Concentric Rings` → `Setting Sun Reading of the Gold Glow`  [AMBIGUOUS]
  public/listening-zen-hero.svg · relation: semantically_similar_to
- `World Map Motif` → `Pretext Atlas Hero Artwork`  [AMBIGUOUS]
  public/pretext-atlas-hero.png · relation: conceptually_related_to

## Knowledge Gaps
- **371 isolated node(s):** `CoverEmptyAction`, `CoverEmptyKind`, `CoverEmptyState`, `FlowAction`, `FlowSurface` (+366 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Type System (Sora display, Plex Mono telemetry)` and `OG Still Brand Palette (night-earth washes)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Sun-at-Horizon Dusk Motif` and `Shadow Notch on Disc Limb`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Passport-Stamp Seal Gesture` and `Elsewhere Colophon Card`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Favicon / PWA App Icon Usage` and `Legacy Unreferenced Design Asset`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Possible Ring Inscription or Lettering` and `Elsewhere App Icon (icon.png)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Station Plate Fallback (mark shown when Radio Browser sent no art)` and `Elsewhere Brand Mark (512x512 JPEG)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Gold Glow with Concentric Rings` and `Setting Sun Reading of the Gold Glow`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._