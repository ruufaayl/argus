# ARGUS Phase Log

---

## Session 1 — 19 March 2026

### Completed
- **Globe rendering fixed** — Root cause: `vite-plugin-cesium` couldn't resolve Cesium static assets (SkyBox, ion-credit.png) because `node_modules/cesium/` doesn't exist at the worktree root (pnpm hoists to `.pnpm/`). Fixed by passing `cesiumBuildRootPath` and `cesiumBuildPath` to the plugin pointing to `apps/web/node_modules/cesium/Build/`.
- **Esri World Imagery loading** — NaturalEarth base layer + Esri UrlTemplate overlay. Globe renders satellite imagery smoothly.
- **Click crash fixed** — `LandmarkLayer.tsx` was passing raw OSMFeature data (with `lon`) to `setSelectedEntity()`, but `InsightWidget.tsx` expected `lng`. Mapped OSMFeature fields to LandmarkEntity interface shape (`lon→lng`, derived `city` from OSM tags).
- **Click-to-fly on globe surface** — Clicking anywhere on the globe flies camera to 2km above with -45° pitch and shows a temporary coordinate pin with lat/lng label (auto-removes after 8s).
- **Landmark click → 2km flyTo** — Changed from 800m to 2km altitude on landmark click.
- **Render loop recovery** — Error handler catches "source image could not be decoded" and restarts `useDefaultRenderLoop`.
- **Cesium Ion fully disabled** — Token cleared + `Ion.defaultServer` redirected to about:blank in main.tsx.
- **Created project documentation** — CLAUDE.md, docs/PHASE_LOG.md, docs/CONTEXT_RULES.md

### Currently Working
- CesiumJS globe: Esri satellite imagery, smooth 60fps rendering
- Live flights: ~480 aircraft worldwide via ADS-B (2500km radius), 12-13 military tracked
- Vessels: 29 AIS positions (5 military), Pakistan waters filtering
- Satellites: 14,700+ via CelesTrak TLE proxy, white-blue dots with orbit visualization on click
- Landmarks: T1 (military, airports), T2 (cities, ports, mountains), T3 (lazy-loaded)
- AI intel: Groq synthesis from GDELT headlines
- View modes: NORMAL/NVG/FLIR/MONO/CRT
- Auth gate: Commander PIN lock
- Entity dossiers: Aircraft, Vessel, Satellite detail panels
- Selection ring, projected routes, border checkposts
- Helicopter detection with dedicated SVG icon (~50 ICAO type codes)
- 15s idle auto-zoom back to default Pakistan view
- Max zoom out: 40,000km (see full satellite constellation)
- cancelFlight() crash guards on all flyTo animations

### In Progress
- Weather radar (RainViewer fetch occasionally fails)
- Street traffic layer (not yet implemented)
- Population density layer (not yet implemented)

### Next Priority
1. Implement remaining Data Layer toggles (Government, Transport, Industrial, etc.)
2. Real AIS vessel data via AISStream API (currently simulated)
3. Weather radar reliability
4. Phase 3 completion: full intelligence layer with pattern analysis
5. Phase 4: Cloudflare Workers API backend deployment

### Known Bugs / Blockers
- Weather radar fetch sometimes fails (RainViewer API)
- Landmark OSM data occasionally returns 0 features for some categories
- Flight log messages appear 4x (React StrictMode double-render — cosmetic only)

### Files Touched This Session
- `apps/web/src/components/globe/Globe.tsx` — Rewrote imagery setup, added click-to-fly, 15s idle auto-zoom, 40,000km max zoom, cancelFlight() guards
- `apps/web/src/components/globe/LandmarkLayer.tsx` — Fixed lon→lng mapping, 2km flyTo altitude, cancelFlight() guard
- `apps/web/src/components/globe/layers/FlightLayer.tsx` — Global ADS-B (2500km radius), helicopter SVG icon, Pakistan bounding box filter, cancelFlight() guard
- `apps/web/src/components/globe/layers/VesselLayer.tsx` — Pakistan maritime zone filter, wider visibility range, cancelFlight() guard
- `apps/web/src/components/globe/layers/SatelliteLayer.tsx` — White-blue dots, orbit ring visualization on click, cancelFlight() guard
- `apps/web/src/components/ui/InsightWidget.tsx` — Fixed ThreatGauge crash (value.toFixed → safeValue.toFixed)
- `apps/web/src/main.tsx` — Fully disabled Cesium Ion
- `apps/web/vite.config.ts` — Fixed cesium plugin path resolution, ADS-B radius 500→2500
- `CLAUDE.md` — Created
- `docs/PHASE_LOG.md` — Created
- `docs/CONTEXT_RULES.md` — Created
