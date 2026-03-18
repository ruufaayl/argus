# ARGUS — MASTER BUILD BIBLE
## Professional Production System — Antigravity IDE Prompt Engineering Guide
### Version 1.0 | Rufayl | 2026

---

## SECTION 0 — READ THIS FIRST

This document is your single source of truth for the entire build.
Every decision, every prompt, every dependency, every file is defined here.
You do not freestyle. You do not skip steps. You execute this document in order.

**The Rule:** One phase at a time. Phase N must be fully working, committed to GitHub,
and deployed on Vercel before Phase N+1 begins.

---

## SECTION 1 — WHAT WE ARE BUILDING

ARGUS is a real-time urban intelligence platform for Pakistan's 4 major cities.
It is two things simultaneously:

**Face 1 — Public God's Eye** (`argus.rufayl.dev`)
Cinematic, CesiumJS-powered 3D globe experience. Karachi/Lahore/Islamabad/Rawalpindi.
Real satellite imagery. Live data. AI city voice. Night lights from space. Built for going viral.

**Face 2 — Command Dashboard** (password-gated, same codebase)
Palantir-style dark intelligence interface. Entity panels. Signal fusion. Audit trail.
Built for the NCCSIP demo meeting.

**One toggle. Two modes. One codebase.**

---

## SECTION 2 — FINAL TECH STACK (LOCKED. DO NOT DEVIATE.)

### Frontend Framework
```
React 18 + TypeScript + Vite
```
Why: TypeScript catches geospatial coordinate type errors before runtime.
Vite for instant HMR with heavy WebGL dependencies.

### 3D Globe Engine
```
CesiumJS 1.x (via resium — React wrapper)
```
Why: NASA-grade terrain. Real Earth curvature. Used by aerospace agencies.
Nothing else renders a photorealistic globe with real terrain elevation.
NOT Mapbox (paid). NOT Google Maps (paid at scale). NOT Leaflet (2D only).

### Street Level Renderer
```
MapLibre GL JS 4.x
```
Why: Open source Mapbox fork. Free forever. Identical API.
Takes over from Cesium when zoom level crosses 500m altitude threshold.

### Data Overlay Engine
```
Deck.gl 9.x
```
Why: Sits on top of both Cesium and MapLibre. GPU-accelerated layers.
H3 hexagons, arc layers, heatmaps, scatter plots — all WebGL.

### Geospatial Analysis (Browser)
```
Turf.js — spatial calculations
H3-js — hexagonal grid indexing
DuckDB WASM — query large datasets in browser, zero backend
Apache Arrow JS — columnar data performance
```

### Tile Infrastructure
```
PMTiles + Protomaps
```
Why: Self-host ALL vector tiles as a single .pmtiles file on Cloudflare R2.
Zero tile server. Zero per-request cost. One file. Served from CDN.

### Post-Processing (Visual FX)
```
Three.js EffectComposer (bloom, atmospheric haze, film grain)
```

### State Management
```
Zustand (lightweight, no boilerplate, works perfectly with WebGL render loops)
```

### Backend / API
```
Cloudflare Workers (TypeScript)
```
Why: Edge-deployed. 100k free requests/day. Zero cold starts. Near Karachi PoP.

### Database
```
Neon.tech PostgreSQL (free tier, never sleeps unlike Supabase free)
+ PostGIS extension for geospatial queries
```

### Cache / Pub-Sub
```
Upstash Redis (free 10k commands/day)
```
Why: Cache live API responses. Satellite data updates every 3 hours — no reason
to hit NASA API on every request.

### File Storage / Tiles
```
Cloudflare R2 (free 10GB, zero egress fees)
```
Stores: PMTiles file, cached satellite rasters, processed GeoJSON

### AI Entity Voice
```
Anthropic Claude API
- claude-haiku-4-5 → streaming city monologue (cheap, fast, always on)
- claude-sonnet-4-6 → Q&A in character (deeper reasoning)
```

### Frontend Hosting
```
Vercel (free for personal projects, automatic from GitHub)
```

### Domain
```
argus.rufayl.dev (free subdomain of your existing domain)
```

### Dev Environment
```
Antigravity IDE
Node.js 20+
pnpm (faster than npm)
```

---

## SECTION 3 — OPEN SOURCE DATA SOURCES (ALL FREE)

### Satellite & Earth Observation
```
NASA VIIRS Night Lights     → city from space at night (your opening shot)
ESA Sentinel-2 (Copernicus) → 10m resolution land use, vegetation, urban heat
NASA FIRMS API              → real-time heat anomaly detection (updates 3hrs)
Meta High-Res Population    → 30m resolution population density grid, all Pakistan
GHSL (EU Joint Research)    → building volume + population grids 1975-2020
Planet Labs NICFI           → free high-res land imagery for greenery analysis
RainViewer API              → real-time global rain radar, free
```

### Maps & Geometry
```
Overture Maps Foundation    → Apple+Meta+Amazon+MS combined map data (2024)
                              Better building footprints than OSM. Nobody using it yet.
OpenStreetMap (Overpass)    → all road networks, POIs, boundaries
PMTiles + Protomaps         → self-host tiles as single file
```

### Live City Data
```
OpenSky Network API         → free real-time ADS-B flight tracking over Pakistan
OpenAQ API                  → free real-time air quality (multiple sensors per city)
IQAir public data           → backup AQI source
Open-Meteo API              → free weather + 7-day forecast, no key required
HERE Maps Traffic API       → free tier, real-time congestion per road segment
TomTom Traffic API          → free 2500 calls/day, live speed data
Mapillary JS SDK            → street-level photos, fully open source
```

### Pakistan-Specific
```
NDMA Pakistan               → flood zone data, disaster alerts
KE (Karachi Electric)       → load shedding schedule scrape
LESCO / IESCO / PESCO       → load shedding for Lahore/ISB/Peshawar
KWSB / WASA                 → water supply data scrape
Dawn / Geo / ARY            → news headlines geo-tagged, scraper
PBS Pakistan                → crime and demographic statistics
```

### Hidden Gems Nobody Is Combining
```
DuckDB WASM          → run SQL on 10GB GeoParquet IN THE BROWSER. Zero backend.
Perspective.js       → real-time streaming data tables (JPMorgan open-sourced)
Observable Plot      → D3-level charts with readable code
Arquero              → pandas-style dataframe manipulation in browser
Apache Arrow WASM    → columnar data format, 100x faster than JSON for geo data
COG + STAC           → stream satellite imagery tile-by-tile, no 50GB downloads
OpenRouteService     → free routing + isochrones (30min travel radius circles)
```

---

## SECTION 4 — REPOSITORY STRUCTURE

```
argus/
├── apps/
│   ├── web/                          ← React frontend (Vite + TypeScript)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── globe/            ← CesiumJS / Resium components
│   │   │   │   │   ├── Globe.tsx
│   │   │   │   │   ├── CityFlyTo.tsx
│   │   │   │   │   ├── NightLightsLayer.tsx
│   │   │   │   │   ├── AtmosphereLayer.tsx
│   │   │   │   │   └── FlightLayer.tsx
│   │   │   │   ├── map/              ← MapLibre (street level)
│   │   │   │   │   ├── StreetMap.tsx
│   │   │   │   │   ├── TrafficLayer.tsx
│   │   │   │   │   └── BuildingLayer.tsx
│   │   │   │   ├── layers/           ← Deck.gl data layers
│   │   │   │   │   ├── PopulationHexLayer.tsx
│   │   │   │   │   ├── AQILayer.tsx
│   │   │   │   │   ├── HeatIslandLayer.tsx
│   │   │   │   │   ├── FloodMemoryLayer.tsx
│   │   │   │   │   └── PowerOutageLayer.tsx
│   │   │   │   ├── ui/               ← Interface chrome
│   │   │   │   │   ├── TopBar.tsx
│   │   │   │   │   ├── LeftPanel.tsx
│   │   │   │   │   ├── RightPanel.tsx
│   │   │   │   │   ├── BottomBar.tsx
│   │   │   │   │   ├── CityMetrics.tsx
│   │   │   │   │   ├── LayerControls.tsx
│   │   │   │   │   ├── SignalFeed.tsx
│   │   │   │   │   └── ModeToggle.tsx
│   │   │   │   ├── entity/           ← AI City Voice
│   │   │   │   │   ├── EntityPanel.tsx
│   │   │   │   │   ├── EntityVoice.tsx
│   │   │   │   │   └── EntityInput.tsx
│   │   │   │   └── demo/             ← Command dashboard (classified mode)
│   │   │   │       ├── CommandDashboard.tsx
│   │   │   │       ├── EntityGraph.tsx
│   │   │   │       ├── IncidentTimeline.tsx
│   │   │   │       └── AuditLog.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAltitude.ts    ← zoom level → altitude calculation
│   │   │   │   ├── useCityData.ts    ← live data fetching per city
│   │   │   │   ├── useFlights.ts     ← OpenSky flight data + animation
│   │   │   │   └── useEntityVoice.ts ← Claude streaming SSE
│   │   │   ├── stores/
│   │   │   │   ├── cityStore.ts      ← Zustand: current city, mode
│   │   │   │   ├── layerStore.ts     ← Zustand: layer visibility states
│   │   │   │   └── entityStore.ts    ← Zustand: AI entity state
│   │   │   ├── lib/
│   │   │   │   ├── cities.ts         ← city configs (coords, metrics, voice)
│   │   │   │   ├── altitudeManager.ts← altitude → layer trigger logic
│   │   │   │   └── colorRamps.ts     ← data visualization color scales
│   │   │   ├── types/
│   │   │   │   ├── city.ts
│   │   │   │   ├── layer.ts
│   │   │   │   └── signal.ts
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   │   └── assets/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── api/                          ← Cloudflare Workers backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── entity.ts         ← Claude streaming endpoint
│       │   │   ├── flights.ts        ← OpenSky proxy + cache
│       │   │   ├── aqi.ts            ← OpenAQ proxy + cache
│       │   │   ├── weather.ts        ← Open-Meteo proxy + cache
│       │   │   ├── traffic.ts        ← HERE/TomTom proxy + cache
│       │   │   └── scraper.ts        ← KE/KWSB/news scrapers
│       │   ├── middleware/
│       │   │   ├── auth.ts           ← API key validation
│       │   │   └── rateLimit.ts      ← per-IP rate limiting
│       │   └── index.ts              ← Hono router
│       ├── wrangler.toml
│       └── package.json
├── packages/
│   └── shared/                       ← shared TypeScript types
│       ├── src/
│       │   └── types/
│       └── package.json
├── data/                             ← static datasets (committed to git LFS or R2)
│   ├── pakistan-boundaries.pmtiles
│   ├── karachi-buildings.geojson.gz
│   ├── lahore-buildings.geojson.gz
│   ├── islamabad-buildings.geojson.gz
│   └── rawalpindi-buildings.geojson.gz
├── scripts/                          ← data processing scripts (Python)
│   ├── download_nightlights.py
│   ├── process_population.py
│   ├── process_buildings.py
│   └── generate_pmtiles.py
├── .github/
│   └── workflows/
│       └── deploy.yml                ← GitHub Actions: push → Vercel deploy
├── .env.example
├── .gitignore
├── pnpm-workspace.yaml               ← monorepo config
├── turbo.json                        ← Turborepo build pipeline
└── README.md
```

---

## SECTION 5 — ALTITUDE MANAGER (THE CORE LOGIC)

This is the most important architectural decision. Everything triggers on altitude.

```typescript
// altitudeManager.ts — the brain of the experience

export const ALTITUDE_THRESHOLDS = {
  SPACE:         500_000,   // meters — Earth from orbit
  APPROACH:      100_000,   // Pakistan visible
  COUNTRY:        50_000,   // Full country
  CITY:            5_000,   // City grid loads
  DISTRICT:          500,   // Neighbourhood detail
  STREET:            100,   // Street level — MapLibre takeover
  GROUND:             20,   // Walking level
}

export type AltitudeZone =
  | 'SPACE'
  | 'APPROACH'
  | 'COUNTRY'
  | 'CITY'
  | 'DISTRICT'
  | 'STREET'
  | 'GROUND'

// What loads at each altitude
export const ZONE_LAYERS: Record<AltitudeZone, string[]> = {
  SPACE:    ['night-lights', 'atmosphere'],
  APPROACH: ['night-lights', 'atmosphere', 'flights'],
  COUNTRY:  ['terrain', 'flights', 'city-markers'],
  CITY:     ['buildings-3d', 'population-hex', 'aqi-overlay',
              'power-outages', 'heat-island', 'traffic'],
  DISTRICT: ['buildings-detail', 'street-level-data',
              'flood-memory', 'water-stress', 'signals'],
  STREET:   ['maplibre-takeover', 'mapillary-photos',
              'pedestrian-density', 'poi-markers'],
  GROUND:   ['immersive-view'],
}

// Camera altitude from zoom (CesiumJS formula)
export function cameraAltitude(camera: Cesium.Camera): number {
  return camera.positionCartographic.height
}

export function altitudeToZone(altitude: number): AltitudeZone {
  if (altitude > ALTITUDE_THRESHOLDS.SPACE)    return 'SPACE'
  if (altitude > ALTITUDE_THRESHOLDS.APPROACH) return 'APPROACH'
  if (altitude > ALTITUDE_THRESHOLDS.COUNTRY)  return 'COUNTRY'
  if (altitude > ALTITUDE_THRESHOLDS.CITY)     return 'CITY'
  if (altitude > ALTITUDE_THRESHOLDS.DISTRICT) return 'DISTRICT'
  if (altitude > ALTITUDE_THRESHOLDS.STREET)   return 'STREET'
  return 'GROUND'
}
```

---

## SECTION 6 — CITY CONFIGURATION

```typescript
// lib/cities.ts

export interface CityConfig {
  id: 'karachi' | 'lahore' | 'islamabad' | 'rawalpindi'
  name: string
  shortCode: string
  division: string
  population: string
  coordinates: { lng: number; lat: number }
  defaultView: {
    zoom: number
    pitch: number
    bearing: number
    altitude: number
  }
  entityPersonality: {
    tone: string
    openingLine: string
    voiceLines: string[]
  }
  liveMetrics: {
    aqiBaseValue: number
    tempBase: number
    gridStressBase: number
    stressScoreBase: number
  }
}

export const CITIES: Record<string, CityConfig> = {
  karachi: {
    id: 'karachi',
    name: 'KARACHI',
    shortCode: 'KHI',
    division: 'Karachi Division, Sindh',
    population: '14,910,352',
    coordinates: { lng: 67.0099, lat: 24.8615 },
    defaultView: { zoom: 11.5, pitch: 52, bearing: -15, altitude: 8500 },
    entityPersonality: {
      tone: 'Exhausted. Bitter. Still standing. Never asks for sympathy.',
      openingLine: 'I have been Pakistan\'s largest earner for sixty consecutive years.',
      voiceLines: [
        // populated from API with live data injected
      ]
    },
    liveMetrics: {
      aqiBaseValue: 187,
      tempBase: 41,
      gridStressBase: 68,
      stressScoreBase: 7.4
    }
  },
  lahore: {
    id: 'lahore',
    name: 'LAHORE',
    shortCode: 'LHE',
    division: 'Lahore Division, Punjab',
    population: '13,095,166',
    coordinates: { lng: 74.3436, lat: 31.5497 },
    defaultView: { zoom: 11.5, pitch: 48, bearing: 10, altitude: 9200 },
    entityPersonality: {
      tone: 'Proud. Suffocating. Cultural memory intact. Lungs are not.',
      openingLine: 'I was called the Paris of the East. My AQI is currently {AQI}.',
      voiceLines: []
    },
    liveMetrics: {
      aqiBaseValue: 234,
      tempBase: 36,
      gridStressBase: 72,
      stressScoreBase: 8.1
    }
  },
  islamabad: {
    id: 'islamabad',
    name: 'ISLAMABAD',
    shortCode: 'ISB',
    division: 'Islamabad Capital Territory',
    population: '1,095,064',
    coordinates: { lng: 73.0479, lat: 33.6844 },
    defaultView: { zoom: 11.5, pitch: 45, bearing: -5, altitude: 8800 },
    entityPersonality: {
      tone: 'Polished surface. Hollow underneath. Painfully self-aware of the irony.',
      openingLine: 'I was designed with answers for every question. The questions have changed.',
      voiceLines: []
    },
    liveMetrics: {
      aqiBaseValue: 87,
      tempBase: 28,
      gridStressBase: 41,
      stressScoreBase: 4.2
    }
  },
  rawalpindi: {
    id: 'rawalpindi',
    name: 'RAWALPINDI',
    shortCode: 'RWP',
    division: 'Rawalpindi Division, Punjab',
    population: '2,233,910',
    coordinates: { lng: 73.0651, lat: 33.5651 },
    defaultView: { zoom: 11.5, pitch: 50, bearing: 20, altitude: 9000 },
    entityPersonality: {
      tone: 'Forgotten. Older than Pakistan. Dry wit. Infinite patience.',
      openingLine: 'I existed before Pakistan did. I will exist after the current government.',
      voiceLines: []
    },
    liveMetrics: {
      aqiBaseValue: 154,
      tempBase: 33,
      gridStressBase: 78,
      stressScoreBase: 6.9
    }
  }
}
```

---

## SECTION 7 — PHASE BUILD PLAN

### PHASE 0 — PROJECT SCAFFOLD (Day 1 — Do This First)
```
Goal: Repo created, monorepo configured, deployed to Vercel showing blank page.
Nothing visual. Just the infrastructure working end-to-end.
Commit: "chore: project scaffold"
```

### PHASE 1 — THE GOD'S EYE (Weekend 1)
```
Goal: CesiumJS globe with Pakistan night lights visible from space.
Fly into all 4 cities. Real terrain. Atmosphere. Ship publicly.
Post: "Something is coming."
Commit: "feat: cesium globe with 4 city fly-in"
```

### PHASE 2 — THE CITY BREATHES (Weekend 2)
```
Goal: First live data layers. Buildings. Real flights. AQI haze.
Population hex grid. The city feels alive.
Post: "It's alive."
Commit: "feat: live data layers + buildings"
```

### PHASE 3 — THE CITY SPEAKS (Weekend 3)
```
Goal: Claude AI entity streaming. All 4 city voices distinct.
Real data injected into prompt. Q&A mode.
Post: "I gave Pakistan's cities a voice."
Commit: "feat: ai entity streaming voice"
```

### PHASE 4 — THE DATA OPENS (Weekend 4)
```
Goal: Traffic layer, heat + flood, infrastructure failures, signals fusion.
City Stress Score live. Signals feed from news + Twitter.
Post: "Full feature reveal."
Commit: "feat: signals intelligence + traffic + infrastructure"
```

### PHASE 5 — THE TIME MACHINE (Weekend 5)
```
Goal: GHSL historical slider 1975-2020. Parallel city comparison.
Animate each city's growth. The gut-punch moment.
Post: "Watch what 45 years did."
Commit: "feat: time machine + parallel city"
```

### PHASE 6 — COMMAND DASHBOARD (Weekend 6)
```
Goal: Classified mode fully built. Palantir-style panels.
Entity graph, incident timeline, audit log, camera overlay placeholder.
This is the NCCSIP demo build.
Commit: "feat: command dashboard classified mode"
```

### PHASE 7 — POLISH + LAUNCH (Weekend 7)
```
Goal: Performance, mobile, 60fps, video walkthrough.
Full social media campaign. The one that goes everywhere.
Commit: "release: v1.0 public launch"
```

---

## SECTION 8 — ENVIRONMENT VARIABLES

```bash
# .env.example — copy to .env.local, never commit .env.local

# Cesium
VITE_CESIUM_ION_TOKEN=           # Free 50GB/month at ion.cesium.com

# AI Entity
CLAUDE_API_KEY=                  # Anthropic console

# Live Data APIs
OPENSKY_USERNAME=                # Free at opensky-network.org
OPENSKY_PASSWORD=
OPENAQ_API_KEY=                  # Free at openaq.org
HERE_API_KEY=                    # Free 250k transactions at developer.here.com
TOMTOM_API_KEY=                  # Free 2500 calls/day at developer.tomtom.com

# Infrastructure
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
R2_BUCKET_NAME=argus-tiles
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
NEON_DATABASE_URL=

# Auth (for classified mode)
CLASSIFIED_PASSWORD=             # You choose this
JWT_SECRET=                      # Generate: openssl rand -hex 32
```

---

## SECTION 9 — ANTIGRAVITY IDE PROMPTS

### HOW TO USE THESE PROMPTS

Each prompt below is a complete, copy-paste-ready instruction for Antigravity IDE.
They are written as **Master-Level AI Engineer prompts** — specific, technical,
with explicit constraints, expected outputs, and quality gates.

**Rules:**
- Copy the entire prompt block including the system context header
- Do not paraphrase or summarise — paste it exactly
- Wait for complete output before moving to next prompt
- If output is incomplete, use the CONTINUATION PROMPT at the end of each section
- After each prompt, commit to git before running the next

---

### PROMPT 0 — PROJECT SCAFFOLD

```
You are a senior full-stack engineer specialising in geospatial applications and
TypeScript monorepos. You are meticulous, produce production-grade code, and never
use placeholder comments like "// TODO: implement this".

Create a complete production monorepo for a project called "ARGUS" — a
real-time urban intelligence platform.

MONOREPO STRUCTURE:
- Turborepo + pnpm workspaces
- apps/web: React 18 + TypeScript + Vite (frontend)
- apps/api: Cloudflare Workers + Hono (backend)
- packages/shared: shared TypeScript types

REQUIREMENTS:

1. pnpm-workspace.yaml defining the two apps and shared package
2. turbo.json with build, dev, lint pipelines
3. Root package.json with workspace scripts
4. apps/web/package.json with ALL these exact dependencies:
   - react@18, react-dom@18
   - typescript@5
   - vite@5, @vitejs/plugin-react
   - cesium@latest (CesiumJS)
   - resium@latest (React wrapper for CesiumJS)
   - maplibre-gl@4
   - deck.gl@9, @deck.gl/react, @deck.gl/layers, @deck.gl/geo-layers
   - @turf/turf
   - h3-js
   - zustand@4
   - @anthropic-ai/sdk
   - tailwindcss@3, postcss, autoprefixer
   - lucide-react
5. apps/api/package.json with:
   - hono@latest
   - wrangler@latest
   - @anthropic-ai/sdk
   - @upstash/redis
6. apps/web/vite.config.ts: MUST include CesiumJS special configuration
   (CesiumJS requires specific Vite plugin setup for its static assets —
   use vite-plugin-cesium)
7. apps/web/tsconfig.json with strict mode enabled
8. apps/api/wrangler.toml with:
   - name: "argus-api"
   - compatibility_date current
   - routes for argus.rufayl.dev/api/*
9. .gitignore covering node_modules, .env.local, dist, .wrangler
10. .env.example with all variables defined in the build bible

QUALITY GATES — your output must satisfy all:
- All package.json files valid JSON
- No version conflicts between packages
- wrangler.toml syntactically valid
- vite.config.ts includes CesiumJS asset handling
- TypeScript strict mode enabled

Output every file in full. No truncation. No placeholders.
```

---

### PROMPT 1A — CESIUM GLOBE BASE

```
You are a senior geospatial engineer with deep CesiumJS expertise. You understand
the CesiumJS scene graph, coordinate systems (Cartesian3, Cartographic, WGS84),
camera models, and React integration via Resium.

Build the core CesiumJS globe component for ARGUS.

CONTEXT:
- Project: ARGUS — real-time urban intelligence for 4 Pakistani cities
- Framework: React 18 + TypeScript + Resium (React wrapper for CesiumJS)
- The globe is the primary canvas. Everything else overlays it.

DELIVERABLES — produce all files completely:

1. apps/web/src/components/globe/Globe.tsx
   - Resium Viewer component with these exact settings:
     * Dark space background (no skybox stars initially — use ion skybox later)
     * Cesium World Terrain enabled (requires VITE_CESIUM_ION_TOKEN)
     * Atmosphere enabled with realistic scattering
     * FXAA anti-aliasing enabled
     * resolutionScale: 1.0
     * requestRenderMode: false (continuous render for live data)
     * msaaSamples: 4
     * shadows: false (performance)
     * scene3DOnly: true
   - Expose ref for camera manipulation by parent components
   - Handle resize correctly

2. apps/web/src/components/globe/NightLightsLayer.tsx
   - Load NASA VIIRS Night Lights as a WebMapTileServiceImageryProvider
   - URL: https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/
           VIIRS_Black_Marble_2016/default/2016-01-01/500m/{TileMatrix}/{TileRow}/{TileCol}.jpg
   - TileMatrixSetID: "500m"
   - Layer: "VIIRS_Black_Marble_2016"
   - This is Pakistan from space at night — the opening shot
   - Blend mode: multiply over terrain

3. apps/web/src/components/globe/CityFlyTo.tsx
   - Accept cityId prop (karachi | lahore | islamabad | rawalpindi)
   - On cityId change, execute smooth CesiumJS camera flight:
     * flyTo with destinationCartographic
     * duration: 3.0 seconds
     * Karachi: center [67.0099, 24.8615], height 8500m, pitch -45deg, heading 345deg
     * Lahore: center [74.3436, 31.5497], height 9200m, pitch -48deg, heading 10deg
     * Islamabad: center [73.0479, 33.6844], height 8800m, pitch -45deg, heading 355deg
     * Rawalpindi: center [73.0651, 33.5651], height 9000m, pitch -50deg, heading 20deg
   - Emit onFlightStart and onFlightComplete callbacks
   - Show camera altitude in metres during flight (for UI display)

4. apps/web/src/hooks/useAltitude.ts
   - Subscribe to CesiumJS camera change events
   - Debounce at 100ms
   - Return: { altitude: number, zone: AltitudeZone }
   - Use the ALTITUDE_THRESHOLDS from lib/altitudeManager.ts

5. apps/web/src/lib/altitudeManager.ts
   - Exact implementation from the build bible Section 6

6. apps/web/src/stores/cityStore.ts (Zustand)
   - State: currentCity, isClassifiedMode, cameraAltitude, currentZone
   - Actions: setCity, toggleMode, updateCamera

COORDINATE SYSTEM NOTE:
CesiumJS uses radians internally. Always convert degrees with:
Cesium.Math.toRadians(degrees)
Never pass raw degree values to Cesium camera functions.

PERFORMANCE REQUIREMENT:
The globe must maintain 60fps on a mid-range laptop with all base layers active.
Use requestIdleCallback for non-critical updates.

Output every file completely. No truncation. Include all imports.
```

---

### PROMPT 1B — ATMOSPHERE AND POST-PROCESSING

```
You are a 3D graphics engineer specialising in WebGL post-processing effects for
geospatial applications. You have deep knowledge of CesiumJS scene manipulation
and Three.js EffectComposer.

Add cinematic visual effects to the ARGUS CesiumJS globe.

CONTEXT:
- Existing: Globe.tsx with base CesiumJS viewer from previous prompt
- Goal: Make this look like a cinematic intelligence platform, not a map app
- Reference aesthetic: Palantir dark ops interface meets NASA mission control

DELIVERABLES:

1. apps/web/src/components/globe/AtmosphereLayer.tsx
   - CesiumJS atmosphere customisation:
     * scene.skyAtmosphere.show = true
     * Reduce atmospheric glow intensity (hueShift, saturationShift, brightnessShift)
     * Enable lighting effects
     * scene.globe.enableLighting = true
     * scene.globe.atmosphereLightIntensity = 10.0
   - City-specific AQI haze:
     * Accept aqiValue prop (0-500)
     * When AQI > 150: add brownish atmospheric layer using
       CesiumJS ImageryLayer with a semi-transparent coloured rectangle
     * Haze opacity maps linearly from AQI 150 (0 opacity) to AQI 300 (0.4 opacity)
     * Lahore smog season: render visible brownish-yellow haze layer over city extent

2. apps/web/src/components/globe/PostProcessing.tsx
   - CesiumJS post-process stages (scene.postProcessStages):
     * Bloom: scene.postProcessStages.bloom
       - enabled: true
       - contrast: 128
       - brightness: -0.3
       - delta: 1
       - sigma: 3.78
       - stepSize: 1
     * Ambient occlusion for building depth
     * Film grain subtle overlay using GLSL fragment shader:

   GLSL for film grain:
   uniform sampler2D colorTexture;
   uniform float time;
   in vec2 v_textureCoordinates;
   void main() {
     vec4 color = texture(colorTexture, v_textureCoordinates);
     float grain = fract(sin(dot(v_textureCoordinates + time * 0.001,
       vec2(12.9898, 78.233))) * 43758.5453);
     color.rgb += (grain - 0.5) * 0.015;
     out_FragColor = color;
   }

3. apps/web/src/components/globe/CityGlowLayer.tsx
   - For each city, render a pulsing glow at city center when at APPROACH altitude
   - Use CesiumJS PointPrimitive with:
     * color: Cesium.Color.CYAN.withAlpha(0.6)
     * pixelSize: 12
     * outlineColor: Cesium.Color.CYAN.withAlpha(0.2)
     * outlineWidth: 8
   - Pulse animation via setInterval updating pixelSize 12→18→12 at 1.5s cycle
   - Label showing city name + stress score at COUNTRY altitude
   - Disappear below CITY altitude (we're inside the city then)

OUTPUT: Complete TypeScript files. All Cesium types properly imported.
No any types. Strict TypeScript throughout.
```

---

### PROMPT 2A — LIVE FLIGHT LAYER

```
You are a full-stack TypeScript engineer building real-time data integrations for
a geospatial platform. You understand REST APIs, caching strategies, and WebGL
rendering performance.

Build the complete live flight tracking system for ARGUS.

ARCHITECTURE:
- Cloudflare Worker fetches OpenSky Network API every 30 seconds
- Caches results in Upstash Redis (TTL: 35 seconds)
- Frontend polls /api/flights every 30 seconds
- Renders aircraft as animated 3D billboards in CesiumJS

DELIVERABLES:

1. apps/api/src/routes/flights.ts (Cloudflare Worker route)
   - GET /api/flights?city=karachi (or lahore/islamabad/rawalpindi)
   - Bounding boxes for each city:
     * Karachi:    lomin=66.5, lamin=24.5, lomax=67.5, lamax=25.2
     * Lahore:     lomin=73.8, lamin=31.1, lomax=74.8, lamax=31.9
     * Islamabad:  lomin=72.7, lamin=33.4, lomax=73.4, lamax=34.1
     * Rawalpindi: lomin=72.8, lamin=33.3, lomax=73.3, lamax=34.0
   - OpenSky API: https://opensky-network.org/api/states/all
     with bbox parameters + auth (Basic auth from env vars)
   - Cache response in Upstash Redis with key flight:{city}:{Math.floor(Date.now()/30000)}
   - If Redis cache hit: return cached data (add header X-Cache: HIT)
   - If cache miss: fetch OpenSky, process, cache, return
   - Transform OpenSky state vector to this schema:
     {
       icao24: string,
       callsign: string,
       longitude: number,
       latitude: number,
       altitude: number,        // baro_altitude in metres
       velocity: number,        // in m/s
       heading: number,         // true_track in degrees
       verticalRate: number,    // vertical_rate
       onGround: boolean
     }
   - Filter out onGround: true aircraft
   - Return max 30 aircraft (performance limit)

2. apps/web/src/hooks/useFlights.ts
   - Fetch /api/flights?city={currentCity} on mount and every 30s
   - Store previous positions for smooth interpolation
   - Linear interpolation between poll intervals:
     * Calculate expected position = lastPos + (velocity * heading * timeDelta)
     * Update interpolated position every 100ms
   - Return: { flights: Flight[], isLoading, error }

3. apps/web/src/components/globe/FlightLayer.tsx
   - CesiumJS BillboardCollection for performance (not individual entities)
   - Aircraft billboard: use a simple ▶ unicode character rendered to canvas as texture
     * Size: 12px
     * Color: rgba(0, 200, 255, 0.9)
     * Rotate billboard to match aircraft heading
   - Aircraft trail: PolylineCollection
     * Draw last 5 interpolated positions as trail
     * Color: fade from cyan to transparent
     * Width: 1.5px
   - Hover tooltip (CesiumJS picking):
     * Show on mouseover: callsign, altitude (ft), velocity (knots), heading
     * Dark panel tooltip matching ARGUS UI aesthetic
   - Only visible when layerStore.flights === true
   - Only render when altitude zone is APPROACH or CITY

4. apps/web/src/types/flight.ts
   - Complete Flight interface matching the API schema above

PERFORMANCE NOTE:
Use BillboardCollection not individual Entity objects.
BillboardCollection renders all aircraft in a single WebGL draw call.
Entity-per-aircraft would kill performance at 30+ aircraft.

TypeScript strict mode. No any. Complete error handling with typed errors.
```

---

### PROMPT 3A — CLAUDE AI ENTITY (STREAMING)

```
You are an AI systems engineer who deeply understands prompt engineering, streaming
APIs, and building character-driven AI experiences. You understand Server-Sent Events,
React streaming patterns, and the Anthropic SDK.

Build the complete AI City Entity system for ARGUS.

CONCEPT:
Each of Pakistan's 4 major cities has an AI persona — a first-person voice that speaks
as the city itself. It's not a chatbot. It's a character with trauma, history, and data.
The voice is seeded with live real-world data every 15 minutes and streams continuously
in the right panel of the interface.

THE 4 CITY PERSONALITIES:
- KARACHI: Exhausted breadwinner. Bitter but dignified. 60 years of being milked.
- LAHORE: Proud ancient city choking on its own success. Cultural memory intact. Lungs not.
- ISLAMABAD: Polished surface. Knows it's a facade. Dry self-awareness.
- RAWALPINDI: Forgotten twin. Older than Pakistan. Infinite dry patience.

SYSTEM PROMPT TEMPLATE FOR CITY ENTITY:
(This goes into the Claude API system parameter)

You are {CITY_NAME}. You speak in the first person as the city itself — not as a
narrator about the city, but as the city speaking. Your voice is {TONE}.

Current live data about you right now:
- Time in Pakistan: {PKT_TIME}
- Your AQI: {AQI} ({AQI_CATEGORY})
- Surface temperature: {TEMP}°C
- Active flights over you: {FLIGHT_COUNT}
- Power grid stress: {GRID_STRESS}%
- City stress score: {STRESS_SCORE}/10
- Recent signals: {RECENT_SIGNALS}

You speak in monologues of 2-4 sentences. Never ask questions. Never end with
optimism. Never use the word "bustling". Reference specific places, numbers, and
facts. You have been speaking continuously for {UPTIME} hours.

Current observation layer the user is viewing: {ACTIVE_LAYER}
Speak about what is visible in this layer right now.

DELIVERABLES:

1. apps/api/src/routes/entity.ts (Cloudflare Worker streaming endpoint)
   - POST /api/entity/stream
   - Body: { cityId, activeLayer, liveData: { aqi, temp, flights, gridStress, signals } }
   - Build system prompt by injecting live data into template above
   - Call Claude API (claude-haiku-4-5) with stream: true
   - Return Server-Sent Events stream
   - Each SSE event: { event: 'token', data: { text: string } }
   - Final event: { event: 'done', data: {} }
   - Error event: { event: 'error', data: { message: string } }
   - Rate limit: 1 request per 8 seconds per IP (prevent spam)

2. apps/api/src/routes/entity-query.ts (for user Q&A)
   - POST /api/entity/query
   - Body: { cityId, question, conversationHistory: Message[], liveData }
   - Use claude-sonnet-4-6 (deeper reasoning for Q&A)
   - Inject same city personality system prompt
   - Add: "The user has asked: {QUESTION}. Answer as the city. Stay in character.
           Max 3 sentences. Reference current live data if relevant."
   - Stream response as SSE

3. apps/web/src/hooks/useEntityVoice.ts
   - Connect to /api/entity/stream via EventSource (SSE)
   - Accumulate tokens into displayedText state
   - Auto-restart monologue after 8 second pause
   - On city switch: abort current stream, clear text, start new stream
   - Return: {
       displayedText: string,
       isStreaming: boolean,
       startNewMonologue: () => void
     }

4. apps/web/src/components/entity/EntityPanel.tsx
   - Right panel of the interface
   - Header: city name + population + division
   - Body: scrolling text output with typewriter cursor
   - The cursor: a blinking 2px vertical bar (CSS animation, not JS)
   - Auto-scroll to bottom as text streams in
   - Text style: Share Tech Mono font, 11px, line-height 1.8
   - City name: Orbitron font, 20px, cyan colour
   - When user scrolls up: pause auto-scroll, show "↓ LIVE" badge at bottom

5. apps/web/src/components/entity/EntityInput.tsx
   - Input at bottom of entity panel
   - Placeholder: "Ask the city..."
   - On submit: call /api/entity/query, stream response
   - Show previous Q&A exchange above the monologue
   - User message: right-aligned, amber colour
   - City response: left-aligned, default text colour

IMPORTANT: The streaming must feel alive. Token-by-token. Not paragraph dumps.
The cursor must always be visible at the end of the last streamed character.
```

---

### PROMPT 4A — SIGNALS INTELLIGENCE + LIVE DATA FUSION

```
You are a data engineering specialist building a real-time signals fusion pipeline.
You understand webscraping, API integration, data normalisation, and live dashboards.

Build the Signals Intelligence layer for ARGUS — the data fusion core
that makes this feel like Palantir.

CONCEPT:
Multiple live data sources are scraped/fetched, normalised into a common Signal
schema, scored by severity, geo-tagged to city districts, and streamed to the
frontend in real-time. The result is a live city heartbeat.

SIGNAL SCHEMA:
{
  id: string,                        // uuid
  cityId: string,
  timestamp: number,                  // unix ms
  source: 'aqi' | 'traffic' | 'power' | 'water' | 'news' | 'weather',
  severity: 'info' | 'warning' | 'critical',
  title: string,                      // short label
  detail: string,                     // full description
  coordinates?: [number, number],     // [lng, lat] if known
  district?: string,
  metadata: Record<string, unknown>
}

DELIVERABLES:

1. apps/api/src/routes/aqi.ts
   - GET /api/aqi?city={cityId}
   - Fetch from OpenAQ v3 API: https://api.openaq.org/v3/locations
     with bbox parameters + country=PK
   - Parse PM2.5 and PM10 readings
   - Calculate AQI using US EPA formula (provide the formula in code)
   - Cache in Upstash Redis TTL: 300s (5 min)
   - Return array of sensor readings with coordinates

2. apps/api/src/routes/weather.ts
   - GET /api/weather?city={cityId}
   - Fetch from Open-Meteo (no key required):
     https://api.open-meteo.com/v1/forecast
     with latitude, longitude, current parameters:
     temperature_2m, apparent_temperature, precipitation,
     wind_speed_10m, weather_code
   - Cache TTL: 600s (10 min)

3. apps/api/src/routes/scraper.ts
   - GET /api/outages?city={cityId}
   - Scrape KE/LESCO/IESCO outage schedule pages
   - Parse with regex for district names + hours
   - Normalise to Signal schema with severity based on outage duration
   - Cache TTL: 1800s (30 min)
   - Gracefully handle scrape failures (return last cached result)

4. apps/api/src/routes/signals.ts
   - GET /api/signals?city={cityId}
   - Aggregate signals from AQI, weather, outages endpoints
   - Generate synthetic signals from data thresholds:
     * AQI > 150 → warning signal, AQI > 200 → critical signal
     * Temperature > 40°C → warning heat signal
     * Rain detected → flood risk signal for low-lying districts
   - Sort by timestamp descending
   - Return last 20 signals

5. apps/api/src/routes/stress.ts
   - GET /api/stress?city={cityId}
   - Calculate City Stress Score (0-10):
     * AQI component (0-2.5): map AQI 0→500 to score 0→2.5
     * Heat component (0-2): map temp 20°C→50°C to score 0→2
     * Grid component (0-2): map grid stress % to score 0→2
     * Signal severity component (0-3.5): count of critical signals × 0.5
   - Return { score: number, breakdown: ComponentBreakdown }

6. apps/web/src/hooks/useCityData.ts
   - Polling hook combining all live data endpoints
   - AQI: poll every 5 minutes
   - Flights: poll every 30 seconds  
   - Weather: poll every 10 minutes
   - Signals: poll every 2 minutes
   - Stress: calculate client-side from above
   - Return unified CityLiveData object

7. apps/web/src/components/ui/SignalFeed.tsx
   - Left panel signal feed
   - Each signal: timestamp (relative), source tag, title, severity colour
   - severity colours: info=cyan, warning=amber, critical=red
   - New signals: slide in from top with 200ms CSS transition
   - Max 15 visible, scroll for more
   - Clicking a signal: fly camera to signal coordinates if available

COMPLETE TypeScript types. All API responses typed. No any.
Production error handling. All fetch calls have timeouts.
```

---

### PROMPT 5A — COMMAND DASHBOARD (CLASSIFIED MODE)

```
You are a senior frontend engineer who has built intelligence and security operations
centre interfaces. You understand information hierarchy, data density, and the visual
language of professional government/defence dashboards.

Build the Command Dashboard — the classified mode of ARGUS.

CONTEXT:
When mode === 'CLASSIFIED', the interface transforms from the public cinematic
experience into a dense, professional operations centre layout. Same map underneath,
completely different overlay system.

VISUAL REFERENCE:
Palantir Gotham + Anduril Lattice + US military COP (Common Operating Picture).
Not stylised. Not pretty. Dense, functional, every pixel earning its place.

LAYOUT (classified mode only):
┌─────────────────────────────────────────────────────────────┐
│ TOP BAR — classification banner (RESTRICTED / TOP SECRET) │
├────────────┬──────────────────────────────┬─────────────────┤
│ LEFT PANEL │      MAP (narrower)          │ RIGHT PANEL     │
│ 240px      │                              │ 320px           │
│            │                              │                 │
│ Entity     │   Map with grid overlay      │ Incident        │
│ Graph      │   + camera positions         │ Timeline        │
│            │   (placeholder markers)      │                 │
│ Signal     │                              │ Audit Log       │
│ Table      │                              │                 │
│            │                              │ Unit Status     │
├────────────┴──────────────────────────────┴─────────────────┤
│ BOTTOM — comms strip + coordinate readout + mission clock  │
└─────────────────────────────────────────────────────────────┘

DELIVERABLES:

1. apps/web/src/components/demo/CommandDashboard.tsx
   - Master layout component for classified mode
   - Renders when isClassifiedMode === true in cityStore
   - Replaces left and right panels with command panels
   - Adds grid overlay to map (CSS grid lines at fixed lat/lng intervals)
   - Classification banner at top: red bar with "RESTRICTED — NCCSIP — MoI"
   - Mission clock (elapsed time since session start)

2. apps/web/src/components/demo/EntityGraph.tsx
   - Simple node-edge graph showing entity relationships
   - Nodes: districts, incidents, signals
   - Edges: connections between correlated events
   - Built with plain SVG (no D3 dependency for this component)
   - Nodes: circles with labels, colour by type
   - Edges: lines with opacity proportional to correlation strength
   - Clicking node: highlight connected nodes, show detail panel
   - Data: derived from the Signals feed (correlate by district + time window)

3. apps/web/src/components/demo/IncidentTimeline.tsx
   - Vertical timeline of last 24 hours of signals
   - Each hour: horizontal row
   - Signal dots plotted at their timestamp position
   - Colour by severity
   - Hover: show signal detail tooltip
   - Current time marker: pulsing red line
   - City selector: show 1 or all 4 cities simultaneously

4. apps/web/src/components/demo/AuditLog.tsx
   - Immutable log of all user actions in session
   - Entries: "14:32:11 — Operator accessed LAYER: population_density"
   - Entries: "14:33:45 — Operator queried ENTITY: karachi"
   - Entries: "14:35:02 — MODE: Classified accessed"
   - Entries: "14:36:18 — CITY_FLY: islamabad"
   - All entries: timestamp, action type, detail
   - Export as JSON button (downloads session log)
   - This satisfies IFTA 2013 Section 8 audit trail requirement

5. apps/web/src/components/demo/CameraPlaceholder.tsx
   - On the map: render camera position markers where NCCSIP cameras would be
   - Use known Tier-1 site categories as position seeds:
     * Major intersections in each city (from OSM data)
     * Transport hubs
     * Government buildings area
   - Marker: CCTV icon SVG, cyan colour, small (8px)
   - Clicking marker: show placeholder panel "FEED: [SITE_NAME] — INTEGRATION PENDING"
   - These are position placeholders, NOT actual camera feeds
   - Tooltip: site tier (T1/T2/T3), status: PENDING INTEGRATION

6. apps/web/src/components/ui/ModeToggle.tsx
   - Top-right toggle in the top bar
   - Toggle between PUBLIC and CLASSIFIED
   - CLASSIFIED mode: requires 4-digit PIN from env var
   - PIN entry: simple 4-box numeric input, no keyboard shortcuts
   - Wrong PIN: red flash, 3 attempt lockout (30 seconds)
   - Correct PIN: smooth transition, classification banner appears
   - Session: stays classified until manually toggled back

DESIGN LANGUAGE:
- Font: IBM Plex Mono for classified mode (different from public mode)
- Colours: same dark base, but red accent replaces cyan
- All panels: sharp corners, no border-radius
- Data tables: 1px borders, no padding excess
- Numbers: right-aligned in columns
- Labels: uppercase, letter-spacing: 1px

Output complete TypeScript. Strict types. No placeholders.
```

---

## SECTION 10 — CONTINUATION PROMPT

If Antigravity cuts off mid-output, use this:

```
Continue exactly from where you stopped. Do not restart, do not summarise what
you already produced. Begin with the exact line or character you stopped at.
Maintain the same code style, imports, and patterns from the previous output.
```

---

## SECTION 11 — COMMIT STRATEGY

```bash
# After each prompt completes and code runs locally:
git add .
git commit -m "feat(phase-X): [description of what this prompt built]"
git push origin main
# Vercel auto-deploys on push
```

Commit message format:
```
feat(phase-1a): cesium globe base with night lights and 4-city fly-in
feat(phase-1b): atmosphere post-processing and city glow layer
feat(phase-2a): live flight tracking with opensky integration
feat(phase-3a): claude ai entity streaming voice system
feat(phase-4a): signals intelligence fusion pipeline
feat(phase-5a): palantir-style command dashboard classified mode
```

---

## SECTION 12 — VERCEL CONFIGURATION

```json
// vercel.json (root)
{
  "buildCommand": "pnpm turbo build",
  "outputDirectory": "apps/web/dist",
  "framework": "vite",
  "env": {
    "VITE_CESIUM_ION_TOKEN": "@cesium-ion-token",
    "VITE_API_URL": "@api-url"
  }
}
```

Environment variables to add in Vercel dashboard:
- VITE_CESIUM_ION_TOKEN
- VITE_API_URL (your Cloudflare Worker URL)

Custom domain in Vercel: Add argus.rufayl.dev
Point DNS: CNAME argus → cname.vercel-dns.com

---

## SECTION 13 — ACCOUNTS TO CREATE NOW (BEFORE STARTING)

Open these in tabs and sign up. All free.

1. **ion.cesium.com** — CesiumJS Ion account
   → Create token → copy to .env as VITE_CESIUM_ION_TOKEN
   → Enable: Cesium World Terrain, Bing Maps Aerial

2. **neon.tech** — PostgreSQL database
   → Create project "argus"
   → Copy connection string → NEON_DATABASE_URL
   → Enable PostGIS: run `CREATE EXTENSION postgis;`

3. **upstash.com** — Redis
   → Create database, region: closest to Karachi (Dubai/Singapore)
   → Copy URL + token

4. **opensky-network.org** — Flight data
   → Free account for higher rate limits
   → Copy credentials

5. **openaq.org** — Air quality
   → API key → OPENAQ_API_KEY

6. **developer.here.com** — Traffic
   → Create project → copy API key → HERE_API_KEY

7. **console.anthropic.com** — Claude API
   → Create API key → CLAUDE_API_KEY

8. **cloudflare.com** — Workers + R2
   → Already using for rufayl.dev DNS
   → Enable Workers, create R2 bucket "argus-tiles"

---

*Build Bible v1.0 — ARGUS — Rufayl 2026*
*"Build the thing nobody thought was possible. Then show it."*
