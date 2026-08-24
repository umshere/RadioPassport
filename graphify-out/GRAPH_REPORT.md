# Graph Report - .  (2026-08-24)

## Corpus Check
- Large corpus: 234 files · ~501,749 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 1529 nodes · 3331 edges · 104 communities (92 shown, 12 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 103 edges (avg confidence: 0.83)
- Token cost: 124,300 input · 44,350 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Agent Brief & Voice Rules|Agent Brief & Voice Rules]]
- [[_COMMUNITY_Dock Motion & Now Playing|Dock Motion & Now Playing]]
- [[_COMMUNITY_Gemini JSON Fallback|Gemini JSON Fallback]]
- [[_COMMUNITY_AI Recommendation Route|AI Recommendation Route]]
- [[_COMMUNITY_Listening Mode & Cover Flow|Listening Mode & Cover Flow]]
- [[_COMMUNITY_Station Pool & Catalog|Station Pool & Catalog]]
- [[_COMMUNITY_ICY Now Playing Route|ICY Now Playing Route]]
- [[_COMMUNITY_Provider Base & Fallback|Provider Base & Fallback]]
- [[_COMMUNITY_Hydration-Safe Dock Components|Hydration-Safe Dock Components]]
- [[_COMMUNITY_Theater Field Families|Theater Field Families]]
- [[_COMMUNITY_Search State Contracts|Search State Contracts]]
- [[_COMMUNITY_Globe Intent & Country Cache|Globe Intent & Country Cache]]
- [[_COMMUNITY_Local Provider Adapters|Local Provider Adapters]]
- [[_COMMUNITY_Constellation Design Notes|Constellation Design Notes]]
- [[_COMMUNITY_Atlas State Hooks|Atlas State Hooks]]
- [[_COMMUNITY_Architecture Route Map|Architecture Route Map]]
- [[_COMMUNITY_AI Orchestrator Core|AI Orchestrator Core]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Deploy & Domains Runbooks|Deploy & Domains Runbooks]]
- [[_COMMUNITY_Particle Globe Interaction|Particle Globe Interaction]]
- [[_COMMUNITY_Prompt Intent Extraction|Prompt Intent Extraction]]
- [[_COMMUNITY_Theater Field Presentation|Theater Field Presentation]]
- [[_COMMUNITY_Station Filter Utils|Station Filter Utils]]
- [[_COMMUNITY_Favorites & Journey Stamps|Favorites & Journey Stamps]]
- [[_COMMUNITY_Country Drilldown & Shelf|Country Drilldown & Shelf]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Interpret Endpoint|Interpret Endpoint]]
- [[_COMMUNITY_Root Shell & Audio Bridge|Root Shell & Audio Bridge]]
- [[_COMMUNITY_Hosted Provider Adapters|Hosted Provider Adapters]]
- [[_COMMUNITY_Station Probe Service|Station Probe Service]]
- [[_COMMUNITY_RAG Catalogue Generator|RAG Catalogue Generator]]
- [[_COMMUNITY_Station List Components|Station List Components]]
- [[_COMMUNITY_Atmosphere Pin System|Atmosphere Pin System]]
- [[_COMMUNITY_Theater Field Simulation|Theater Field Simulation]]
- [[_COMMUNITY_Session Handoff Log|Session Handoff Log]]
- [[_COMMUNITY_Prompt Enhancement Spec|Prompt Enhancement Spec]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_OG Share Card Content|OG Share Card Content]]
- [[_COMMUNITY_Backdrop Sky Rendering|Backdrop Sky Rendering]]
- [[_COMMUNITY_Zustand Lite Shim|Zustand Lite Shim]]
- [[_COMMUNITY_Design Specs & Changelog|Design Specs & Changelog]]
- [[_COMMUNITY_Zustand Library Types|Zustand Library Types]]
- [[_COMMUNITY_Pretext Text Layout|Pretext Text Layout]]
- [[_COMMUNITY_Dispatch Endpoint|Dispatch Endpoint]]
- [[_COMMUNITY_Header Brand Bar|Header Brand Bar]]
- [[_COMMUNITY_Station Rows & Stamps|Station Rows & Stamps]]
- [[_COMMUNITY_Player Store Queue|Player Store Queue]]
- [[_COMMUNITY_Colophon Card Artwork|Colophon Card Artwork]]
- [[_COMMUNITY_Vendored Zustand Runtime|Vendored Zustand Runtime]]
- [[_COMMUNITY_AI Pipeline Rules Doc|AI Pipeline Rules Doc]]
- [[_COMMUNITY_Globe Place Coordinates|Globe Place Coordinates]]
- [[_COMMUNITY_Signal Field Canvas|Signal Field Canvas]]
- [[_COMMUNITY_Heuristics Provider|Heuristics Provider]]
- [[_COMMUNITY_PWA Manifest|PWA Manifest]]
- [[_COMMUNITY_Pretext Hero Insights|Pretext Hero Insights]]
- [[_COMMUNITY_Legacy App Icon|Legacy App Icon]]
- [[_COMMUNITY_Brand Mark Assets|Brand Mark Assets]]
- [[_COMMUNITY_Language Utilities|Language Utilities]]
- [[_COMMUNITY_Intent Vocabulary Builder|Intent Vocabulary Builder]]
- [[_COMMUNITY_Player Notices & UI Store|Player Notices & UI Store]]
- [[_COMMUNITY_Station Color Extraction|Station Color Extraction]]
- [[_COMMUNITY_UI Flow Rules|UI Flow Rules]]
- [[_COMMUNITY_Favicon Seal Mark|Favicon Seal Mark]]
- [[_COMMUNITY_Field Graph Geometry|Field Graph Geometry]]
- [[_COMMUNITY_Speech Recognition Typings|Speech Recognition Typings]]
- [[_COMMUNITY_Station Availability Store|Station Availability Store]]
- [[_COMMUNITY_Trivia Graph Types|Trivia Graph Types]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
- [[_COMMUNITY_NPM Scripts|NPM Scripts]]
- [[_COMMUNITY_404 Wallpaper Asset|404 Wallpaper Asset]]
- [[_COMMUNITY_Zen Hero Banner|Zen Hero Banner]]
- [[_COMMUNITY_Atlas Hero Artwork|Atlas Hero Artwork]]
- [[_COMMUNITY_Country Flag Component|Country Flag Component]]
- [[_COMMUNITY_Heritage Radio Passport Logo|Heritage Radio Passport Logo]]
- [[_COMMUNITY_Shelf Reason Cache|Shelf Reason Cache]]
- [[_COMMUNITY_Server Entry Handlers|Server Entry Handlers]]
- [[_COMMUNITY_Mobile Tab Bar|Mobile Tab Bar]]
- [[_COMMUNITY_Floating Music Notes|Floating Music Notes]]
- [[_COMMUNITY_Halftone Grain Texture|Halftone Grain Texture]]
- [[_COMMUNITY_Atlas AI Prompt Tests|Atlas AI Prompt Tests]]
- [[_COMMUNITY_OpenRouter Rec Tests|OpenRouter Rec Tests]]
- [[_COMMUNITY_OpenRouter Model Tests|OpenRouter Model Tests]]
- [[_COMMUNITY_Voice Input Component|Voice Input Component]]
- [[_COMMUNITY_Passport Stamp Icon|Passport Stamp Icon]]
- [[_COMMUNITY_OG Render Script|OG Render Script]]
- [[_COMMUNITY_Local OpenRouter API Test|Local OpenRouter API Test]]
- [[_COMMUNITY_Globe GL Typings|Globe GL Typings]]
- [[_COMMUNITY_Country Name Utils|Country Name Utils]]
- [[_COMMUNITY_Vercel Config|Vercel Config]]
- [[_COMMUNITY_Passport Entry Types|Passport Entry Types]]
- [[_COMMUNITY_Catalog Action Node|Catalog Action Node]]

## God Nodes (most connected - your core abstractions)
1. `Station` - 75 edges
2. `normalizeStations()` - 27 edges
3. `SceneDescriptor` - 26 edges
4. `Architecture Overview` - 25 edges
5. `Index()` - 22 edges
6. `stationLocation()` - 21 edges
7. `usePlayerStore` - 21 edges
8. `rbFetchJson()` - 21 edges
9. `compilerOptions` - 20 edges
10. `Session Handoff` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Elsewhere Deploy Skill (.claude)` --semantically_similar_to--> `Elsewhere Deploy Skill (.grok)`  [INFERRED] [semantically similar]
  .claude/skills/elsewhere-deploy/SKILL.md → .grok/skills/elsewhere-deploy/SKILL.md
- `Elsewhere Troubleshoot Skill (.claude)` --semantically_similar_to--> `Elsewhere Troubleshoot Skill (.grok)`  [INFERRED] [semantically similar]
  .claude/skills/elsewhere-troubleshoot/SKILL.md → .grok/skills/elsewhere-troubleshoot/SKILL.md
- `Intent Echo (commit 6a2a77e)` --semantically_similar_to--> `Modest Typo Recovery (trans -> trance)`  [INFERRED] [semantically similar]
  REVIEW_TASK.md → design_handoff_radio_passport/CLAUDE_FILTER_SEARCH_AVAILABILITY_HANDOFF.md
- `Site-Wide og:image Default In Root.tsx` --references--> `Elsewhere OG Social Share Card`  [EXTRACTED]
  app/root.tsx → public/elsewhere-og.jpg
- `AGENTS.md - Elsewhere Agent Brief` --references--> `Heuristics AI Gateway (Flash only)`  [INFERRED]
  AGENTS.md → LLM.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Passport Stamping Flow (dwell to ink to stub)** — readme_stamp_mechanic, review_task_stamp_ink_progress, review_task_ticket_stub_stamps, pw_passport_counter, pw_reentry_arrival_states [INFERRED 0.85]
- **Agent Ops Runbook System (skills + runbooks)** — agents_doc, elsewhere_deploy_skill_claude, elsewhere_troubleshoot_skill_claude, elsewhere_deploy_skill_grok, elsewhere_troubleshoot_skill_grok, docs_deploy, docs_troubleshooting, docs_domains [EXTRACTED 1.00]
- **Discovery Filter State Model and Contract** — v2_pool_filter, design_handoff_radio_passport_claude_filter_search_availability_handoff_filter_state_problem, design_handoff_radio_passport_claude_filter_search_availability_handoff_interaction_contract, design_handoff_radio_passport_claude_filter_search_availability_handoff_url_query_hydration, design_handoff_radio_passport_claude_filter_search_availability_handoff_typo_recovery [INFERRED 0.85]
- **Now-playing Trivia Enrichment Pipeline** — docs_ai_pipeline_api_now_playing_trivia, docs_pretext_hero_insights_use_track_trivia, docs_constellation_graph_handoff_musicbrainz_relations, docs_constellation_graph_handoff_ai_deepen, docs_theater_constellation_handoff_request_track_trivia [INFERRED 0.90]
- **Room Write Path (dock writes, routes read)** — docs_architecture_player_dock, docs_architecture_room_store, docs_architecture_open_room, docs_architecture_use_room, docs_theater_constellation_handoff_single_icy_poller [INFERRED 0.90]
- **Theater Constellation Render Stack** — docs_theater_constellation_handoff_theater_lock, docs_theater_constellation_handoff_theater_well, docs_constellation_graph_handoff_field_knowledge_edges, docs_constellation_fable_review_field_tour_spans, docs_architecture_listen_route [INFERRED 0.85]

## Communities (104 total, 12 thin omitted)

### Community 0 - "Agent Brief & Voice Rules"
Cohesion: 0.05
Nodes (77): App Architecture Map (Room writer/reader contracts), AGENTS.md - Elsewhere Agent Brief, Elsewhere (product) / Radio Passport (heritage), Elsewhere Hard Rules, Voice Vocabulary (allowed and banned words), CLAUDE.md - Claude Entry Pointer, Auto-Skip Transparency, Claude Handoff: Discovery Filters, Search Clarity, Station Availability (+69 more)

### Community 1 - "Dock Motion & Now Playing"
Cohesion: 0.07
Nodes (52): shouldAnimateDock(), createNowPlayingPoller(), getStationStreamUrl(), INITIAL_STATE, metadataForCurrentSource(), nextNowPlayingLoadingState(), NowPlayingState, PollTimer (+44 more)

### Community 2 - "Gemini JSON Fallback"
Cohesion: 0.08
Nodes (47): completeGeminiJson(), completeJsonPreferringGateway(), getGeminiModel(), hasGeminiKey(), trimEnv(), completeJson(), completeOnce(), completeText() (+39 more)

### Community 3 - "AI Recommendation Route"
Cohesion: 0.08
Nodes (42): action(), AiRecommendationResponse, applyPostProcessing(), BASE_STATIONS, buildPreferredList(), buildProviderIntent(), buildRankingIntent(), buildRelatedLanguageSet() (+34 more)

### Community 4 - "Listening Mode & Cover Flow"
Cohesion: 0.08
Nodes (39): persistListeningMode(), restoreListeningMode(), connectionById(), connectionsForStep(), coverArrival, CoverEmptyAction, CoverEmptyKind, CoverEmptyState (+31 more)

### Community 5 - "Station Pool & Catalog"
Cohesion: 0.09
Nodes (31): fetchStationPool(), buildSnapshot(), fetchCountries(), fetchLanguages(), fetchRadioBrowserCatalogSnapshot(), fetchStations(), fetchTags(), LanguageSummary (+23 more)

### Community 6 - "ICY Now Playing Route"
Cohesion: 0.09
Nodes (31): decodeMetadataPayload(), isBlockedHost(), loader(), parseStreamTitle(), PRIVATE_HOST_PATTERNS, readIcyMetadata(), sanitizeMetadata(), captionForStation() (+23 more)

### Community 7 - "Provider Base & Fallback"
Cohesion: 0.13
Nodes (19): AiProvider, ProviderSceneContext, ProviderSceneIntent, SceneDescriptorParser, FallbackProvider, buildGenerationConfig(), GeminiProvider, getApiVersions() (+11 more)

### Community 8 - "Hydration-Safe Dock Components"
Cohesion: 0.13
Nodes (22): ClientOnly(), ClientOnlyProps, PlayerDock(), useHydrated(), useRadioPlayer(), useRoom(), theaterWithoutStation(), theaterTrackCopy() (+14 more)

### Community 9 - "Theater Field Families"
Cohesion: 0.07
Nodes (32): advanceFieldTraveler(), FAMILY_HOME, FAMILY_KIND, FAMILY_LINKS, FAMILY_SIZE, FAMILY_TOUR, FieldBand, FieldDustGrain (+24 more)

### Community 10 - "Search State Contracts"
Cohesion: 0.12
Nodes (27): BrowsingMode, describeEmptyResults(), EmptyStateAction, EmptyStateInfo, hourTapNextState(), nextQueryHref(), parseInitialQuery(), playFromAtlasNextState() (+19 more)

### Community 11 - "Globe Intent & Country Cache"
Cohesion: 0.12
Nodes (24): useListeningMode(), applyAiPreviewPool(), countryCacheKey(), countryCacheWith(), globeFocusId(), globeStationPool(), IntentBar(), PassportOverlay() (+16 more)

### Community 12 - "Local Provider Adapters"
Cohesion: 0.12
Nodes (10): OllamaProvider, parseSceneDescriptor(), SceneComponent, SceneComponentProps, SceneDescriptor, ScenePlayOptions, SceneStatus, SceneListener (+2 more)

### Community 13 - "Constellation Design Notes"
Cohesion: 0.12
Nodes (29): /api/now-playing-trivia, Sky Becomes Knowledge Pass, Constellation Fable Review, FIELD_DEGREE_CAP, fieldTourSpans, FIELD_TRIANGLE_CAP, GalaxyBackdrop, Golden Angle Family Fan (+21 more)

### Community 14 - "Atlas State Hooks"
Cohesion: 0.14
Nodes (9): useAtlasState(), Country, ListeningMode, PlayerCard, CONTINENT_MAP, createStationKey(), dedupeStations(), getContinent() (+1 more)

### Community 15 - "Architecture Route Map"
Cohesion: 0.12
Nodes (26): /api/ai/recommend, applyAiPreviewPool, Architecture Overview, GlobalAudioBridge, Home Route (/), JourneyBridge, journeyStore, Theater Route (/listen) (+18 more)

### Community 16 - "AI Orchestrator Core"
Cohesion: 0.12
Nodes (20): UseEventHandlersProps, aiCallStats, AiRecommendationResponse, buildRequestOptions(), CallType, fetchDescriptor(), isSceneDescriptor(), loadWorldDescriptor() (+12 more)

### Community 17 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowJs, allowSyntheticDefaultImports, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, ignoreDeprecations, isolatedModules (+16 more)

### Community 18 - "Deploy & Domains Runbooks"
Cohesion: 0.17
Nodes (24): DeepSeek V4 Flash, Remix 2 + React 18 + Tailwind Stack, Deploy Runbook, Ship Flow (test, commit, push main, vercel --prod), Post-deploy Verify Curls, elsewheremusic.com, Cloudflare DNS-only Zone, Domains Runbook (+16 more)

### Community 19 - "Particle Globe Interaction"
Cohesion: 0.13
Nodes (18): clearDispatchCache(), facingRotation(), globeHitDistance(), GlobeTurn, nearestVisiblePlace(), nextGlobePlaceIndex(), ParticleGlobe(), projectPlace() (+10 more)

### Community 20 - "Prompt Intent Extraction"
Cohesion: 0.13
Nodes (19): GENERATED_INTENT_VOCAB, catalogQueryFromPrompt(), collectMatches(), COUNTRY_KEYWORDS, extractPromptIntent(), FALLBACK_COUNTRY_KEYWORDS, FALLBACK_LANGUAGE_KEYWORDS, FALLBACK_TAG_KEYWORDS (+11 more)

### Community 21 - "Theater Field Presentation"
Cohesion: 0.12
Nodes (18): TheaterFact, fieldDensity, fieldEdgeShimmer(), fieldHopRelation(), FieldNode, FieldRelease, fieldStandingLabel(), fieldStarTwinkle() (+10 more)

### Community 22 - "Station Filter Utils"
Cohesion: 0.14
Nodes (17): createDefaultStationFilters(), deriveQualitySteps(), deriveStationFilterOptions(), extractLanguages(), extractMoods(), formatFilterLabel(), isStationFilterDirty(), normalizeToken() (+9 more)

### Community 23 - "Favorites & Journey Stamps"
Cohesion: 0.18
Nodes (14): useFavorites(), JourneyBridge(), stampInkProgress(), dropFavoriteSnapshot(), parseFavoriteSnapshots(), readText(), resolveKeptSignals(), SlimStation (+6 more)

### Community 24 - "Country Drilldown & Shelf"
Cohesion: 0.18
Nodes (15): ProbePatch, useShelfProbe(), aggregateCountryStationContext(), CountryDrilldownState, CountryStationContext, fetchCountryDrilldown(), fetchStationsByCountryLanguage(), languageChipsFromStations() (+7 more)

### Community 25 - "Package Dependencies"
Cohesion: 0.10
Nodes (20): dependencies, @chenglou/pretext, @emotion/react, framer-motion, @google/genai, isbot, @mantine/carousel, @mantine/core (+12 more)

### Community 26 - "Interpret Endpoint"
Cohesion: 0.17
Nodes (14): action(), intentFromExtractor(), interpretPrompt(), normalizeIntent(), wantsMixFromPrompt(), AiDescriptorState, AiRecommendationResponse, DescriptorStatus (+6 more)

### Community 27 - "Root Shell & Audio Bridge"
Cohesion: 0.17
Nodes (10): AtmosphereBridge(), GlobalAudioBridge(), useStationAvailabilityStore, playbackNoticeCopy(), PlaybackNoticeKind, canRetryPlayback(), getRetryDelayMs(), RECOVERABLE_REASONS (+2 more)

### Community 28 - "Hosted Provider Adapters"
Cohesion: 0.19
Nodes (9): isScenePlayOptions(), OpenRouterProvider, OpenRouterSceneResponse, dedupeStations(), extractFirstJsonObject(), normalizePreferenceList(), parseJsonObjectFromText(), stripJsonComments() (+1 more)

### Community 29 - "Station Probe Service"
Cohesion: 0.15
Nodes (15): action(), ProbeRequestStation, getCachedProbe(), getProbeCacheKey(), getProbeUrl(), probeCache, probeInFlight, probeRequest() (+7 more)

### Community 30 - "RAG Catalogue Generator"
Cohesion: 0.18
Nodes (10): Any, Response, main(), RadioBrowserCatalogueGenerator, Format a station into RAG-optimized document., Generate the complete RAG catalogue., Generate statistics about the catalogue., Find a working RadioBrowser mirror. (+2 more)

### Community 31 - "Station List Components"
Cohesion: 0.16
Nodes (12): CompactStationCardProps, CompactStationListProps, StationArtwork(), StationArtworkProps, failedArtworkUrls, INVALID_ASSET_TOKENS, isKnownFailedArtworkUrl(), markArtworkUrlFailed() (+4 more)

### Community 32 - "Atmosphere Pin System"
Cohesion: 0.27
Nodes (14): AtmospherePin(), CHOICES, AtmosphereState, useAtmosphereStore, applyAtmosphere(), Atmosphere, ATMOSPHERE_THEME_COLOR, ATMOSPHERES (+6 more)

### Community 33 - "Theater Field Simulation"
Cohesion: 0.12
Nodes (17): fieldBirthBloom(), fieldBirthRipple(), fieldGraphPulse(), fieldKnowledgeEdges(), fieldNodesFromReleases(), fieldPoint, fieldTourRank(), fieldTourSpans() (+9 more)

### Community 34 - "Session Handoff Log"
Cohesion: 0.17
Nodes (17): POST /api/ai/dispatch, useRoom Hook, Session Handoff, Flow Audit Passes, Intent Echo Feature, Night Desk Byline, Parallel Agent Dispatch Worktrees, queryRef Staleness Guard (+9 more)

### Community 35 - "Prompt Enhancement Spec"
Cohesion: 0.15
Nodes (17): Scene Animation Cues, Card Stack Experience, AI Prompt Enhancement Notes, GeminiProvider.ts, OllamaProvider.ts, OpenAIProvider.ts, OpenRouterProvider.ts, Preview-on-hover Playback Strategy (+9 more)

### Community 36 - "Dev Dependencies"
Cohesion: 0.12
Nodes (17): devDependencies, autoprefixer, eslint, eslint-plugin-react-hooks, @playwright/test, postcss, @remix-run/dev, tailwindcss (+9 more)

### Community 37 - "OG Share Card Content"
Cohesion: 0.16
Nodes (17): Coverline: 'You Are Not Here.', Deck Line: Live Radio From Cities Awake Without You, Foil-Ringed Earth Limb With City Lights, Elsewhere Product Brand, Eyebrow Line: Live Radio - Someone Else's Now, Elsewhere Favicon Seal (public/elsewhere-favicon.svg), Foot Line: Stay Long Enough To Be Stamped, GalaxyBackdrop Component (+9 more)

### Community 38 - "Backdrop Sky Rendering"
Cohesion: 0.19
Nodes (15): GalaxyBackdrop(), HOME_SKY_SEED, tintOf(), createRng(), fieldDust(), fieldDustAlpha(), fieldDustPoint(), fieldDustTwinkle() (+7 more)

### Community 39 - "Zustand Lite Shim"
Cohesion: 0.12
Nodes (12): EqualityChecker, GetState, pendingRehydrations, PersistOptions, PersistStorage, Selector, SetState, StateCreator (+4 more)

### Community 40 - "Design Specs & Changelog"
Cohesion: 0.17
Nodes (15): Day / Night Room, Changelog, elsewheremusic.com Domain Cutover, Galaxy Night Backdrop, Mantine Removal, Banned Words, Design Specs, Lacquer #C73A3A (+7 more)

### Community 41 - "Zustand Library Types"
Cohesion: 0.15
Nodes (10): GetState, Listener, PartialState, SetState, StateCreator, StoreApi, Subscribe, UseStore (+2 more)

### Community 42 - "Pretext Text Layout"
Cohesion: 0.22
Nodes (11): PretextMeasuredText(), PretextMeasuredTextProps, fitsPretextWidth(), getPretextLineCount(), getPretextLines(), getPretextTightWidth(), preparedCache, preparedKey() (+3 more)

### Community 43 - "Dispatch Endpoint"
Cohesion: 0.32
Nodes (10): action(), dispatchCache, normalizeDispatch(), readDispatch(), rememberDispatch(), writePlaceDispatch(), DispatchRequest, PlaceDispatch (+2 more)

### Community 44 - "Header Brand Bar"
Cohesion: 0.19
Nodes (6): SiteBar(), BRAND, BrandPalette, homeWithPassportHref(), SignalMarkProps, SignalWordmark()

### Community 45 - "Station Rows & Stamps"
Cohesion: 0.31
Nodes (10): stampForContinuousSession(), StationArt(), stationLocation(), stationPlaceLine(), StationRow(), stationTelemetry(), tidyPlace(), isStampReady() (+2 more)

### Community 46 - "Player Store Queue"
Cohesion: 0.18
Nodes (8): INVALID_STREAM_TOKENS, PlayerState, StartStationOptions, QueueSourceContext, QueueSourceType, createDirectQueueSession(), createQueueSession(), QueueSessionInput

### Community 47 - "Colophon Card Artwork"
Cohesion: 0.29
Nodes (12): Figure on About 'The room' Page, Elsewhere Colophon Card, Dusk Grain Field, Sun-at-Horizon Dusk Motif, Foil Brass Gold (BRAND.foil), Brass Foil Horizon Rule, Lacquer-Red Sun Disc, Shadow Notch on Disc Limb (+4 more)

### Community 48 - "Vendored Zustand Runtime"
Cohesion: 0.17
Nodes (9): EqualityChecker, GetState, Listener, PartialState, Selector, SetState, StateCreator, StoreApi (+1 more)

### Community 49 - "AI Pipeline Rules Doc"
Cohesion: 0.24
Nodes (11): build_intent_vocabulary.py, Current AI Pipeline Runbook, Gemini 2.5 Flash, generatedVocabulary.ts, getProvider(), Heuristics LiteLLM Gateway, Never Invent ICY Titles, No AI on the Audio Path (+3 more)

### Community 50 - "Globe Place Coordinates"
Cohesion: 0.22
Nodes (9): buildGlobePlaces(), COUNTRY_CENTROIDS, COUNTRY_NAME_TO_ISO, countryCentroid(), GlobeCoords, GlobeCoordSource, isoFromCountry(), stationGlobeCoords() (+1 more)

### Community 51 - "Signal Field Canvas"
Cohesion: 0.24
Nodes (7): createNotes(), createParticles(), getNoteCount(), getParticleCount(), Note, NOTE_GLYPHS, Particle

### Community 52 - "Heuristics Provider"
Cohesion: 0.33
Nodes (6): HeuristicsProvider, HeuristicsSceneResponse, filterStationCandidates(), buildStationContext(), fetchAndFilter(), fetchStationsForIntent()

### Community 53 - "PWA Manifest"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 54 - "Pretext Hero Insights"
Cohesion: 0.31
Nodes (9): Pretext Hero Insights, Elastic Headline Surface, HeroSection.tsx, Hero Hydration Mismatch, Drifting Insight Cloud, Pretext Layout Engine, pretextLayout.ts, useNowPlayingMetadata (+1 more)

### Community 55 - "Legacy App Icon"
Cohesion: 0.28
Nodes (9): Favicon / PWA App Icon Usage, Elsewhere App Icon (icon.png), Circular Seal Medallion Composition, Deep Navy and Gold Palette, Elsewhere (formerly Radio Passport) Brand Identity, Legacy Unreferenced Design Asset, Live Web Radio Broadcasting, Possible Ring Inscription or Lettering (+1 more)

### Community 56 - "Brand Mark Assets"
Cohesion: 0.33
Nodes (9): App Icon Role (favicon + apple-touch-icon), Elsewhere Brand Mark (512x512 JPEG), About Colophon Image (/elsewhere-colophon.jpg), Elsewhere (web radio app, formerly Radio Passport), Elsewhere Favicon SVG (vector seal, foil ring + lacquer disc on ink), Header Wordmark Lockup (LIVE RADIO + Elsewhere), Foil Ring + Lacquer Disc Seal Glyph, SignalMark React Component (header brand mark renderer) (+1 more)

### Community 57 - "Language Utilities"
Cohesion: 0.33
Nodes (6): stationSpeaksLanguage(), LANGUAGE_ALIASES, mapLanguageToken(), normalizeLanguages(), normalizeTokenKey(), stripLanguagePrefix()

### Community 58 - "Intent Vocabulary Builder"
Cohesion: 0.44
Nodes (8): aggregate_aliases(), build_country_map(), build_language_map(), build_tag_map(), fetch_catalog(), main(), title_case(), write_typescript()

### Community 59 - "Player Notices & UI Store"
Cohesion: 0.22
Nodes (6): PlayerNotice, PlayerNoticeKind, PlayerNoticeState, UIState, useUIStore, create

### Community 60 - "Station Color Extraction"
Cohesion: 0.28
Nodes (5): detectGenre(), ExtractedColors, GENRE_PALETTES, getGenrePalette(), getStationColors()

### Community 62 - "UI Flow Rules"
Cohesion: 0.25
Nodes (8): POST /api/ai/interpret, extractPromptIntent, .ew-horizon Hour Stops, Every Empty State Offers a Next Step, UI Flow, Empty State Names the Next Move, Intent Bar, Solar Hour Filter

### Community 63 - "Favicon Seal Mark"
Cohesion: 0.32
Nodes (8): Elsewhere Brand Identity, Dark Ground Field (#0C0B09), Gold Orbit Ring (#C6A56A, r=11 stroke), On-Air Live Dot Convention, Elsewhere Favicon Mark, 'You Are Not Here' Inverted Map Marker, Passport Stamp Ring Motif, Red Center Dot (#C73A3A, r=4.5 fill)

### Community 64 - "Field Graph Geometry"
Cohesion: 0.29
Nodes (8): fieldDensestPoint(), fieldDistance(), fieldEdges(), fieldFamiliesConnect(), fieldReachForPair(), fieldSemanticEdges(), fieldSpanEdges(), fieldTriangles()

### Community 65 - "Speech Recognition Typings"
Cohesion: 0.25
Nodes (7): SpeechRecognition, SpeechRecognitionAlternative, SpeechRecognitionErrorEvent, SpeechRecognitionEvent, SpeechRecognitionResult, SpeechRecognitionResultList, Window

### Community 66 - "Station Availability Store"
Cohesion: 0.25
Nodes (6): availabilityStorage, isStationTemporarilyUnavailable(), StationAvailabilityState, StationFailure, StationFailureReason, persist()

### Community 67 - "Trivia Graph Types"
Cohesion: 0.25
Nodes (7): TrackTriviaResponse, TriviaFact, TriviaGraph, TriviaGraphEdge, TriviaGraphKind, TriviaGraphNode, TriviaLink

### Community 68 - "Package Metadata"
Cohesion: 0.29
Nodes (6): engines, node, name, private, sideEffects, type

### Community 69 - "NPM Scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, start, test, typecheck

### Community 70 - "404 Wallpaper Asset"
Cohesion: 0.38
Nodes (7): 404 Wallpaper Role (Preserved Asset), Lost / Off-the-Map Wayfinding Mood, Night Atmosphere Lock on 404, 404 NotFoundEasterEgg Surface, Hard-Rule Preservation Rationale, 128px Vertical Repeating Tile Strip, FTS.jpeg 404 Wallpaper

### Community 71 - "Zen Hero Banner"
Cohesion: 0.43
Nodes (7): Listening Zen Hero Banner, Dusk Gradient Palette, Gold Glow with Concentric Rings, Setting Sun Reading of the Gold Glow, Horizon Signal Waves, Rounded Stamp Frame, Zen Listening Mood

### Community 72 - "Atlas Hero Artwork"
Cohesion: 0.38
Nodes (7): Pretext Atlas Hero Artwork, Atlas Heatmap Panel Backdrop, Atlas Overlay Feature, Global Listening Atmosphere, Pretext Homepage Hero Experiment, Pretext Typography System, World Map Motif

### Community 74 - "Heritage Radio Passport Logo"
Cohesion: 0.60
Nodes (5): Elsewhere web radio app, RPLOGO - Radio Passport Legacy Logo, Passport stamp / emblem motif, PASSPORT wordmark, Radio Passport (heritage brand)

### Community 75 - "Shelf Reason Cache"
Cohesion: 0.50
Nodes (4): buildAiShelfReason(), buildCacheKey(), reasonCache, ShelfReasonInput

### Community 76 - "Server Entry Handlers"
Cohesion: 0.83
Nodes (3): handleBotRequest(), handleBrowserRequest(), handleRequest()

### Community 79 - "Halftone Grain Texture"
Cohesion: 0.83
Nodes (3): grainPath(), grainRect(), inkTile()

### Community 80 - "Atlas AI Prompt Tests"
Cohesion: 0.67
Nodes (3): runTests(), TEST_PROMPTS, testPrompt()

### Community 81 - "OpenRouter Rec Tests"
Cohesion: 0.67
Nodes (3): main(), testPrompts, testRecommendation()

### Community 82 - "OpenRouter Model Tests"
Cohesion: 0.67
Nodes (3): MODELS, runTests(), testModel()

## Ambiguous Edges - Review These
- `OG Social Card Still (1200x630 HTML)` → `docs/DOMAINS.md Domain Table`  [AMBIGUOUS]
  scripts/og-still.html · relation: references
- `Type System (Sora display, Plex Mono telemetry)` → `OG Still Brand Palette (night-earth washes)`  [AMBIGUOUS]
  scripts/og-still.html · relation: conceptually_related_to
- `Elsewhere App Icon (icon.png)` → `Possible Ring Inscription or Lettering`  [AMBIGUOUS]
  icon.png · relation: references
- `Favicon / PWA App Icon Usage` → `Legacy Unreferenced Design Asset`  [AMBIGUOUS]
  icon.png · relation: conceptually_related_to
- `Elsewhere Colophon Card` → `Passport-Stamp Seal Gesture`  [AMBIGUOUS]
  public/elsewhere-colophon.jpg · relation: semantically_similar_to
- `Shadow Notch on Disc Limb` → `Sun-at-Horizon Dusk Motif`  [AMBIGUOUS]
  public/elsewhere-colophon.jpg · relation: conceptually_related_to
- `Elsewhere Brand Mark (512x512 JPEG)` → `Station Plate Fallback (mark shown when Radio Browser sent no art)`  [AMBIGUOUS]
  public/elsewhere-mark.jpg · relation: conceptually_related_to
- `Gold Glow with Concentric Rings` → `Setting Sun Reading of the Gold Glow`  [AMBIGUOUS]
  public/listening-zen-hero.svg · relation: semantically_similar_to
- `Pretext Atlas Hero Artwork` → `World Map Motif`  [AMBIGUOUS]
  public/pretext-atlas-hero.png · relation: conceptually_related_to

## Knowledge Gaps
- **357 isolated node(s):** `dispatchCache`, `LANGUAGE_CODE_TO_NAME`, `BASE_STATIONS`, `MockSceneDefinition`, `RecommendRequest` (+352 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `OG Social Card Still (1200x630 HTML)` and `docs/DOMAINS.md Domain Table`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Type System (Sora display, Plex Mono telemetry)` and `OG Still Brand Palette (night-earth washes)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Elsewhere App Icon (icon.png)` and `Possible Ring Inscription or Lettering`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Favicon / PWA App Icon Usage` and `Legacy Unreferenced Design Asset`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Elsewhere Colophon Card` and `Passport-Stamp Seal Gesture`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Shadow Notch on Disc Limb` and `Sun-at-Horizon Dusk Motif`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Elsewhere Brand Mark (512x512 JPEG)` and `Station Plate Fallback (mark shown when Radio Browser sent no art)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._