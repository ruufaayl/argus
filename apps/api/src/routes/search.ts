// File: apps/api/src/routes/search.ts
// ARGUS v5.0 — Nominatim search proxy for Command Palette

import { Hono } from 'hono';
import { Redis } from '@upstash/redis/cloudflare';

type Bindings = {
  UPSTASH_REDIS_URL: string;
  UPSTASH_REDIS_TOKEN: string;
};

const search = new Hono<{ Bindings: Bindings }>();

// GET /api/search?q=lahore+fort&limit=8
search.get('/', async (c) => {
  const redis = new Redis({
    url: c.env.UPSTASH_REDIS_URL,
    token: c.env.UPSTASH_REDIS_TOKEN,
  });

  const q = c.req.query('q')?.trim();
  const limit = Math.min(parseInt(c.req.query('limit') || '8'), 10);

  if (!q || q.length < 2) {
    return c.json({ results: [] });
  }

  const cacheKey = `search:${q.toLowerCase().replace(/\s+/g, '-')}`;

  // Cache search results for 1 hour
  const cached = await redis.get(cacheKey);
  if (cached) {
    return c.json({ results: cached, fromCache: true });
  }

  // Nominatim search — Pakistan only
  const params = new URLSearchParams({
    q: `${q}, Pakistan`,
    format: 'geocodejson',
    limit: limit.toString(),
    bounded: '1',
    viewbox: '60.8,23.5,77.8,37.5',
    addressdetails: '1',
    namedetails: '1',
    extratags: '1',
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        'User-Agent': 'ARGUS-Pakistan-Intelligence/5.0 (sentinel.rufayl.dev)',
        'Accept-Language': 'en,ur',
      },
    }
  );

  if (!response.ok) {
    return c.json({ results: [], error: 'Search failed' });
  }

  const data: any = await response.json();

  const results = (data.features || []).map((f: any) => ({
    id: f.properties?.geocoding?.osm_id || String(Math.random()),
    name: f.properties?.geocoding?.name || f.properties?.geocoding?.label || '',
    displayName: f.properties?.geocoding?.label || '',
    lat: f.geometry?.coordinates?.[1] || 0,
    lon: f.geometry?.coordinates?.[0] || 0,
    category: f.properties?.geocoding?.type || f.properties?.geocoding?.category || 'place',
    osmType: f.properties?.geocoding?.osm_type || '',
    address: f.properties?.geocoding?.admin || {},
  }));

  // Cache 1 hour
  await redis.set(cacheKey, results, { ex: 3600 });

  return c.json({ results });
});

export default search;
