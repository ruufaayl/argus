# ARGUS — Automated Reconnaissance & Geospatial Unified System

ARGUS is a real-time geospatial intelligence command dashboard for Pakistan's national security apparatus. It renders a full CesiumJS 3D globe with live ADS-B flight tracking, AIS maritime vessel data, satellite orbital positions (TLE/SGP4), OpenStreetMap landmark intelligence, and AI-synthesized threat analysis — all inside a Liquid Glass material design system inspired by iOS 26. The platform operates as a Turbo monorepo with a Vite-powered React frontend and Cloudflare Workers API backend.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Monorepo | Turbo + pnpm | ^2.4.0 / 9.15.0 |
| Frontend | React + TypeScript | ^18.3.1 / ^5.7.0 |
| Build | Vite | ^5.4.0 |
| 3D Globe | CesiumJS + Resium | ^1.125.0 / ^1.18.0 |
| Data Viz | Deck.gl | ^9.1.0 |
| Maps | MapLibre GL | ^4.7.0 |
| Geospatial | Turf.js, H3-js | ^7.2.0 / ^4.2.0 |
| State | Zustand | ^4.5.0 |
| Icons | Lucide React | ^0.469.0 |
| AI (narrative) | Groq Llama-3.3-70b | API |
| AI (analysis) | Groq Llama-3.1-70b | API |
| Satellite math | satellite.js | ^6.0.2 |
| Node runtime | Node.js | >=20.0.0 |

---

## Source Architecture (`apps/web/src/`)

```
src/
├── main.tsx                    # React mount, Cesium Ion disabled
├── App.tsx                     # Root layout, auth gate, keyboard shortcuts
├── App.css                     # Layout overrides, loading screen
├── index.css                   # 1840-line design system (Liquid Glass)
├── vite-env.d.ts               # Vite type declarations
│
├── components/
│   ├── globe/
│   │   ├── Globe.tsx           # Core CesiumJS viewer (Esri imagery, camera, click-to-fly)
│   │   ├── PakistanBorder.tsx  # GeoJSON border polyline
│   │   ├── LandmarkLayer.tsx   # OSM landmark pins (T1/T2/T3 tier system)
│   │   ├── FlightLockOverlay.tsx # Flight selection lock UI
│   │   ├── GlobeErrorBoundary.tsx
│   │   └── layers/
│   │       ├── FlightLayer.tsx       # ADS-B/OpenSky aircraft tracks
│   │       ├── VesselLayer.tsx       # AIS maritime vessel positions
│   │       ├── SatelliteLayer.tsx    # TLE/SGP4 orbital positions
│   │       ├── WeatherLayer.tsx      # Rain radar overlay
│   │       ├── IntelPinLayer.tsx     # AI intelligence signal pins
│   │       ├── SelectionRing.tsx     # Pulsing ring on selected entity
│   │       ├── ProjectedRouteLayer.tsx # Flight path & vessel route projection
│   │       └── BorderCheckpostLayer.tsx
│   │
│   ├── ui/
│   │   ├── TopBar.tsx          # Header: clock, logo, coordinates
│   │   ├── CommandCenter.tsx   # Left panel: live intel feed
│   │   ├── DataLayersMenu.tsx  # Left bottom: layer toggles + counts
│   │   ├── InsightWidget.tsx   # Right panel: entity dossier + AI briefing
│   │   ├── LocationsBar.tsx    # Bottom: dynamic city chips
│   │   ├── BottomBar.tsx       # Bottom center: location pills
│   │   ├── ModeToggle.tsx      # View mode selector (NVG/FLIR/MONO/CRT)
│   │   ├── TimelineScrubber.tsx
│   │   ├── CommanderAuth.tsx   # PIN authentication overlay
│   │   ├── PatternAnalysis.tsx # AI behavioral pattern analysis
│   │   ├── TileLoadingBar.tsx
│   │   └── HistoryCharts.tsx
│   │
│   ├── dossier/
│   │   ├── AircraftDossier.tsx   # Flight telemetry detail panel
│   │   ├── VesselDossier.tsx     # Maritime vessel detail panel
│   │   └── SatelliteDossier.tsx  # Satellite orbital detail panel
│   │
│   ├── demo/                     # Command dashboard demo views
│   └── entity/                   # AI entity voice panel
│
├── stores/                       # Zustand state management
│   ├── commandStore.ts           # Primary store (view mode, selection, camera, layers)
│   ├── visionStore.ts            # Vision gear slider state
│   ├── altitudeStore.ts          # Camera altitude tracking
│   ├── timelineStore.ts          # Timeline scrubber state
│   ├── entityStore.ts            # Entity feed state
│   ├── cityStore.ts, radarStore.ts, auditStore.ts
│
├── hooks/                        # Custom React hooks
│   ├── useFlights.ts, useVessels.ts, useADSB.ts
│   ├── useCityData.ts, useEntityFeed.ts
│   ├── useAltitude.ts, usePKTClock.ts, useWeather.ts
│
├── lib/                          # Utility modules
│   ├── satelliteEngine.ts        # SGP4 propagation
│   ├── cameraSystem.ts           # Camera animation helpers
│   ├── viewModes.ts              # CSS filter definitions
│   ├── imageryLayers.ts          # Cesium imagery config
│   ├── cities.ts, colorRamps.ts, borderDetection.ts, etc.
│
├── workers/
│   └── satellite.worker.ts      # Web Worker for TLE computation
│
├── services/
│   └── audioService.ts          # UI sound effects
│
├── types/
│   └── flight.ts                # Flight interface definitions
│
├── constants/
│   └── layerKeys.ts
│
└── data/
    ├── landmarks.ts
    └── raw_landmarks.json
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | Groq AI for intel synthesis & briefings |
| `CLASSIFIED_PASSWORD` | 4-digit PIN for auth gate |
| `OPENSKY_USERNAME` | OpenSky Network flight data |
| `OPENSKY_PASSWORD` | OpenSky Network flight data |
| `VITE_CESIUM_ION_TOKEN` | Cesium Ion (currently unused — Esri imagery used instead) |
| `CLAUDE_API_KEY` | Anthropic Claude API |
| `OPENAQ_API_KEY` | Air quality data |
| `HERE_API_KEY` | Traffic data |
| `TOMTOM_API_KEY` | Traffic data |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Workers deployment |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API |
| `R2_BUCKET_NAME` | Cloudflare R2 tile storage |
| `UPSTASH_REDIS_URL` | Redis cache |
| `UPSTASH_REDIS_TOKEN` | Redis cache auth |
| `NEON_DATABASE_URL` | PostgreSQL database |
| `AISSTREAM_KEY` | Maritime AIS vessel tracking |
| `OPENWEATHER_API_KEY` | Weather data |
| `SENTINELHUB_CLIENT_ID` | Sentinel Hub satellite imagery |
| `SENTINELHUB_CLIENT_SECRET` | Sentinel Hub auth |

---

## Design System Summary

**Liquid Glass Material (3-layer stack):**
1. **Highlight** — rim light borders (`--glass-border`, `--border-hi`)
2. **Fill + Blur** — frosted backdrop (`--glass`, `backdrop-filter: blur(20px)`)
3. **Shadow + Refraction** — depth shadow + subtle displacement

**Typography:**
- `Space Grotesk` — headings, labels, display text
- `Inter` — body, UI, data values
- `JetBrains Mono` — coordinates, codes, telemetry
- `Share Tech Mono` — retro/CRT mode fallback

**Color System:**
- `--cyan: #00C8FF` — primary interactive
- `--amber: #FFB800` — warning/alert
- `--green: #34D399` — safe/operational
- `--red: #F43F5E` — critical/threat
- `--bg: #0a0e14` — dark navy background

---

## The 3 Laws of ARGUS UI

1. **Globe never hides** — The CesiumJS globe is always visible behind all UI panels. No modal or panel may fully obscure it. Panels are transparent glass.
2. **Data earns its place** — Every number, label, and indicator on screen must come from a real data source (ADS-B, TLE, OSM, Groq AI). No placeholder lorem ipsum in production.
3. **System breathes** — The UI has ambient motion: pulsing status dots, scrolling ticker, blinking cursors, subtle glow transitions. A static dashboard is a dead dashboard.

---

## Current Build Phase

**Phase 4 — UI/UX & Intelligence Overhaul** (in progress)

### Working Right Now:
- CesiumJS globe with Esri World Imagery (smooth rendering)
- 400+ live aircraft via ADS-B Exchange (api.adsb.lol)
- 29 simulated AIS vessels in Pakistani waters
- 283+ satellites via CelesTrak TLE/SGP4 + ivanstanojevic.me fallback API
- OSM landmark pins (military, airports, cities, mosques, etc.)
- Click-to-fly: click globe surface → fly to 2km, show coordinate pin
- Click landmark → fly to 2km, show AI intelligence briefing
- Groq AI intelligence synthesis (GDELT headlines → tactical alerts)
- AI behavioral pattern analysis for entities
- View modes: NORMAL, NVG, FLIR, MONO, CRT (CSS filters)
- Vision Gear sliders (bloom, contrast, exposure, etc.)
- Commander Auth gate (PIN lock)
- Projected route layer (flight paths, vessel routes)
- Selection ring + entity dossiers (aircraft, vessel, satellite)
- Pakistan soft boundary enforcement

### Phase 4 Completed:
- TLE proxy dual-source fallback (CelesTrak primary → tle.ivanstanojevic.me fallback with JSON→TLE conversion + pagination)

### Phase 4 In Progress:
- Dynamic NearFarScalar scaling for all entity types (flights, vessels, satellites, landmarks)
- Entity labels visible at all zoom levels with no overlap
- Depth occlusion fix (entities not showing through terrain)
- Landmark name accuracy and centered fly-to with glow effect
- Intelligence briefing redesign (strategic military format, generate button, calibrated threat index, exact dates)
- Default altitude 4500km Pakistan-centered
- Collapsible/moveable panels, timeline overlap fix
- Command Palette (Ctrl+K search across all entities)
- Data layer toggles for all layers including landmarks and border

---

## Finalized Files (DO NOT MODIFY without explicit instruction)

- `apps/web/src/index.css` — Design system tokens and glass components
- `apps/web/src/stores/commandStore.ts` — Core state management schema
- `apps/web/vite.config.ts` — API middleware and build config
- `ARGUS_BUILD_BIBLE.md` — Master specification document

---

## How to Run

```bash
# From monorepo root
pnpm install
pnpm dev          # Starts Vite dev server on :5173

# Or from apps/web/
cd apps/web
pnpm dev
```

Requires `.env` file with at minimum `GROQ_API_KEY` for AI features.
