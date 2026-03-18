// ============================================================
// File: apps/web/src/workers/satellite.worker.ts
// ARGUS — Orbital Mechanics Web Worker
//
// WHY A WEB WORKER:
//   SGP4 propagation for 10,000+ satellites every 200ms
//   = ~50,000 trig operations per second on main thread
//   = UI freezes, 1fps, unusable globe
//   Web Worker = runs on separate CPU core, zero UI impact
//
// DATA FLOW:
//   1. Worker receives START message
//   2. Fetches TLE data via /api/tle proxy (CORS-safe)
//   3. Parses TLEs with satellite.js twoline2satrec()
//   4. Every 200ms: propagates all satellites to NOW
//   5. Posts POSITIONS array back to main thread
//   6. Main thread updates PointPrimitiveCollection
//
// TLE SOURCES (via Cloudflare Worker proxy):
//   celestrak.org/GPGP/groups/active.txt   — all active sats
//   celestrak.org/GPGP/groups/starlink.txt — Starlink fleet
//   celestrak.org/GPGP/groups/stations.txt — ISS, Tiangong
//   celestrak.org/GPGP/groups/gps-ops.txt  — GPS constellation
//
// SATELLITE CATEGORIES:
//   starlink — SpaceX Starlink (cyan)
//   gps      — GPS / GLONASS / Galileo (amber)
//   iss      — Space stations: ISS, Tiangong (red)
//   weather  — NOAA, Meteosat, Himawari (green)
//   military — Known military designations (orange)
//   other    — Everything else (dim white)
//
// PAKISTAN COVERAGE:
//   Satellites in bbox 23.5-37.5°N, 60.8-77.8°E
//   are highlighted with larger pixelSize + full opacity
// ============================================================

import * as satellite from 'satellite.js';

// ── Pakistan bounding box ─────────────────────────────────────
const PK_LAT_MIN = 23.5;
const PK_LAT_MAX = 37.5;
const PK_LON_MIN = 60.8;
const PK_LON_MAX = 77.8;

// ── TLE proxy endpoint ────────────────────────────────────────
// Worker cannot use import.meta.env — hardcode API base
// The proxy adds CORS headers and caches for 6 hours
const API_BASE = 'http://localhost:8787';

// ── TLE source list ───────────────────────────────────────────
const TLE_SOURCES = [
  {
    url: 'https://celestrak.org/GPGP/groups/active.txt',
    category: 'other' as const,
    label: 'Active satellites',
  },
  {
    url: 'https://celestrak.org/GPGP/groups/starlink.txt',
    category: 'starlink' as const,
    label: 'Starlink constellation',
  },
  {
    url: 'https://celestrak.org/GPGP/groups/stations.txt',
    category: 'iss' as const,
    label: 'Space stations',
  },
  {
    url: 'https://celestrak.org/GPGP/groups/gps-ops.txt',
    category: 'gps' as const,
    label: 'GPS constellation',
  },
  {
    url: 'https://celestrak.org/GPGP/groups/weather.txt',
    category: 'weather' as const,
    label: 'Weather satellites',
  },
];

// ── Types ─────────────────────────────────────────────────────
type SatCategory =
  | 'starlink'
  | 'gps'
  | 'iss'
  | 'weather'
  | 'military'
  | 'other';

interface SatRecord {
  satrec: satellite.SatRec;
  name: string;
  noradId: string;
  category: SatCategory;
}

interface SatPosition {
  lat: number;
  lon: number;
  altM: number;   // metres
  altKm: number;   // km
  velocityKms: number; // km/s
  name: string;
  noradId: string;
  category: SatCategory;
  isOverPakistan: boolean;
  // Visual properties computed in worker
  // NOTE: 'color' is no longer CSS — it's the category string.
  // Main thread maps category → Cesium.Color directly.
  pixelSize: number;
  opacity: number;
}

// ── State ──────────────────────────────────────────────────────
let records: SatRecord[] = [];
let computeId: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

// ── Category detection from satellite name ────────────────────
function detectCategory(
  name: string,
  sourceCat: SatCategory
): SatCategory {
  const n = name.toLowerCase();

  // Override source category with name-based detection
  // for satellites that appear in 'active' but have specific types
  if (n.includes('starlink')) return 'starlink';
  if (n.includes('gps') || n.includes('navstar')) return 'gps';
  if (n.includes('glonass')) return 'gps';
  if (n.includes('galileo')) return 'gps';
  if (n.includes('beidou') || n.includes('compass')) return 'gps';
  if (n.includes('iss') || n.includes('zarya')) return 'iss';
  if (n.includes('tiangong') || n.includes('tianhe')) return 'iss';
  if (n.includes('noaa') || n.includes('meteosat')) return 'weather';
  if (n.includes('goes') || n.includes('himawari')) return 'weather';
  if (n.includes('dmsp') || n.includes('lacrosse')) return 'military';
  if (n.includes('usa-') || n.includes('nro')) return 'military';

  // Fall back to source-declared category
  return sourceCat;
}

// ── Visual properties by category ────────────────────────────
function getCategoryVisuals(
  cat: SatCategory,
  isOverPK: boolean
): { color: string; pixelSize: number; opacity: number } {
  let colorStr = 'rgba(255,255,255,0.3)';
  if (cat === 'starlink') colorStr = 'rgba(0,200,255,0.7)';
  else if (cat === 'gps') colorStr = 'rgba(255,184,0,0.8)';
  else if (cat === 'iss') colorStr = 'rgba(255,48,64,1.0)';
  else if (cat === 'weather') colorStr = 'rgba(0,255,136,0.7)';
  else if (cat === 'military') colorStr = 'rgba(255,136,0,0.8)';

  let pixelSize = isOverPK ? 5 : 2;
  if (cat === 'iss') pixelSize = isOverPK ? 7 : 4;

  let opacity = 1.0;

  return { color: colorStr, pixelSize, opacity };
}

// ── Parse TLE text into SatRecord array ───────────────────────
function parseTLEText(
  text: string,
  sourceCat: SatCategory
): SatRecord[] {
  const parsed: SatRecord[] = [];
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  for (let i = 0; i + 2 < lines.length; i += 3) {
    const rawName = lines[i].replace(/^0\s+/, '').trim();
    const tle1 = lines[i + 1];
    const tle2 = lines[i + 2];

    // Validate TLE line starts
    if (!tle1.startsWith('1 ') || !tle2.startsWith('2 ')) {
      continue;
    }

    try {
      const satrec = satellite.twoline2satrec(tle1, tle2);
      const noradId = satrec.satnum.toString().trim();
      const category = detectCategory(rawName, sourceCat);

      parsed.push({ satrec, name: rawName, noradId, category });
    } catch {
      // Skip malformed TLEs silently
    }
  }

  return parsed;
}

// ── Fetch TLE data via Worker proxy ───────────────────────────
async function fetchTLESource(
  url: string,
  category: SatCategory,
  label: string
): Promise<SatRecord[]> {
  try {
    const proxyUrl =
      `${API_BASE}/api/tle?url=${encodeURIComponent(url)}`;

    const res = await fetch(proxyUrl, {
      headers: { 'Accept': 'text/plain' },
    });

    if (!res.ok) {
      console.warn(
        `[SAT WORKER] ${label}: HTTP ${res.status}`
      );
      return [];
    }

    const text = await res.text();
    const batch = parseTLEText(text, category);

    console.log(
      `[SAT WORKER] ${label}: ${batch.length} satellites parsed`
    );

    return batch;
  } catch (e) {
    console.error(`[SAT WORKER] ${label} failed:`, e);
    return [];
  }
}

// ── Load all TLE sources ───────────────────────────────────────
async function loadAllTLEs(): Promise<void> {
  console.log('[SAT WORKER] Loading TLE data...');

  // Fetch all sources in parallel
  const batches = await Promise.all(
    TLE_SOURCES.map(s =>
      fetchTLESource(s.url, s.category, s.label)
    )
  );

  // Deduplicate by NORAD ID
  // If a satellite appears in multiple sources,
  // the category from the more specific source wins
  // (starlink.txt beats active.txt for Starlink sats)
  const seen = new Map<string, SatRecord>();

  for (const batch of batches) {
    for (const rec of batch) {
      // Don't overwrite 'other' if we already have a better category
      const existing = seen.get(rec.noradId);
      if (!existing || existing.category === 'other') {
        seen.set(rec.noradId, rec);
      }
    }
  }

  records = Array.from(seen.values());

  console.log(
    `[SAT WORKER] Total unique satellites: ${records.length}`
  );

  // Log category breakdown
  const counts = records.reduce(
    (acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  console.log('[SAT WORKER] Categories:', counts);
}

// ── Compute all satellite positions ───────────────────────────
function computePositions(): SatPosition[] {
  if (!records.length) return [];

  const now = new Date();
  const gmst = satellite.gstime(now);
  const out: SatPosition[] = [];

  for (const rec of records) {
    try {
      const pv = satellite.propagate(rec.satrec, now);

      // propagate returns false for error or decayed satellite
      if (!pv || !pv.position || typeof pv.position === 'boolean') continue;

      const pos = pv.position as satellite.EciVec3<number>;
      const vel = (pv.velocity && typeof pv.velocity !== 'boolean' ? pv.velocity : null) as satellite.EciVec3<number> | null;

      // Convert ECI to geographic
      const geo = satellite.eciToGeodetic(pos, gmst);

      const lat = satellite.degreesLat(geo.latitude);
      const lon = satellite.degreesLong(geo.longitude);
      const altKm = geo.height; // km

      // Skip satellites below 100km (decayed / re-entering)
      // Skip above 60,000km (invalid propagation result)
      if (altKm < 100 || altKm > 60000) continue;

      // Skip NaN coordinates
      if (!isFinite(lat) || !isFinite(lon)) continue;

      // Velocity magnitude in km/s
      const velocityKms = vel
        ? Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2)
        : 0;

      const isOverPakistan =
        lat >= PK_LAT_MIN && lat <= PK_LAT_MAX &&
        lon >= PK_LON_MIN && lon <= PK_LON_MAX;

      const { pixelSize, opacity } =
        getCategoryVisuals(rec.category, isOverPakistan);

      out.push({
        lat,
        lon,
        altM: altKm * 1000,
        altKm,
        velocityKms,
        name: rec.name,
        noradId: rec.noradId,
        category: rec.category,
        isOverPakistan,
        pixelSize,
        opacity,
      });
    } catch {
      // Skip satellites that fail to propagate
    }
  }

  return out;
}

// ── Compute loop ───────────────────────────────────────────────
function startComputeLoop(): void {
  if (computeId) return; // already running

  computeId = setInterval(() => {
    if (!records.length) return;

    const positions = computePositions();

    self.postMessage({
      type: 'POSITIONS',
      positions,
      timestamp: Date.now(),
      total: positions.length,
      overPK: positions.filter(p => p.isOverPakistan).length,
    });
  }, 200); // 5fps position updates — smooth enough for orbits
}

// ── Message handler ───────────────────────────────────────────
self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data;

  if (type === 'START' && !isRunning) {
    isRunning = true;
    self.postMessage({ type: 'LOADING' });

    await loadAllTLEs();

    if (!records.length) {
      self.postMessage({
        type: 'ERROR',
        message: 'No TLE data loaded — check Worker API proxy',
      });
      return;
    }

    self.postMessage({
      type: 'LOADED',
      count: records.length,
    });

    startComputeLoop();
  }

  if (type === 'STOP') {
    if (computeId) {
      clearInterval(computeId);
      computeId = null;
    }
    isRunning = false;
  }

  // Reload TLE data (called every 6 hours from main thread)
  if (type === 'RELOAD') {
    await loadAllTLEs();
    self.postMessage({
      type: 'LOADED',
      count: records.length,
    });
  }
};