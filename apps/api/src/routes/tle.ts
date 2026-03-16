// File: apps/api/src/routes/tle.ts
// ARGUS v5.0 — CelesTrak TLE proxy with 3-hour Redis cache

import { Hono } from 'hono';
import { Redis } from '@upstash/redis/cloudflare';

type Bindings = {
  UPSTASH_REDIS_URL: string;
  UPSTASH_REDIS_TOKEN: string;
};

const tle = new Hono<{ Bindings: Bindings }>();

const CATEGORIES: Record<string, string> = {
  active: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
  starlink: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
  gps: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle',
  stations: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
};

// GET /api/tle?category=active
tle.get('/', async (c) => {
  const redis = new Redis({
    url: c.env.UPSTASH_REDIS_URL,
    token: c.env.UPSTASH_REDIS_TOKEN,
  });

  const category = c.req.query('category') || 'active';
  const url = CATEGORIES[category];

  if (!url) {
    return c.json({ error: 'Unknown category' }, 400);
  }

  const cacheKey = `tle:${category}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return c.json({ category, tles: cached, fromCache: true });
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ARGUS-Pakistan-Intelligence/5.0 (sentinel.rufayl.dev)' },
    });

    if (!response.ok) {
      return c.json({ error: 'CelesTrak API failed' }, 502);
    }

    const text = await response.text();
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const tles: { name: string; source: string; line1: string; line2: string }[] = [];
    for (let i = 0; i < lines.length; i += 3) {
      if (lines[i] && lines[i + 1] && lines[i + 2] && lines[i + 1].startsWith('1') && lines[i + 2].startsWith('2')) {
        tles.push({
          name: lines[i],
          source: category,
          line1: lines[i + 1],
          line2: lines[i + 2],
        });
      }
    }

    await redis.set(cacheKey, tles, { ex: 10800 }); // 3 hours

    return c.json({ category, tles, fromCache: false, count: tles.length });
  } catch (error) {
    console.error('TLE fetch error:', error);
    return c.json({ error: 'Failed to fetch TLEs' }, 500);
  }
});

export default tle;
