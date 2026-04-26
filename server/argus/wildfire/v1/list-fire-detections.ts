/**
 * ListFireDetections RPC -- reads seeded wildfire data from Railway seed cache,
 * with a live NASA FIRMS fallback when the cache is empty (so the dashboard
 * shows real fires even if the Railway seeder hasn't run recently).
 *
 * Seed path = primary (instant, no rate limit).
 * Live path = fallback for first request after a deploy / cache flush.
 */

import type {
  WildfireServiceHandler,
  ServerContext,
  ListFireDetectionsRequest,
  ListFireDetectionsResponse,
} from '../../../../src/generated/server/argus/wildfire/v1/service_server';

import { getCachedJson } from '../../../_shared/redis';

const SEED_CACHE_KEY = 'wildfire:fires:v1';
const LIVE_FALLBACK_TTL_MS = 6 * 60 * 60 * 1000; // 6h
let liveFallbackCache: { result: ListFireDetectionsResponse; at: number } | null = null;
const SKEW_REGION_RATIO_THRESHOLD = 0.72; // if one region dominates >72%, treat as biased
const STALE_MS = 6 * 60 * 60 * 1000;

function mapConfidence(c: string): 'FIRE_CONFIDENCE_HIGH' | 'FIRE_CONFIDENCE_NOMINAL' | 'FIRE_CONFIDENCE_LOW' | 'FIRE_CONFIDENCE_UNSPECIFIED' {
  switch ((c || '').toLowerCase()) {
    case 'high': case 'h': return 'FIRE_CONFIDENCE_HIGH';
    case 'nominal': case 'n': return 'FIRE_CONFIDENCE_NOMINAL';
    case 'low': case 'l': return 'FIRE_CONFIDENCE_LOW';
    default: return 'FIRE_CONFIDENCE_UNSPECIFIED';
  }
}

async function fetchLiveFromVeritasEndpoint(baseUrl: string): Promise<ListFireDetectionsResponse | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(`${baseUrl}/api/veritas/fires?days=1`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json() as { ok: boolean; fires?: Array<{ id: string; lat: number; lon: number; brightness: number; frp: number; confidence: string; satellite: string; acqDate: string; acqTime: string; dayNight: string; region: string; }> };
    if (!data?.ok || !Array.isArray(data.fires)) return null;
    return {
      fireDetections: data.fires.map(f => ({
        id: f.id,
        location: { latitude: f.lat, longitude: f.lon },
        brightness: f.brightness || 0,
        frp: f.frp || 0,
        confidence: mapConfidence(f.confidence),
        satellite: f.satellite || '',
        detectedAt: Date.parse(`${f.acqDate}T${(f.acqTime || '0000').padStart(4, '0').slice(0,2)}:${(f.acqTime || '0000').padStart(4, '0').slice(2)}:00Z`) || Date.now(),
        region: f.region,
        dayNight: f.dayNight || '',
      })),
      pagination: undefined,
    };
  } catch {
    return null;
  }
}

function normalizeFireDetections(result: ListFireDetectionsResponse | null | undefined): ListFireDetectionsResponse | null {
  if (!result?.fireDetections) return null;
  const fireDetections = result.fireDetections.filter((f) => {
    const lat = f.location?.latitude;
    const lon = f.location?.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
    if ((lat as number) < -90 || (lat as number) > 90) return false;
    if ((lon as number) < -180 || (lon as number) > 180) return false;
    return true;
  });
  return { ...result, fireDetections };
}

function isSeedLikelyBiased(result: ListFireDetectionsResponse): boolean {
  const detections = result.fireDetections || [];
  if (detections.length < 200) return true; // too sparse for global layer

  const maxDetectedAt = detections.reduce((m, d) => Math.max(m, d.detectedAt || 0), 0);
  if (!maxDetectedAt || Date.now() - maxDetectedAt > STALE_MS) return true;

  const regionCounts = new Map<string, number>();
  for (const d of detections) {
    const r = (d.region || 'Unknown').trim() || 'Unknown';
    regionCounts.set(r, (regionCounts.get(r) || 0) + 1);
  }
  let maxRegion = 0;
  for (const c of regionCounts.values()) maxRegion = Math.max(maxRegion, c);
  return maxRegion / detections.length >= SKEW_REGION_RATIO_THRESHOLD;
}

export const listFireDetections: WildfireServiceHandler['listFireDetections'] = async (
  ctx: ServerContext,
  _req: ListFireDetectionsRequest,
): Promise<ListFireDetectionsResponse> => {
  // 1. Try seeded cache first (instant)
  let seededNormalized: ListFireDetectionsResponse | null = null;
  try {
    const seeded = await getCachedJson(SEED_CACHE_KEY, true) as ListFireDetectionsResponse | null;
    seededNormalized = normalizeFireDetections(seeded);
  } catch { /* fall through to live */ }

  const seededAvailable = !!(seededNormalized?.fireDetections?.length);
  const seededBiased = seededAvailable ? isSeedLikelyBiased(seededNormalized as ListFireDetectionsResponse) : true;

  // 2. If seeded looks healthy, prefer it for speed.
  if (seededAvailable && !seededBiased) {
    return seededNormalized as ListFireDetectionsResponse;
  }

  // 3. Fall back to in-memory live cache
  if (liveFallbackCache && Date.now() - liveFallbackCache.at < LIVE_FALLBACK_TTL_MS) {
    return normalizeFireDetections(liveFallbackCache.result) || { fireDetections: [], pagination: undefined };
  }

  // 4. Hit /api/veritas/fires endpoint live (uses NASA_FIRMS_API_KEY)
  // Resolve our own origin from the incoming request so it works on previews + prod.
  const reqUrl = (ctx as unknown as { request?: Request })?.request?.url;
  let origin = '';
  if (reqUrl) {
    try { origin = new URL(reqUrl).origin; } catch { /* ignore */ }
  }
  if (!origin) origin = 'https://veritasoracle.vercel.app';

  const live = normalizeFireDetections(await fetchLiveFromVeritasEndpoint(origin));
  if (live && live.fireDetections.length > 0) {
    liveFallbackCache = { result: live, at: Date.now() };
    return live;
  }

  // 5. If live is unavailable, return seed even if skewed so we still show data.
  if (seededAvailable) {
    return seededNormalized as ListFireDetectionsResponse;
  }

  return { fireDetections: [], pagination: undefined };
};
