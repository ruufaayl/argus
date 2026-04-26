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

export const listFireDetections: WildfireServiceHandler['listFireDetections'] = async (
  ctx: ServerContext,
  _req: ListFireDetectionsRequest,
): Promise<ListFireDetectionsResponse> => {
  // 1. Try seeded cache first (instant)
  try {
    const seeded = await getCachedJson(SEED_CACHE_KEY, true) as ListFireDetectionsResponse | null;
    if (seeded?.fireDetections && seeded.fireDetections.length > 0) {
      return seeded;
    }
  } catch { /* fall through to live */ }

  // 2. Fall back to in-memory live cache
  if (liveFallbackCache && Date.now() - liveFallbackCache.at < LIVE_FALLBACK_TTL_MS) {
    return liveFallbackCache.result;
  }

  // 3. Hit /api/veritas/fires endpoint live (uses NASA_FIRMS_API_KEY)
  // Resolve our own origin from the incoming request so it works on previews + prod.
  const reqUrl = (ctx as unknown as { request?: Request })?.request?.url;
  let origin = '';
  if (reqUrl) {
    try { origin = new URL(reqUrl).origin; } catch { /* ignore */ }
  }
  if (!origin) origin = 'https://veritasoracle.vercel.app';

  const live = await fetchLiveFromVeritasEndpoint(origin);
  if (live && live.fireDetections.length > 0) {
    liveFallbackCache = { result: live, at: Date.now() };
    return live;
  }

  return { fireDetections: [], pagination: undefined };
};
