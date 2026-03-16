// ============================================================
// flights.ts — Live Flight Data API
// ADS-B Exchange (primary) + OpenSky (backup)
// Merge, deduplicate, cache in Upstash Redis
// ============================================================

import { Hono } from 'hono';

type Bindings = {
  OPENSKY_USERNAME?: string;
  OPENSKY_PASSWORD?: string;
  UPSTASH_REDIS_URL?: string;
  UPSTASH_REDIS_TOKEN?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const CACHE_TTL = 15;

interface NormalizedFlight {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altitudeFt: number;
  speedKts: number;
  headingDeg: number;
  verticalRate: number;
  onGround: boolean;
  type: string;
  registration: string;
  source: 'adsb' | 'opensky' | 'both';
  isMilitary: boolean;
  lastSeen: number;
}

// Redis helper
async function redisGet(url: string, token: string, key: string) {
  try {
    const res = await fetch(`${url}/get/${key}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data: any = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch { return null; }
}

async function redisSet(url: string, token: string, key: string, value: any, ttl: number) {
  try {
    await fetch(`${url}/set/${key}/${JSON.stringify(JSON.stringify(value))}/EX/${ttl}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch { /* ignore */ }
}

// Fetch ADS-B data
async function fetchADSB(url: string): Promise<NormalizedFlight[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Argus/2.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`ADSB: ${res.status}`);
  const data: any = await res.json();
  const planes = data.ac || [];

  return planes
    .filter((p: any) => typeof p.lat === 'number' && typeof p.lon === 'number')
    .map((p: any): NormalizedFlight => {
      const callsign = (p.flight || '').trim();
      const squawk = p.squawk || '';
      const reg = (p.r || '').trim();
      const isMilitary =
        !callsign ||
        squawk === '7777' ||
        (p.dbFlags && (p.dbFlags & 1) !== 0) ||
        (!reg && !callsign);

      return {
        icao24: p.hex || '',
        callsign: callsign || p.hex?.toUpperCase() || 'UNKNOWN',
        lat: p.lat,
        lon: p.lon,
        altitudeFt: typeof p.alt_baro === 'number' ? p.alt_baro : 0,
        speedKts: p.gs || 0,
        headingDeg: p.track || 0,
        verticalRate: p.baro_rate || 0,
        onGround: p.alt_baro === 'ground',
        type: (p.t || '').trim(),
        registration: reg,
        source: 'adsb',
        isMilitary,
        lastSeen: Date.now(),
      };
    });
}

// Fetch OpenSky data
async function fetchOpenSky(url: string, username?: string, password?: string): Promise<NormalizedFlight[]> {
  const headers: Record<string, string> = { 'User-Agent': 'Argus/2.0' };
  if (username && password) {
    headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
  }
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`OpenSky: ${res.status}`);
  const data: any = await res.json();

  return (data.states || [])
    .filter((s: any[]) => typeof s[6] === 'number' && typeof s[5] === 'number')
    .map((s: any[]): NormalizedFlight => ({
      icao24: s[0] || '',
      callsign: (s[1] || '').trim() || s[0]?.toUpperCase() || 'UNKNOWN',
      lat: s[6],
      lon: s[5],
      altitudeFt: typeof s[7] === 'number' ? Math.round(s[7] * 3.28084) : 0,
      speedKts: typeof s[9] === 'number' ? Math.round(s[9] * 1.94384) : 0,
      headingDeg: s[10] || 0,
      verticalRate: typeof s[11] === 'number' ? s[11] : 0,
      onGround: !!s[8],
      type: '',
      registration: '',
      source: 'opensky',
      isMilitary: false,
      lastSeen: Date.now(),
    }));
}

// Merge & deduplicate
function mergeFlights(
  adsb: NormalizedFlight[],
  opensky: NormalizedFlight[]
): NormalizedFlight[] {
  const map = new Map<string, NormalizedFlight>();
  // ADS-B first (higher priority)
  for (const f of adsb) {
    if (f.icao24) map.set(f.icao24, f);
  }
  // OpenSky — merge or add
  for (const f of opensky) {
    if (!f.icao24) continue;
    const existing = map.get(f.icao24);
    if (existing) {
      existing.source = 'both';
      // Fill missing fields from OpenSky
      if (!existing.callsign || existing.callsign === existing.icao24.toUpperCase()) {
        existing.callsign = f.callsign;
      }
    } else {
      map.set(f.icao24, f);
    }
  }
  return Array.from(map.values());
}

app.get('/', async (c) => {
  const latStr = c.req.query('lat');
  const lonStr = c.req.query('lon');
  const lat = latStr ? parseFloat(latStr) : 30.3753;
  const lon = lonStr ? parseFloat(lonStr) : 69.3451;

  const adsbUrl = `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/600`;
  const openskyUrl = `https://opensky-network.org/api/states/all?lamin=${lat - 10}&lomin=${lon - 10}&lamax=${lat + 10}&lomax=${lon + 10}`;
  const cacheKey = `argus:flights:v3:${lat.toFixed(1)}:${lon.toFixed(1)}`;

  // Try Redis cache first
  const redisUrl = c.env.UPSTASH_REDIS_URL;
  const redisToken = c.env.UPSTASH_REDIS_TOKEN;
  if (redisUrl && redisToken) {
    const cached = await redisGet(redisUrl, redisToken, cacheKey);
    if (cached) {
      return c.json(cached);
    }
  }

  let adsbFlights: NormalizedFlight[] = [];
  let openskyFlights: NormalizedFlight[] = [];

  // Fetch both in parallel
  const results = await Promise.allSettled([
    fetchADSB(adsbUrl),
    fetchOpenSky(openskyUrl, c.env.OPENSKY_USERNAME, c.env.OPENSKY_PASSWORD),
  ]);

  if (results[0].status === 'fulfilled') adsbFlights = results[0].value;
  else console.error('[flights] ADSB failed:', results[0].reason);

  if (results[1].status === 'fulfilled') openskyFlights = results[1].value;
  else console.error('[flights] OpenSky failed:', results[1].reason);

  if (adsbFlights.length === 0 && openskyFlights.length === 0) {
    return c.json({ flights: [], count: 0, timestamp: Date.now() }, 503);
  }

  const merged = mergeFlights(adsbFlights, openskyFlights)
    .filter((f) => !f.onGround);

  const response = {
    flights: merged,
    count: merged.length,
    timestamp: Date.now(),
  };

  // Cache
  if (redisUrl && redisToken) {
    await redisSet(redisUrl, redisToken, cacheKey, response, CACHE_TTL);
  }

  return c.json(response);
});

app.options('/', (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  return c.text('', 204);
});

export default app;
