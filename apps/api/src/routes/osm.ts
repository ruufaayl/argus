// File: apps/api/src/routes/osm.ts
// ARGUS v5.0 — OpenStreetMap Overpass API proxy with Redis cache

import { Hono } from 'hono';
import { Redis } from '@upstash/redis/cloudflare';

type Bindings = {
  UPSTASH_REDIS_URL: string;
  UPSTASH_REDIS_TOKEN: string;
};

const osm = new Hono<{ Bindings: Bindings }>();

// Pakistan bounding box
const PK_BBOX = '23.5,60.8,37.5,77.8';

// Category to Overpass query mapping
const CATEGORY_QUERIES: Record<string, string> = {
  military: `
    [out:json][timeout:30][bbox:${PK_BBOX}];
    (
      node[military=airfield];
      node[military=base];
      node[military=naval_base];
      node[military=barracks];
      way[military=airfield];
      way[military=base];
    );
    out center tags;
  `,

  airports: `
    [out:json][timeout:30][bbox:${PK_BBOX}];
    (
      node[aeroway=aerodrome];
      way[aeroway=aerodrome];
      node[aeroway=helipad][name];
    );
    out center tags;
  `,

  power: `
    [out:json][timeout:30][bbox:${PK_BBOX}];
    (
      node[power=plant][name];
      way[power=plant][name];
      node[power=dam][name];
      way[man_made=dam][name];
    );
    out center tags;
  `,

  ports: `
    [out:json][timeout:30][bbox:${PK_BBOX}];
    (
      node[industrial=port][name];
      way[industrial=port][name];
      node[harbour][name];
      way[harbour][name];
    );
    out center tags;
  `,

  universities: `
    [out:json][timeout:30][bbox:${PK_BBOX}];
    (
      node[amenity=university][name];
      way[amenity=university][name];
    );
    out center tags;
  `,

  hospitals: `
    [out:json][timeout:30][bbox:${PK_BBOX}];
    (
      node[amenity=hospital][name];
      way[amenity=hospital][name];
    );
    out center tags;
  `,

  mosques: `
    [out:json][timeout:30][bbox:${PK_BBOX}];
    (
      node[amenity=place_of_worship][religion=muslim][name];
      way[amenity=place_of_worship][religion=muslim][name];
    );
    out center tags;
  `,

  mountains: `
    [out:json][timeout:30][bbox:${PK_BBOX}];
    (
      node[natural=peak][name];
    );
    out center tags;
  `,

  cities: `
    [out:json][timeout:30][bbox:${PK_BBOX}];
    (
      node[place=city][name];
      node[place=town][name];
    );
    out center tags;
  `,

  motorways: `
    [out:json][timeout:30][bbox:${PK_BBOX}];
    (
      way[highway=motorway][name];
    );
    out center tags;
  `,

  railways: `
    [out:json][timeout:30][bbox:${PK_BBOX}];
    (
      node[railway=station][name];
    );
    out center tags;
  `,
};

// GET /api/osm/layer?category=military
osm.get('/layer', async (c) => {
  const redis = new Redis({
    url: c.env.UPSTASH_REDIS_URL,
    token: c.env.UPSTASH_REDIS_TOKEN,
  });

  const category = c.req.query('category');
  if (!category || !CATEGORY_QUERIES[category]) {
    return c.json({ error: 'Unknown category. Valid: ' + Object.keys(CATEGORY_QUERIES).join(', ') }, 400);
  }

  const cacheKey = `osm:layer:${category}`;

  // Check cache first — 24h TTL
  const cached = await redis.get(cacheKey);
  if (cached) {
    return c.json({
      category,
      features: cached,
      fromCache: true,
      count: (cached as any[]).length,
    });
  }

  // Query Overpass API
  const query = CATEGORY_QUERIES[category];
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'ARGUS-Intelligence/5.0',
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    return c.json({ error: 'Overpass API failed' }, 502);
  }

  const data: any = await response.json();

  // Normalise Overpass output to clean features
  const features = (data.elements || [])
    .filter((el: any) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      return el.tags?.name && lat && lon;
    })
    .map((el: any) => ({
      id: `osm-${el.type}-${el.id}`,
      osmId: el.id,
      osmType: el.type,
      name: el.tags.name,
      nameUrdu: el.tags['name:ur'] || null,
      nameEn: el.tags['name:en'] || el.tags.name,
      lat: el.lat ?? el.center?.lat,
      lon: el.lon ?? el.center?.lon,
      category,
      tags: el.tags,
      geometry: el.geometry || null,
    }));

  // Cache 24 hours
  await redis.set(cacheKey, features, { ex: 86400 });

  return c.json({
    category,
    features,
    fromCache: false,
    count: features.length,
  });
});

export default osm;
