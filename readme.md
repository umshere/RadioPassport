# 🌍 Radio Passport

**Tune into the world, one passport stamp at a time.**

Radio Passport is a beautiful, web-based radio player that lets you explore and discover radio stations from around the globe. With a curated, passport-stamp-style interface, you can travel the world through sound without leaving your browser.

> Documentation: See the docs index at [docs/README.md](./docs/README.md) for guides, plans, and testing.

## ✨ Features

- **🌍 Global Radio Atlas**: Explore stations from 80+ countries across 7 continents
- **🧭 Travel Trail Player**: Horizontal “trail” keeps recent stations visible with resume/next inline
- **📊 Stream Health Signals**: Radio Browser data is normalized to drop broken stations and surface reliable ones
- **🔥 Trending Radar**: Votes & clicktrend surface what's hot right now across the globe
- **🔍 Smart Search**: Filter countries instantly and jump via Quick Retune
- **⭐ Favorites**: Heart any station and find it again in seconds
- **🎨 Designed for Discovery**: Light, airy discovery aesthetic with Mantine + Tailwind polish (updated Oct 2025)
- **�️ Raptor Mini (Preview)**: Compact, low-height player for one-handed mobile use (experimental). Toggle with `ENABLE_RAPTOR_MINI=true` in local `.env`. The Raptor mini will be enabled for all clients after completion of the preview rollout.
- **�📱 Fully Responsive**: Optimised layouts from phones to ultrawide displays

## 🚀 Quick Start

### Live Version

**🟡 LIVE BETA** - **[Radio Passport](https://your-deployment-url.com)**

Currently deployed on Vercel and running in live beta with full functionality.

### Local Development

```bash
# Clone the repository
git clone https://github.com/umshere/RadioPassport.git
cd RadioPassport

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

## 📖 How to Use

1. **Browse Countries**: Scroll through the passport stamp grid or use the search bar to find countries
2. **Select a Country**: Click on any country stamp to see available radio stations
3. **Choose a Station**: Browse through the list of stations and click play on any station
4. **Enjoy**: Listen to live radio from around the world!

### Navigation

- **Home**: Main passport stamp interface
- **Explore**: Discover new stations and countries
- **Favorites**: Your saved stations (coming soon)
- **About**: Learn more about the project

## 🛠️ Technical Details

Built with modern web technologies:

- **Framework**: [Remix](https://remix.run/) - Full-stack React framework
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- **UI Components**: [Mantine](https://mantine.dev/) - React component library
- **Animations**: [Framer Motion](https://www.framer.com/motion/) - Production-ready animations
- **Data Source**: [Radio Browser API](https://www.radio-browser.info/) - Free, community-maintained radio directory
- **TypeScript**: Full type safety across the application
- **Component Architecture**: Modular, reusable component design

### 🏗️ Project Structure

The application follows a clean, modular architecture with **DRY principles** applied throughout:

```
app/
├── components/          # Shared UI components
│   ├── CountryFlag.tsx
│   └── PassportStampIcon.tsx
├── constants/          # App constants and configuration
│   └── brand.ts
├── hooks/              # Custom React hooks (state management)
│   ├── useRadioPlayer.ts        # Audio playback & controls
│   ├── useListeningMode.ts      # World/Local mode toggle
│   ├── useFavorites.ts          # Favorite stations management
│   ├── useRecentStations.ts     # Recently played tracking
│   ├── useHoverAudio.ts         # Preview sound effects
│   ├── useAtlasState.ts         # Country/continent filtering
│   ├── usePlayerCards.ts        # Card stack logic
│   ├── useStationNavigation.ts  # Next/previous controls
│   ├── useAtlasNavigation.ts    # Atlas continent selection
│   ├── useDerivedData.ts        # Computed/memoized data
│   └── useEventHandlers.ts      # Consolidated event handlers
├── routes/             # Route components
│   ├── components/     # Route-specific components
│   │   ├── HeroSection.tsx
│   │   ├── AtlasFilters.tsx
│   │   ├── AtlasGrid.tsx
│   │   ├── CountryOverview.tsx
│   │   ├── PlayerCardStack.tsx
│   │   ├── PassportPlayerFooter.tsx
│   │   ├── QuickRetuneWidget.tsx
│   │   ├── StationCard.tsx
│   │   ├── StationGrid.tsx
│   │   ├── CollapsibleSection.tsx
│   │   └── LoadingView.tsx
│   └── _index.tsx      # Main route (393 lines, down from 1200+)
├── types/              # TypeScript type definitions
│   └── radio.ts
└── utils/              # Utility functions
    ├── geography.ts       # Continent/country mapping
    ├── haptics.ts         # Vibration feedback
    ├── radioBrowser.ts    # API client with mirror fallback
    ├── scrollHelpers.ts   # Scroll utilities
    ├── stations.ts        # Radio Browser → internal Station normaliser
    └── stationMeta.ts     # Health scoring & ranking helpers
```

**Code Quality Improvements (Oct 2025):**

- ✅ **67% reduction** in main route file (1200+ → 393 lines)
- ✅ **11 custom hooks** extract all state management logic
- ✅ **Separated concerns**: UI, state, effects, handlers, derived data
- ✅ **DRY principles** eliminate code duplication
- ✅ **Clean architecture** with clear separation of responsibilities

## 🎯 Implementation Status (Updated Oct 26, 2025)

### ✅ Completed Features

**Travel Trail Player**

- Replaced vertical stack with horizontal, scroll-snapping trail
- Active card now expands inline with badges, tags, and controls
- Resume/Next controls live on the active card
- Always visible: no collapsible queue required
- Animated dotted connector communicates progression and keyboard navigation is supported

**Station Normalisation Layer**

- New `normalizeStations` utility converts Radio Browser payloads to our internal types
- Drops broken stations (missing uuid/name/url) and casts bitrate/codec safely
- Guarantees dedupe logic works across recent, explore, and country feeds

**Radio Browser Hygiene**

- Every fetch path (loader, quick retune, “surprise me”, explore mode) now runs through the normaliser
- Ready to surface additional metadata (e.g. `lastcheckok`) without reworking consumers
- Trail and station grid surface health/trending badges derived from normalised metadata

**Quick Retune + Atlas Improvements**

- Scroll targets adjusted for the always-on travel trail
- Continent selects continue to respect listening mode and atlas focus

## 📡 Radio Browser Normalisation

Radio Browser responses expose dozens of fields (`stationuuid`, `url_resolved`, `lastcheckok`, etc.).
Our `app/utils/stations.ts` helper converts those payloads into the lean `Station` shape the UI
expects:

- Enforces required fields (`uuid`, `name`, `url`); broken entries are ignored.
- Prefers `url_resolved` when present, but gracefully falls back to `url`.
- Normalises country codes, tags, and bitrate values so dedupe logic stays reliable.
- Keeps homepage links for stations without stream URLs so the UI can offer a "Visit station" fallback.

With a single ingestion point it’s easy to add more user-facing context later (e.g. stream
reliability badges, trending signals) without touching every consumer.

### 📋 Next Steps

**E2E Tests:** Skeleton states, mode toggle, scroll behavior, cross-browser  
**UX Polish:** Tooltips, ARIA labels, copy refinement

## 🌟 Key Statistics

- **80** Countries Featured
- **50,520** Stations Tracked
- **7** Continents Covered
- **24/7** Live Streaming

## 🤝 Contributing

Radio Passport is an open-source project. Contributions are welcome!

### Development Setup

```bash
# Fork and clone
git clone https://github.com/your-username/RadioPassport.git
cd RadioPassport

# Install dependencies
npm install

# Start development
npm run dev
```

### Areas for Contribution

New UI themes and designs
Additional station sources
Mobile app development
Performance optimizations
Localization support
Unit tests for components
End-to-end testing improvements
Accessibility enhancements

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## ⚖️ Legal Considerations

**Radio Passport** uses publicly available radio streams and the free Radio Browser API. However, be aware of:

- **Radio Station Content**: Individual radio stations own their content and may have geographic restrictions
- **Name Trademark**: "Radio Passport" should be checked for trademark availability in your jurisdiction
- **Fair Use**: This application provides access to public streams but doesn't host or redistribute content
- **API Terms**: Radio Browser API is free for non-commercial use; check their terms for commercial deployment

**Recommendation**: Consult with a legal professional before commercial deployment to ensure compliance with local regulations and copyright laws.

## 🙏 Acknowledgments

- **Radio Browser**: Free API providing radio station data
- **Remix Team**: Amazing full-stack framework
- **Open Source Community**: For the incredible tools and libraries

---

**Made with ❤️ for radio lovers everywhere**
