/**
 * VERITAS Live Wildfires — NASA FIRMS active-fire pixels (last 24h).
 *
 * Calls FIRMS area API directly for carbon-relevant regions:
 *   Amazon, Congo Basin, Indonesia, Australia, California, Mediterranean,
 *   Siberian boreal, India, Pakistan / South Asia.
 *
 * GET /api/veritas/fires?region=<name>&days=1
 *   region: optional. Default = all regions
 *   days:   1 (default), max 7
 *
 * Returns:
 *   { ok: true, fires: [...], count, generatedAt, regions, source }
 *
 * NASA_FIRMS_API_KEY env var must be set on Vercel.
 *
 * FIRMS free tier: 5 000 requests / 10 minutes. We pace at 1.2s between
 * region calls to stay well under the cap. 6-hour edge cache further
 * reduces upstream pressure.
 */

import { getCorsHeaders, isDisallowedOrigin } from '../_cors.js';
import { jsonResponse } from '../_json-response.js';

export const config = { runtime: 'edge', regions: ['iad1', 'lhr1', 'fra1'] };

// Carbon-relevant ecosystem bounding boxes (W,S,E,N in lon/lat order).
// Optimised for size: each box stays under FIRMS' 10° preferred span when
// possible to avoid timeouts. Larger biomes (Amazon, Boreal) split into
// sub-boxes.
const VERITAS_REGIONS = {
  'Amazon-N':       '-75,-5,-50,5',
  'Amazon-S':       '-70,-15,-45,-5',
  'Congo-Basin':    '12,-5,30,5',
  'Indonesia':      '95,-10,141,6',
  'Borneo':         '109,-4,119,7',
  'Australia-N':    '125,-25,155,-10',
  'California':     '-125,32,-114,42',
  'Mediterranean':  '-10,30,40,46',
  'Siberian-Boreal':'70,55,140,72',
  'South-Asia':     '60,5,95,38',
  'East-Africa':    '28,-12,52,18',
  'West-Africa':    '-18,4,18,18',
};

const FIRMS_SOURCE = 'VIIRS_SNPP_NRT'; // best balance of recency & coverage

// Edge cache: 6 hours. NASA FIRMS updates every 2-3h.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const _cache = new Map(); // key -> { fires, at }

function mapConfidence(c) {
  switch ((c || '').toLowerCase()) {
    case 'h': return 'high';
    case 'n': return 'nominal';
    case 'l': return 'low';
    default:  return 'unknown';
  }
}

function parseCsv(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim());
    if (vals.length < headers.length) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx]; });
    out.push(row);
  }
  return out;
}

async function fetchRegion(apiKey, name, bbox, days, timeoutMs = 25_000) {
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/${FIRMS_SOURCE}/${bbox}/${days}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'text/csv', 'User-Agent': 'VERITAS-Oracle/1.0' },
    });
    if (!res.ok) {
      console.warn(`[veritas/fires] ${name} HTTP ${res.status}`);
      return [];
    }
    const csv = await res.text();
    if (csv.startsWith('Invalid') || csv.includes('No fire data')) return [];
    const rows = parseCsv(csv);
    return rows.map((r, idx) => ({
      id: `${name}-${r.latitude}-${r.longitude}-${r.acq_date}-${r.acq_time}-${idx}`,
      lat: parseFloat(r.latitude ?? '0') || 0,
      lon: parseFloat(r.longitude ?? '0') || 0,
      brightness: parseFloat(r.bright_ti4 ?? r.brightness ?? '0') || 0,
      frp: parseFloat(r.frp ?? '0') || 0,
      confidence: mapConfidence(r.confidence || ''),
      satellite: r.satellite || FIRMS_SOURCE,
      acqDate: r.acq_date || '',
      acqTime: r.acq_time || '',
      dayNight: (r.daynight || '').toUpperCase(),
      region: name,
    })).filter(f => f.lat !== 0 && f.lon !== 0);
  } catch (err) {
    console.warn(`[veritas/fires] ${name} failed: ${err?.message || err}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function buildSnapshot(days, regionFilter) {
  const apiKey = process.env.NASA_FIRMS_API_KEY || process.env.FIRMS_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'NASA_FIRMS_API_KEY not configured' };
  }

  const entries = Object.entries(VERITAS_REGIONS).filter(
    ([name]) => !regionFilter || name.toLowerCase().includes(regionFilter.toLowerCase()),
  );
  if (entries.length === 0) {
    return { ok: false, error: `Unknown region "${regionFilter}"` };
  }

  const all = [];
  // Sequential with small pause to respect FIRMS rate limit.
  for (const [name, bbox] of entries) {
    const fires = await fetchRegion(apiKey, name, bbox, days);
    if (fires.length) all.push(...fires);
    // Yield to event loop to keep edge function from being killed.
    await new Promise(r => setTimeout(r, 250));
  }

  // Cap to 1500 most-recent / highest-FRP fires for reasonable payload size.
  all.sort((a, b) => {
    const dt = (b.acqDate + b.acqTime).localeCompare(a.acqDate + a.acqTime);
    if (dt !== 0) return dt;
    return (b.frp || 0) - (a.frp || 0);
  });
  const fires = all.slice(0, 1500);

  return {
    ok: true,
    fires,
    count: fires.length,
    totalDetected: all.length,
    regions: entries.map(([n]) => n),
    days,
    source: 'NASA FIRMS · VIIRS SNPP NRT',
    generatedAt: new Date().toISOString(),
  };
}

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (isDisallowedOrigin(req)) return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders);
  if (req.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);

  const url = new URL(req.url);
  const daysRaw = parseInt(url.searchParams.get('days') || '1', 10);
  const days = Math.max(1, Math.min(7, isNaN(daysRaw) ? 1 : daysRaw));
  const region = (url.searchParams.get('region') || '').trim();

  const cacheKey = `${days}:${region || 'all'}`;
  const cached = _cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return jsonResponse(cached.result, 200, {
      'Cache-Control': 's-maxage=21600, stale-while-revalidate=3600',
      'X-Veritas-Cache': 'HIT',
      ...corsHeaders,
    });
  }

  const result = await buildSnapshot(days, region);
  if (!result.ok) {
    return jsonResponse(result, 503, {
      'Cache-Control': 'no-cache, no-store',
      'X-Veritas-Cache': 'MISS-FAIL',
      ...corsHeaders,
    });
  }

  _cache.set(cacheKey, { result, at: Date.now() });
  // Bound cache to ~12 entries
  if (_cache.size > 12) {
    const oldest = [..._cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) _cache.delete(oldest[0]);
  }

  return jsonResponse(result, 200, {
    'Cache-Control': 's-maxage=21600, stale-while-revalidate=3600',
    'X-Veritas-Cache': 'MISS-OK',
    ...corsHeaders,
  });
}
