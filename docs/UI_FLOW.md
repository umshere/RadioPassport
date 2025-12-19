# 🌊 User Journey & UI Flow Documentation

This document provides a comprehensive visual guide to understanding how users interact with Radio Passport, from landing to playing stations, including all API calls, data flows, and component interactions.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [User Journey Map](#user-journey-map)
3. [Route Architecture](#route-architecture)
4. [API Call Flows](#api-call-flows)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [State Management](#state-management)
7. [Component Hierarchy](#component-hierarchy)

---

## Overview

Radio Passport operates on two primary modes:
- **🌍 Atlas Mode** (`/` route): Traditional country/station browsing
- **🎨 World Mode** (`/world/*` routes): AI-powered immersive experiences

---

## 🗺️ User Journey Map

### Journey 1: Atlas Mode (Traditional Browse)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER LANDS ON /                                  │
│                    (Radio Passport Homepage)                             │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LOADER EXECUTES (Server-Side)                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ 1. Parse URL query params                                       │    │
│  │    - ?country=<country> (if present)                            │    │
│  │    - ?q=<search> (if present)                                   │    │
│  │                                                                  │    │
│  │ 2. API CALL: Radio Browser - Get Countries                      │    │
│  │    GET https://de2.api.radio-browser.info/json/countries        │    │
│  │    Returns: Array<{name, iso_3166_1, stationcount}>             │    │
│  │                                                                  │    │
│  │ 3. IF country param exists:                                     │    │
│  │    API CALL: Radio Browser - Get Stations by Country            │    │
│  │    GET /json/stations/bycountry/{country}                       │    │
│  │        ?limit=100&hidebroken=true                               │    │
│  │        &order=clickcount&reverse=true                           │    │
│  │    Returns: Array<Station> (raw from Radio Browser)             │    │
│  │                                                                  │    │
│  │ 4. Normalize & Rank Stations                                    │    │
│  │    - normalizeStations(): Clean & standardize data              │    │
│  │    - rankStations(): Apply scoring algorithm                    │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Returns: { countries, stations, selectedCountry }                      │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CLIENT RENDERS                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  ┌──────────────────────────────────────────────────────┐      │    │
│  │  │ HeroSection                                           │      │    │
│  │  │ - Branding + Search Bar                              │      │    │
│  │  └──────────────────────────────────────────────────────┘      │    │
│  │  ┌──────────────────────────────────────────────────────┐      │    │
│  │  │ AtlasGrid (Passport Stamp Grid)                      │      │    │
│  │  │ - Maps countries to PassportStamp components         │      │    │
│  │  │ - Displays stationcount per country                  │      │    │
│  │  │ - Client-side search filtering                       │      │    │
│  │  └──────────────────────────────────────────────────────┘      │    │
│  │  ┌──────────────────────────────────────────────────────┐      │    │
│  │  │ PlayerDock (Fixed Bottom)                            │      │    │
│  │  │ - Connected to playerStore (Zustand)                 │      │    │
│  │  │ - Shows nowPlaying station                           │      │    │
│  │  │ - Playback controls                                  │      │    │
│  │  └──────────────────────────────────────────────────────┘      │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
          ┌───────────┴────────────┐
          │                        │
    User Clicks         User Types in Search
    Country Stamp            Bar
          │                        │
          ▼                        ▼
┌─────────────────┐      ┌──────────────────┐
│ Navigate to     │      │ Client-side      │
│ ?country=Brazil │      │ Filter countries │
└────────┬────────┘      └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LOADER RE-EXECUTES (with country param)                                │
│  1. Fetches countries again (cached by CDN)                             │
│  2. Fetches stations for Brazil                                         │
│  3. Normalizes & Ranks                                                  │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CLIENT RENDERS COUNTRY VIEW                                            │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ CountryOverview                                                 │    │
│  │ - Shows country details & stats                                │    │
│  │ - Back button to atlas                                         │    │
│  └────────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ StationFiltersPanel (Optional)                                  │    │
│  │ - Language, genre, codec filters                               │    │
│  └────────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ StationGrid                                                     │    │
│  │ - Maps filtered stations to StationCard components             │    │
│  │ - Shows station metadata (bitrate, tags, health)               │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
                      │ User clicks Play on Station Card
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PLAYBACK INITIATED                                                     │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ playerStore.startStation(station, { autoPlay: true })          │    │
│  │  1. Sets nowPlaying = station                                  │    │
│  │  2. Updates queue if preserveQueue=false                       │    │
│  │  3. audioElement.src = station.streamUrl                       │    │
│  │  4. audioElement.play()                                        │    │
│  │  5. Triggers PlayerDock re-render                              │    │
│  │  6. Saves to localStorage (recent stations)                    │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Journey 2: World Mode (AI-Powered Discovery)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   USER NAVIGATES TO /world/atlas                        │
│                     (or /world/cards, /world/globe)                     │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LOADER EXECUTES                                                        │
│  1. Extracts sceneId from URL params (atlas/cards/globe)                │
│  2. Validates scene exists                                              │
│  3. Returns: { scene: SceneMeta, scenes: SceneMeta[] }                  │
│  NO API CALLS YET - Waiting for user prompt                             │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CLIENT RENDERS WORLD INTERFACE                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ JourneyComposer                                                 │    │
│  │ - Text input for AI prompts                                    │    │
│  │ - Scene switcher tabs (Cards/Atlas/Globe)                      │    │
│  │ - Optional VoiceInput component                                │    │
│  └────────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ Empty State / Previous Scene (if exists)                        │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
                      │ User enters: "psychedelic jazz from Brazil"
                      │ User clicks Submit or presses Enter
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  AI RECOMMENDATION FLOW STARTS                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ fetcher.submit() → POST /api/ai/recommend                      │    │
│  │                                                                  │    │
│  │ FormData includes:                                              │    │
│  │  - prompt: "psychedelic jazz from Brazil"                      │    │
│  │  - visual: "atlas"                                             │    │
│  │  - scene: "atlas"                                              │    │
│  │  - sceneId: "atlas"                                            │    │
│  │  - currentStationId: <uuid> (if playing)                       │    │
│  │  - country: <currentCountry> (if listening)                    │    │
│  │  - language: <currentLanguage>                                 │    │
│  │  - favoriteStationIds[]: <array of UUIDs>                      │    │
│  │  - recentStationIds[]: <array of UUIDs>                        │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SERVER ACTION: /api/ai/recommend                                       │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ STEP 1: Parse FormData                                          │    │
│  │  - Extract prompt, visual, context parameters                  │    │
│  │  - Build IntentMeta from prompt                                │    │
│  │                                                                  │    │
│  │ STEP 2: Extract Intent from Prompt                              │    │
│  │  Function: extractPromptIntent(prompt)                          │    │
│  │  - Parses keywords for genre, mood, country                    │    │
│  │  - Extracts structured intent metadata                         │    │
│  │  Returns: IntentMeta {                                          │    │
│  │    genres: ["psychedelic", "jazz"],                            │    │
│  │    moods: [],                                                  │    │
│  │    countries: ["Brazil"],                                      │    │
│  │    languages: []                                               │    │
│  │  }                                                             │    │
│  │                                                                  │    │
│  │ STEP 3: Fetch Candidate Stations                                │    │
│  │  API CALL: Radio Browser                                        │    │
│  │                                                                  │    │
│  │  Strategy 1: Country-specific search                            │    │
│  │    GET /json/stations/bycountry/Brazil                         │    │
│  │        ?limit=500&hidebroken=true                              │    │
│  │                                                                  │    │
│  │  Strategy 2: Tag-based search (fallback)                        │    │
│  │    GET /json/stations/bytag/jazz                               │    │
│  │        ?limit=500&hidebroken=true                              │    │
│  │                                                                  │    │
│  │  Returns: ~500 raw stations                                    │    │
│  │                                                                  │    │
│  │ STEP 4: Filter & Score Candidates                               │    │
│  │  Function: filterStationCandidates()                            │    │
│  │  - Removes stations with bad health signals                    │    │
│  │  - Filters by intent (genres, country match)                   │    │
│  │  - Excludes disliked stations                                  │    │
│  │                                                                  │    │
│  │  Function: rankStations(stations, intentMeta)                   │    │
│  │  - Score algorithm considers:                                  │    │
│  │    * Genre/tag match weight                                    │    │
│  │    * Country exact match boost                                 │    │
│  │    * Click count (popularity)                                  │    │
│  │    * Bitrate quality                                           │    │
│  │    * lastCheckOk status                                        │    │
│  │    * Recent station penalty (diversity)                        │    │
│  │    * Favorite station boost                                    │    │
│  │  - Sorts by final score DESC                                   │    │
│  │                                                                  │    │
│  │  Function: annotateHealth(stations)                             │    │
│  │  - Adds health metadata to each station                        │    │
│  │  - Marks suspicious/unreliable streams                         │    │
│  │                                                                  │    │
│  │ STEP 5: AI Provider Decision (if USE_MOCK=false)                │    │
│  │  IF real AI enabled:                                            │    │
│  │    Provider: getProvider() → OpenAI/Anthropic/etc.             │    │
│  │    API CALL: LLM Provider                                       │    │
│  │      - Sends top 50 stations to LLM                            │    │
│  │      - Prompt includes intent & context                        │    │
│  │      - LLM selects best 8-12 stations                          │    │
│  │      - LLM generates narrative (reason, mood)                  │    │
│  │  ELSE (USE_MOCK=true):                                          │    │
│  │    - Returns top-ranked stations directly                      │    │
│  │    - Generates mock narrative                                  │    │
│  │                                                                  │    │
│  │ STEP 6: Build SceneDescriptor                                   │    │
│  │  SceneDescriptor {                                              │    │
│  │    visual: "atlas",                                            │    │
│  │    mood: "adventurous",                                        │    │
│  │    animation: "fade",                                          │    │
│  │    play: "sequence",                                           │    │
│  │    stations: [...8-12 curated stations],                       │    │
│  │    reason: "AI narrative explaining selection"                 │    │
│  │  }                                                             │    │
│  │                                                                  │    │
│  │ STEP 7: Return Response                                         │    │
│  │  json({ descriptor: SceneDescriptor })                         │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CLIENT RECEIVES DESCRIPTOR                                             │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ fetcher.data = { descriptor }                                  │    │
│  │                                                                  │    │
│  │ useEffect triggers:                                             │    │
│  │  1. setDescriptor(fetcher.data.descriptor)                     │    │
│  │  2. setStampKey(Date.now()) → triggers animation               │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SCENE RENDERS WITH DESCRIPTOR                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ SceneManager receives descriptor                                │    │
│  │  - Lazy loads visual component (atlas/cards/globe)             │    │
│  │  - Passes stations array to scene                              │    │
│  │                                                                  │    │
│  │ IF visual="atlas":                                              │    │
│  │   → Renders AtlasScene with stations                           │    │
│  │   → Shows stations on interactive heatmap                      │    │
│  │                                                                  │    │
│  │ IF visual="card_stack":                                         │    │
│  │   → Renders CardStackScene                                     │    │
│  │   → Shows story cards for each station                         │    │
│  │                                                                  │    │
│  │ IF visual="3d_globe":                                           │    │
│  │   → Renders 3DGlobeScene                                       │    │
│  │   → Plots stations on rotating Earth                           │    │
│  │                                                                  │    │
│  │ WhyTheseChip component:                                         │    │
│  │  - Displays descriptor.reason as explainability tooltip        │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
                      │ User clicks a station in the scene
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PLAYBACK INITIATED VIA SCENE                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ handleStationSelect(station)                                    │    │
│  │  → playerStore.startStation(station, { autoPlay: true })       │    │
│  │                                                                  │    │
│  │ playerStore applies playback strategy:                          │    │
│  │  - play="sequence": Queues all stations, plays in order        │    │
│  │  - play="random": Shuffles queue                               │    │
│  │  - play="single": Plays selected station only                  │    │
│  │                                                                  │    │
│  │ PlayerDock updates to show nowPlaying                           │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Route Architecture

### Route Mapping Table

| Route | Purpose | Loader APIs | Key Components |
|-------|---------|-------------|----------------|
| `/` | Atlas Mode homepage | Radio Browser: countries, stations by country | HeroSection, AtlasGrid, CountryOverview, StationGrid, PlayerDock |
| `/world/_index` | World Mode redirect | None | Redirects to `/world/cards` |
| `/world/atlas` | AI-powered Atlas scene | None (waits for user prompt) | JourneyComposer, SceneManager, AtlasScene |
| `/world/cards` | AI-powered Card Stack | None (waits for user prompt) | JourneyComposer, SceneManager, CardStackScene |
| `/world/globe` | AI-powered 3D Globe | None (waits for user prompt) | JourneyComposer, SceneManager, 3DGlobeScene |
| `/world/:sceneId` | Dynamic scene loader | Scene validation | SceneManager, dynamic scene component |
| `/api/ai/recommend` | AI recommendation API | Radio Browser + LLM Provider | Server-only |
| `/api/radio-catalog` | Radio catalog snapshot | Radio Browser catalog | Server-only |
| `/about` | About page | None | Static content |

---

## 🔌 API Call Flows

### API Interaction Diagram

```
┌──────────────┐
│   Browser    │
│   (Client)   │
└──────┬───────┘
       │
       │ [Atlas Mode]
       │ User selects country "Brazil"
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Remix Loader (/_index.tsx)                                      │
│  Server-Side                                                     │
└──────┬───────────────────────────────────────────────────────────┘
       │
       │ API Call 1: Get Countries
       ▼
┌───────────────────────────────────────┐
│  Radio Browser API                    │
│  https://de2.api.radio-browser.info   │
│                                       │
│  GET /json/countries                  │
│                                       │
│  Response:                            │
│  [                                    │
│    {                                  │
│      name: "Brazil",                  │
│      iso_3166_1: "BR",                │
│      stationcount: 1523               │
│    },                                 │
│    ...                                │
│  ]                                    │
└───────────────────────────────────────┘
       │
       │ API Call 2: Get Stations
       ▼
┌───────────────────────────────────────┐
│  Radio Browser API                    │
│                                       │
│  GET /json/stations/bycountry/Brazil  │
│      ?limit=100                       │
│      &hidebroken=true                 │
│      &order=clickcount                │
│      &reverse=true                    │
│                                       │
│  Response:                            │
│  [                                    │
│    {                                  │
│      stationuuid: "abc-123",          │
│      name: "Radio Brasil FM",         │
│      url: "https://stream.url",       │
│      url_resolved: "https://...",     │
│      homepage: "https://...",         │
│      favicon: "https://...",          │
│      tags: "pop,brazil,music",        │
│      country: "Brazil",               │
│      countrycode: "BR",               │
│      language: "Portuguese",          │
│      votes: 152,                      │
│      clickcount: 8234,                │
│      bitrate: 128,                    │
│      codec: "MP3",                    │
│      lastcheckok: 1,                  │
│      ...                              │
│    },                                 │
│    ...                                │
│  ]                                    │
└───────────────────────────────────────┘
       │
       │ Data Processing
       │ 1. normalizeStations()
       │ 2. rankStations()
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Returns to Client:                                              │
│  {                                                               │
│    countries: Country[],                                         │
│    stations: Station[] (processed & ranked),                     │
│    selectedCountry: "Brazil"                                     │
│  }                                                               │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│   Browser    │
│   Renders    │
│   UI         │
└──────────────┘


═══════════════════════════════════════════════════════════════════


┌──────────────┐
│   Browser    │
│   (Client)   │
└──────┬───────┘
       │
       │ [World Mode]
       │ User submits: "psychedelic jazz from Brazil"
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Remix Action (POST /api/ai/recommend)                           │
│  Server-Side                                                     │
└──────┬───────────────────────────────────────────────────────────┘
       │
       │ Step 1: Extract Intent
       │ extractPromptIntent("psychedelic jazz from Brazil")
       │ → { genres: ["psychedelic", "jazz"], countries: ["Brazil"] }
       │
       │ Step 2: Fetch Candidates
       ▼
┌───────────────────────────────────────┐
│  Radio Browser API                    │
│                                       │
│  GET /json/stations/bycountry/Brazil  │
│      ?limit=500                       │
│      &hidebroken=true                 │
│                                       │
│  Response: 500+ Brazilian stations    │
└───────────────────────────────────────┘
       │
       │ Step 3: Filter & Rank
       │ - filterStationCandidates()
       │ - rankStations() with intent weights
       │ - annotateHealth()
       │ Result: Top 50 stations
       │
       │ Step 4: AI Selection (if enabled)
       ▼
┌───────────────────────────────────────┐
│  LLM Provider (OpenAI/Anthropic/etc.) │
│                                       │
│  POST /v1/chat/completions            │
│                                       │
│  Payload:                             │
│  {                                    │
│    prompt: "Select best stations...", │
│    stations: [top 50],                │
│    intent: {                          │
│      genres: ["psychedelic", "jazz"], │
│      countries: ["Brazil"]            │
│    }                                  │
│  }                                    │
│                                       │
│  Response:                            │
│  {                                    │
│    selectedStations: [8-12 stations], │
│    narrative: "Journey through...",   │
│    mood: "adventurous"                │
│  }                                    │
└───────────────────────────────────────┘
       │
       │ Step 5: Build Scene Descriptor
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Returns to Client:                                              │
│  {                                                               │
│    descriptor: {                                                 │
│      visual: "atlas",                                            │
│      mood: "adventurous",                                        │
│      animation: "fade",                                          │
│      play: "sequence",                                           │
│      stations: [...12 stations with metadata],                   │
│      reason: "Journey through psychedelic jazz..."               │
│    }                                                             │
│  }                                                               │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│   Browser    │
│   Renders    │
│   Scene      │
└──────────────┘
```

---

## 📊 Data Flow Diagrams

### Station Data Transformation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DATA TRANSFORMATION PIPELINE                         │
└─────────────────────────────────────────────────────────────────────────┘

Step 1: RAW DATA from Radio Browser API
┌────────────────────────────────────────────────────────────────────┐
│ {                                                                   │
│   changeuuid: "...",                                               │
│   stationuuid: "abc-123-def-456",                                  │
│   name: "Radio Brasil FM",                                         │
│   url: "http://stream.radiobrasil.com:8000/stream",               │
│   url_resolved: "http://stream.radiobrasil.com:8000/stream",       │
│   homepage: "http://radiobrasil.com",                              │
│   favicon: "http://radiobrasil.com/favicon.png",                   │
│   tags: "pop,brazil,music,hits",                                   │
│   country: "Brazil",                                               │
│   countrycode: "BR",                                               │
│   state: "São Paulo",                                              │
│   language: "portuguese",                                          │
│   languagecodes: "pt",                                             │
│   votes: 152,                                                      │
│   lastchangetime: "2024-01-15 10:30:00",                           │
│   lastchangetime_iso8601: "2024-01-15T10:30:00Z",                  │
│   codec: "MP3",                                                    │
│   bitrate: 128,                                                    │
│   hls: 0,                                                          │
│   lastcheckok: 1,                                                  │
│   lastchecktime: "2024-12-18 08:00:00",                            │
│   lastcheckoktime: "2024-12-18 08:00:00",                          │
│   lastlocalchecktime: "2024-12-18 08:00:00",                       │
│   clicktimestamp: "2024-12-18 09:15:00",                           │
│   clickcount: 8234,                                                │
│   clicktrend: 45,                                                  │
│   ssl_error: 0,                                                    │
│   geo_lat: -23.550,                                                │
│   geo_long: -46.633                                                │
│ }                                                                  │
└────────────────────────────────────────────────────────────────────┘
                            │
                            │ normalizeStations()
                            │ (app/utils/stations.ts)
                            ▼
Step 2: NORMALIZED Station Object
┌────────────────────────────────────────────────────────────────────┐
│ {                                                                   │
│   uuid: "abc-123-def-456",                    // Renamed            │
│   name: "Radio Brasil FM",                    // Cleaned            │
│   url: "http://stream.radiobrasil.com:8000",  // Base URL           │
│   streamUrl: "http://stream...stream",        // url_resolved       │
│   favicon: "http://radiobrasil.com/favicon",  // Validated          │
│   country: "Brazil",                          // Standardized       │
│   countryCode: "BR",                          // Camel case         │
│   state: "São Paulo",                                              │
│   language: "Portuguese",                     // Capitalized        │
│   languageCodes: ["pt"],                      // Array              │
│   tags: "pop,brazil,music,hits",              // Cleaned            │
│   tagList: ["pop", "brazil", "music", "hits"],// Parsed array       │
│   bitrate: 128,                                                    │
│   codec: "mp3",                               // Lowercase          │
│   homepage: "http://radiobrasil.com",                              │
│   hls: false,                                 // Boolean            │
│   lastCheckOk: true,                          // Boolean            │
│   lastCheckOkTime: "2024-12-18T08:00:00Z",    // ISO format         │
│   lastCheckTime: "2024-12-18T08:00:00Z",                           │
│   lastLocalCheckTime: "2024-12-18T08:00:00Z",                      │
│   sslError: false,                            // Boolean            │
│   votes: 152,                                                      │
│   clickCount: 8234,                           // Camel case         │
│   clickTrend: 45                              // Camel case         │
│ }                                                                  │
└────────────────────────────────────────────────────────────────────┘
                            │
                            │ rankStations(stations, intentMeta?)
                            │ (server/stations/ranking.ts)
                            ▼
Step 3: RANKED Station with Score
┌────────────────────────────────────────────────────────────────────┐
│ {                                                                   │
│   ...all normalized fields,                                        │
│   _score: 87.5,                               // NEW: Ranking score │
│   _scoreBreakdown: {                          // NEW: Debug info    │
│     baseScore: 50,                                                 │
│     genreMatchBonus: 15,                                           │
│     countryMatchBonus: 10,                                         │
│     popularityBonus: 8.5,                                          │
│     qualityBonus: 4,                                               │
│     recentPenalty: 0                                               │
│   }                                                                │
│ }                                                                  │
└────────────────────────────────────────────────────────────────────┘
                            │
                            │ annotateHealth(stations)
                            │ (server/stations/health.ts)
                            ▼
Step 4: HEALTH-ANNOTATED Station
┌────────────────────────────────────────────────────────────────────┐
│ {                                                                   │
│   ...all ranked fields,                                            │
│   _health: {                                  // NEW: Health signals│
│     score: 8.5,                               // 0-10 scale         │
│     lastCheckRecency: "recent",               // recent/stale/old   │
│     streamReliability: "high",                // high/medium/low    │
│     sslStatus: "ok",                          // ok/error/unknown   │
│     bitrateAdequate: true,                                         │
│     tags: ["verified", "stable"]                                   │
│   }                                                                │
│ }                                                                  │
└────────────────────────────────────────────────────────────────────┘
                            │
                            │ Used by UI Components
                            ▼
                ┌──────────────────────┐
                │   StationCard        │
                │   PlayerDock         │
                │   SceneManager       │
                └──────────────────────┘
```

### User Context Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USER CONTEXT AGGREGATION                          │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────┐
│ playerStore    │  │ favoritesStore │  │ recentStations │  │ uiStore    │
│ (Zustand)      │  │ (localStorage) │  │ (localStorage) │  │ (Zustand)  │
├────────────────┤  ├────────────────┤  ├────────────────┤  ├────────────┤
│ nowPlaying: {  │  │ Set<stationId> │  │ Station[]      │  │ darkMode   │
│   uuid         │  │                │  │ (max 20)       │  │ sidebarOpen│
│   country      │  │ Persisted      │  │                │  │ ...        │
│   language     │  │                │  │ Persisted      │  │            │
│   ...          │  │                │  │                │  │            │
│ }              │  │                │  │                │  │            │
│ queue: []      │  │                │  │                │  │            │
│ isPlaying      │  │                │  │                │  │            │
└────────┬───────┘  └────────┬───────┘  └────────┬───────┘  └────────────┘
         │                   │                   │
         │                   │                   │
         │      When user submits AI prompt      │
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
                             ▼
         ┌──────────────────────────────────────────────┐
         │  Context Payload for /api/ai/recommend       │
         ├──────────────────────────────────────────────┤
         │  {                                           │
         │    prompt: "user input",                     │
         │    currentStationId: playerStore.nowPlaying  │
         │    country: playerStore.nowPlaying.country   │
         │    language: playerStore.nowPlaying.language │
         │    favoriteStationIds: [...favoritesStore]   │
         │    recentStationIds: [...recentStations]     │
         │    dislikedStationIds: [] // future          │
         │  }                                           │
         └──────────────────────┬───────────────────────┘
                                │
                                ▼
                    ┌──────────────────────────┐
                    │  AI Recommendation API   │
                    │  Uses context to:        │
                    │  - Prefer similar genres │
                    │  - Boost favorites       │
                    │  - Avoid recent plays    │
                    │  - Maintain language     │
                    └──────────────────────────┘
```

---

## 🎮 State Management

### Global State Architecture

| Store | Technology | Persistence | Purpose | Key State |
|-------|------------|-------------|---------|-----------|
| `playerStore` | Zustand | localStorage (volume, queue) | Audio playback state | `nowPlaying`, `queue`, `isPlaying`, `audioElement`, `volume` |
| `favoritesStore` | Custom hook + localStorage | localStorage | User's favorited stations | `Set<stationId>`, `toggleFavorite()` |
| `recentStations` | Custom hook + localStorage | localStorage | Listening history | `Station[]` (max 20) |
| `uiStore` | Zustand | None | UI preferences | `darkMode`, `sidebarOpen`, `mobileMenuOpen` |
| `playerNoticeStore` | Zustand | None | Player notifications | `notice`, `showNotice()` |
| `stationAvailabilityStore` | Zustand | sessionStorage | Temporary unavailability tracking | `Map<stationId, timestamp>` |

### Store Interaction Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        COMPONENT LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │ PlayerDock   │  │ StationCard  │  │ SceneManager │                 │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │
└─────────┼──────────────────┼──────────────────┼────────────────────────┘
          │                  │                  │
          │ usePlayerStore() │                  │
          │                  │ startStation()   │
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼────────────────────────┐
│                         playerStore (Zustand)                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ State:                                                          │    │
│  │  - audioElement: HTMLAudioElement | null                       │    │
│  │  - nowPlaying: Station | null                                  │    │
│  │  - queue: Station[]                                            │    │
│  │  - isPlaying: boolean                                          │    │
│  │  - volume: number (0-1)                                        │    │
│  │  - currentStationIndex: number                                 │    │
│  │  - shuffleMode: boolean                                        │    │
│  │  - crossfadeMs: number                                         │    │
│  │                                                                 │    │
│  │ Actions:                                                        │    │
│  │  - startStation(station, options)                              │    │
│  │  - setNowPlaying(station)                                      │    │
│  │  - setQueue(stations)                                          │    │
│  │  - togglePlay()                                                │    │
│  │  - nextStation()                                               │    │
│  │  - previousStation()                                           │    │
│  │  - applySceneDescriptor(descriptor)                            │    │
│  └────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     │ Triggers
                                     ▼
                        ┌────────────────────────┐
                        │ Browser Audio Element  │
                        │  audioElement.src      │
                        │  audioElement.play()   │
                        │  audioElement.pause()  │
                        └────────────────────────┘
                                     │
                                     │ Events
                                     ▼
                        ┌────────────────────────┐
                        │ Audio Event Handlers   │
                        │  - onPlay              │
                        │  - onPause             │
                        │  - onEnded → next()    │
                        │  - onError → skip      │
                        └────────────────────────┘
```

---

## 🧩 Component Hierarchy

### Atlas Mode (/) Component Tree

```
_index.tsx (Route Component)
│
├─ HeroSection
│  ├─ Logo + Brand Text
│  ├─ Search Input
│  └─ Quick Actions (World Mode link)
│
├─ AtlasFilters
│  ├─ Search Bar
│  ├─ Continent Filter
│  └─ Sort Options
│
├─ AtlasGrid (if no country selected)
│  └─ PassportStamp × N countries
│     ├─ Country Flag
│     ├─ Country Name
│     ├─ Station Count Badge
│     └─ onClick → navigate(?country=X)
│
├─ CountryOverview (if country selected)
│  ├─ Country Header
│  │  ├─ Flag + Name
│  │  ├─ Stats (stations, languages)
│  │  └─ Back Button
│  │
│  ├─ StationFiltersPanel
│  │  ├─ Language Filter
│  │  ├─ Genre/Tag Filter
│  │  ├─ Codec Filter
│  │  └─ Quality Filter
│  │
│  ├─ StationFilterQuickBar
│  │  └─ Active Filters Chips
│  │
│  └─ StationGrid
│     └─ StationCard × N stations
│        ├─ Station Logo/Favicon
│        ├─ Station Name
│        ├─ Metadata (bitrate, codec, language)
│        ├─ Tags
│        ├─ Health Indicator
│        ├─ Play Button
│        ├─ Favorite Button (heart)
│        └─ onClick → playerStore.startStation()
│
├─ QuickRetuneWidget (floating)
│  ├─ Recent Stations Carousel
│  └─ Quick Access Buttons
│
├─ PlayerDock (fixed bottom)
│  ├─ PremiumPlayerDock (desktop)
│  │  ├─ Album Art / Station Logo
│  │  ├─ Station Info (name, country)
│  │  ├─ Playback Controls
│  │  │  ├─ Previous
│  │  │  ├─ Play/Pause
│  │  │  └─ Next
│  │  ├─ Progress Bar
│  │  ├─ Volume Control
│  │  └─ Queue Button
│  │
│  └─ CompactPlayerDock (mobile)
│     ├─ Mini Info
│     ├─ Play/Pause
│     └─ Expand Button
│
├─ MobileTabBar (mobile only)
│  ├─ Home Tab
│  ├─ World Tab
│  ├─ Favorites Tab
│  └─ More Tab
│
└─ Footer
   ├─ Links
   ├─ Credits
   └─ Social Links
```

### World Mode (/world/:sceneId) Component Tree

```
world.$sceneId.tsx (Route Component)
│
├─ JourneyComposer
│  ├─ Scene Tabs
│  │  ├─ Cards Tab
│  │  ├─ Atlas Tab
│  │  └─ Globe Tab
│  │
│  ├─ Prompt Input
│  │  ├─ Text Field
│  │  ├─ Submit Button
│  │  └─ VoiceInput (optional)
│  │
│  └─ Context Info
│     ├─ Current Station Chip
│     └─ Favorites Count
│
├─ Loading State (if fetching)
│  ├─ Spinner
│  ├─ Loading Hints Carousel
│  └─ Progress Indicators
│
├─ SceneManager (receives descriptor)
│  │
│  ├─ IF visual="atlas" → AtlasScene
│  │  ├─ AtlasHeatmap
│  │  │  └─ Station Markers × N
│  │  │     ├─ onClick → handleStationSelect
│  │  │     └─ Tooltip with station info
│  │  │
│  │  └─ MissionLogDrawer
│  │     └─ Station List View
│  │
│  ├─ IF visual="card_stack" → CardStackScene
│  │  └─ StationCard Stack × N
│  │     ├─ Story Card UI
│  │     ├─ Station Metadata
│  │     ├─ Highlight Text
│  │     ├─ Swipe Gestures
│  │     └─ Play Button
│  │
│  └─ IF visual="3d_globe" → 3DGlobeScene
│     ├─ React Globe GL
│     ├─ Station Point Markers × N
│     ├─ Rotation Controls
│     └─ onClick → handleStationSelect
│
├─ WhyTheseChip
│  ├─ Sparkles Icon
│  ├─ "Why these?" Button
│  └─ Popover → descriptor.reason
│
├─ PassportStampIcon (scene indicator)
│
├─ PlayerDock (persistent across scenes)
│
└─ Footer
```

---

## 🔄 Playback Strategy Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PLAYBACK STRATEGY MATRIX                            │
└─────────────────────────────────────────────────────────────────────────┘

When user clicks a station, playerStore receives PlaybackStrategy from
SceneDescriptor or defaults to "single".

┌────────────────┬──────────────────────────────────────────────────────┐
│ Strategy       │ Behavior                                             │
├────────────────┼──────────────────────────────────────────────────────┤
│ "single"       │ - Play only the selected station                     │
│                │ - Clear queue                                        │
│                │ - onEnded → stop playback                            │
├────────────────┼──────────────────────────────────────────────────────┤
│ "sequence"     │ - Queue all stations from descriptor                 │
│                │ - Play in order from selected station               │
│                │ - onEnded → play next in queue                       │
│                │ - Loop: optional                                     │
├────────────────┼──────────────────────────────────────────────────────┤
│ "random"       │ - Queue all stations                                 │
│                │ - Shuffle queue                                      │
│                │ - Play selected station first                        │
│                │ - onEnded → play random from remaining               │
├────────────────┼──────────────────────────────────────────────────────┤
│ "crossfade"    │ - Queue all stations                                 │
│                │ - Overlap fade out/in between stations               │
│                │ - crossfadeMs: duration of overlap                   │
│                │ - Smooth transitions                                 │
└────────────────┴──────────────────────────────────────────────────────┘

Implementation in playerStore:

┌──────────────────────────────────────────────────────────────────────┐
│ applySceneDescriptor(descriptor: SceneDescriptor)                    │
│  1. Extract descriptor.play → strategy                              │
│  2. Extract descriptor.stations → queue                             │
│  3. Set queue based on strategy                                     │
│  4. Set nowPlaying = first station (or preserve current)            │
│  5. Apply animation preferences                                     │
│  6. Return first station to auto-play (if descriptor.play)          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ API Reference Quick Table

### Radio Browser API Endpoints Used

| Endpoint | Method | Purpose | Parameters | Response |
|----------|--------|---------|------------|----------|
| `/json/countries` | GET | Get all countries with stations | None | `Country[]` |
| `/json/stations/bycountry/{name}` | GET | Get stations by country | `limit`, `hidebroken`, `order`, `reverse` | `Station[]` |
| `/json/stations/bytag/{tag}` | GET | Get stations by tag | `limit`, `hidebroken` | `Station[]` |
| `/json/stations/bylanguage/{language}` | GET | Get stations by language | `limit`, `hidebroken` | `Station[]` |
| `/json/stations/search` | GET | Search stations | `name`, `country`, `tag`, `limit` | `Station[]` |

### Internal API Endpoints

| Endpoint | Method | Purpose | Request Body | Response |
|----------|--------|---------|--------------|----------|
| `/api/ai/recommend` | POST | Get AI-curated station recommendations | FormData: `prompt`, `visual`, `scene`, context params | `{ descriptor: SceneDescriptor }` |
| `/api/radio-catalog` | GET | Get Radio Browser catalog snapshot | Query: `stations`, `refresh` | Catalog snapshot JSON |

---

## 📱 Mobile vs Desktop Flow Differences

### Key Differences Table

| Feature | Desktop | Mobile |
|---------|---------|--------|
| **Player Component** | `PremiumPlayerDock` (full controls) | `CompactPlayerDock` (minimal UI) |
| **Navigation** | Sidebar + Header | Bottom TabBar |
| **Station Grid** | 3-4 columns | 1-2 columns |
| **Country Overview** | Side-by-side filter panel | Collapsible filter drawer |
| **Scene Interactions** | Mouse hover previews | Touch gestures, swipe |
| **Quick Retune** | Floating widget (corner) | Bottom sheet |
| **Search** | Always visible in header | Collapsible search bar |

### Responsive Breakpoints

```typescript
// Defined in Mantine theme config
const breakpoints = {
  xs: '0px',     // Mobile portrait
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px' // Ultra-wide
};
```

---

## 🧪 Testing User Journeys

### Example Test Scenarios

#### Scenario 1: New User Explores Brazil

```
1. User lands on /
   ✓ Loader fetches countries
   ✓ AtlasGrid renders with country stamps
   
2. User types "brazil" in search
   ✓ Client-side filter activates
   ✓ Brazil stamp highlighted
   
3. User clicks Brazil stamp
   ✓ Navigate to /?country=Brazil
   ✓ Loader fetches Brazilian stations
   ✓ CountryOverview + StationGrid render
   
4. User clicks Play on "Radio Brasil FM"
   ✓ playerStore.startStation() called
   ✓ audioElement.src set to stream URL
   ✓ PlayerDock updates with nowPlaying
   ✓ Station saved to recentStations
   
5. User clicks heart icon
   ✓ Station added to favoritesStore
   ✓ localStorage updated
   ✓ Heart icon fills in
```

#### Scenario 2: AI Discovery Journey

```
1. User navigates to /world/cards
   ✓ Loader validates scene "cards"
   ✓ JourneyComposer renders
   
2. User types "relaxing ambient for late night work"
   ✓ Prompt captured in state
   
3. User clicks Submit
   ✓ fetcher.submit() → POST /api/ai/recommend
   ✓ Loading state shows with hints
   
4. Server processes request
   ✓ extractPromptIntent() parses prompt
   ✓ Radio Browser API called for candidates
   ✓ rankStations() scores candidates
   ✓ LLM selects best 10 stations
   ✓ SceneDescriptor built and returned
   
5. Client receives descriptor
   ✓ setDescriptor() updates state
   ✓ SceneManager lazy-loads CardStackScene
   ✓ Cards render with station highlights
   
6. User swipes through cards
   ✓ Gesture handlers respond
   ✓ Card stack animation plays
   
7. User clicks Play on card
   ✓ handleStationSelect() called
   ✓ playerStore applies "sequence" strategy
   ✓ Queue populated with all 10 stations
   ✓ First station plays
   
8. Station ends
   ✓ onEnded event fires
   ✓ playerStore.nextStation() called
   ✓ Second station in queue plays
```

---

## 🔗 Cross-References

### Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: High-level architecture overview
- **[AI_PIPELINE.md](./AI_PIPELINE.md)**: Detailed AI recommendation pipeline
- **[PLAYER_STORE.md](./PLAYER_STORE.md)**: playerStore API reference
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)**: Testing strategies and examples

### Code References

#### Key Files for User Journey

| Journey Step | File | Lines | Description |
|--------------|------|-------|-------------|
| Landing page loader | [app/routes/_index.tsx](../app/routes/_index.tsx) | 52-75 | Fetches countries and stations |
| Country selection | [app/routes/_index.tsx](../app/routes/_index.tsx) | 200-250 | Atlas grid and navigation |
| Station playback | [app/state/playerStore.ts](../app/state/playerStore.ts) | 120-180 | startStation() implementation |
| World mode loader | [app/routes/world.$sceneId.tsx](../app/routes/world.$sceneId.tsx) | 60-75 | Scene validation |
| AI recommendation | [app/api/ai/recommend.ts](../app/api/ai/recommend.ts) | 1-200 | Full API handler |
| Radio Browser client | [app/utils/radioBrowser.ts](../app/utils/radioBrowser.ts) | 45-82 | rbFetchJson() helper |
| Station normalization | [app/utils/stations.ts](../app/utils/stations.ts) | - | Data transformation |
| Station ranking | [server/stations/ranking.ts](../server/stations/ranking.ts) | - | Scoring algorithm |

---

## 📊 Performance Metrics

### API Call Performance Targets

| API Call | Expected Duration | Cache Strategy |
|----------|------------------|----------------|
| GET /json/countries | 200-500ms | CDN cache 300s |
| GET /json/stations/bycountry | 300-800ms | CDN cache 300s |
| POST /api/ai/recommend | 2-5s | No cache (dynamic) |
| Radio Browser mirror fallback | +200ms per retry | In-memory base URL cache |

### User Experience Metrics

| Action | Target Time | Measurement Point |
|--------|-------------|-------------------|
| Page load (/) | < 2s | Lighthouse FCP |
| Country selection → render | < 500ms | Remix navigation |
| Station play click → audio | < 1s | playerStore action |
| AI prompt → descriptor | < 5s | Fetcher roundtrip |
| Scene render with descriptor | < 300ms | Component mount |

---

## 🎯 Key Takeaways

### For Developers

1. **Remix loaders** fetch data server-side before rendering
2. **playerStore** is the single source of truth for playback
3. **Radio Browser API** is the primary data source with mirror fallback
4. **AI recommendation** is a multi-stage pipeline (intent → candidates → LLM → descriptor)
5. **SceneManager** dynamically loads visual components based on descriptor

### For Designers

1. **Atlas Mode** focuses on exploration and discovery
2. **World Mode** emphasizes narrative and curation
3. **PlayerDock** is persistent across all routes
4. **Mobile-first** design with progressive enhancement
5. **PassportStamp** metaphor unifies the visual language

### For Product Managers

1. User journey starts with either **browse (Atlas)** or **discover (World)**
2. AI recommendations leverage **user context** (favorites, recent plays)
3. **Station health signals** ensure reliable playback
4. **Playback strategies** enable different listening experiences
5. **Cross-platform** consistency maintained via shared state stores

---

## 📝 Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2024-12-18 | 1.0.0 | Initial UI flow documentation |

---

**Related Documents:**
- [README](../readme.md) - Project overview and quick start
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture
- [LLM.md](../LLM.md) - LLM assistant guide

**Navigation:** [← Back to Docs Index](./README.md)
