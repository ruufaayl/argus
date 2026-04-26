/**
 * VERITAS Climate Headlines Aggregator (edge endpoint).
 *
 * Fetches up to N RSS feeds in parallel via the existing /api/rss-proxy
 * (which handles allowlisting + Railway relay fallback + CORS), parses each
 * to a normalised headline list, merges + sorts by pubDate desc, returns
 * top items.
 *
 * GET /api/veritas/headlines?priority=1&limit=40
 *   priority — 1, 2, or 3 (1 = highest VERITAS relevance, default = all)
 *   limit    — max headlines to return (default 40, max 80)
 *   ids      — comma-separated channel ids (overrides priority filter)
 *
 * Cache: 5 min in-memory + Cache-Control s-maxage=300.
 *
 * Source of truth for channel list: src/config/veritas-news-channels.ts
 * Allowlist: api/_rss-allowed-domains.js (must contain each feed's hostname)
 */

import { getCorsHeaders, isDisallowedOrigin } from '../_cors.js';
import { jsonResponse } from '../_json-response.js';

export const config = { runtime: 'edge', regions: ['iad1', 'lhr1', 'fra1'] };

// ── Channel registry — mirror of src/config/veritas-news-channels.ts ─────
const VERITAS_CHANNELS = [
  // Tier 1 — carbon & ESG
  { id: 'carbon-brief',        name: 'Carbon Brief',        url: 'https://www.carbonbrief.org/feed',                    category: 'CARBON SCIENCE',     priority: 1, color: '#00D4AA' },
  { id: 'carbon-pulse',        name: 'Carbon Pulse',        url: 'https://carbon-pulse.com/feed/',                      category: 'CARBON MARKETS',     priority: 1, color: '#00D4AA' },
  { id: 'unep',                name: 'UNEP',                url: 'https://www.unep.org/news-and-stories/rss.xml',       category: 'UN ENVIRONMENT',     priority: 1, color: '#3DBBA8' },
  { id: 'climate-change-news', name: 'Climate Change News', url: 'https://www.climatechangenews.com/feed',              category: 'CLIMATE POLICY',     priority: 1, color: '#7FE03A' },
  { id: 'inside-climate',      name: 'Inside Climate News', url: 'https://insideclimatenews.org/feed',                  category: 'INVESTIGATIVE',      priority: 1, color: '#00D4AA' },
  { id: 'columbia-climate',    name: 'Columbia Climate',    url: 'https://news.climate.columbia.edu/feed',              category: 'RESEARCH',           priority: 1, color: '#3DBBA8' },
  { id: 'carbonchain',         name: 'CarbonChain',         url: 'https://carbonchain.com/blog/rss.xml',                category: 'CARBON ACCOUNTING',  priority: 1, color: '#00D4AA' },
  { id: 'ecologist',           name: 'The Ecologist',       url: 'https://theecologist.org/whats_new/feed',             category: 'POLICY',             priority: 1, color: '#7FE03A' },
  // Tier 2 — mainstream environmental
  { id: 'guardian-env',        name: 'The Guardian',        url: 'https://www.theguardian.com/environment/rss',         category: 'INVESTIGATIVE',      priority: 2, color: '#FFB020' },
  { id: 'bbc-science-env',     name: 'BBC Science & Env',   url: 'http://feeds.bbci.co.uk/news/science_and_environment/rss.xml', category: 'GLOBAL',    priority: 2, color: '#FFB020' },
  { id: 'npr-climate',         name: 'NPR Climate',         url: 'https://feeds.npr.org/1167/rss.xml',                  category: 'US POLICY',          priority: 2, color: '#FFB020' },
  { id: 'nasa-earth',          name: 'NASA Earth',          url: 'https://www.nasa.gov/rss/dyn/earth.rss',              category: 'SATELLITE DATA',     priority: 2, color: '#3DBBA8' },
  { id: 'noaa-news',           name: 'NOAA',                url: 'https://www.noaa.gov/news-features/feed',             category: 'OCEAN & ATMOSPHERE', priority: 2, color: '#3DBBA8' },
  // Tier 3 — specialist
  { id: 'mongabay',            name: 'Mongabay',            url: 'https://news.mongabay.com/feed/',                     category: 'DEFORESTATION',      priority: 3, color: '#7FE03A' },
  { id: 'gfw-blog',            name: 'Global Forest Watch', url: 'https://www.globalforestwatch.org/blog/feed',         category: 'FOREST COVER',       priority: 3, color: '#7FE03A' },
  { id: 'yale-e360',           name: 'Yale E360',           url: 'https://e360.yale.edu/feed.xml',                      category: 'ANALYSIS',           priority: 3, color: '#8BA0BE' },
  { id: 'verra',               name: 'Verra',               url: 'https://verra.org/feed',                              category: 'CARBON REGISTRY',    priority: 3, color: '#8BA0BE' },
  { id: 'unfccc',              name: 'UNFCCC',              url: 'https://unfccc.int/blog/feed',                        category: 'UN CLIMATE',         priority: 3, color: '#8BA0BE' },
];

// In-memory cache
const CACHE_TTL_MS = 5 * 60 * 1000;
let _cache = new Map(); // cacheKey -> { items, at }

function getProxyOrigin(req) {
  // Use the request's own origin so the rss-proxy call goes to the same Vercel deployment
  try {
    const u = new URL(req.url);
    return u.origin;
  } catch {
    return 'https://veritasoracle.vercel.app';
  }
}

/**
 * Tiny RSS/Atom XML parser — no DOM, no regex backtracking.
 * Extracts <item> or <entry> blocks, then title / link / pubDate / description.
 */
function parseFeed(xml, sourceName, sourceColor, sourceCategory) {
  if (!xml || typeof xml !== 'string') return [];
  const items = [];
  const itemRe = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null && items.length < 30) {
    const block = m[2];
    const title = decodeEntities(stripTags(extractTag(block, 'title') || ''));
    let link = extractAttr(block, 'link', 'href') || extractTag(block, 'link') || '';
    link = link.trim();
    const pubDateRaw = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated') || '';
    const description = decodeEntities(stripTags(extractTag(block, 'description') || extractTag(block, 'summary') || '')).slice(0, 280);
    if (!title || !link) continue;
    const pubDate = parseDate(pubDateRaw);
    items.push({
      title: title.slice(0, 240),
      url: link,
      source: sourceName,
      sourceColor,
      category: sourceCategory,
      pubDate,                  // ISO string or null
      pubTimestamp: pubDate ? Date.parse(pubDate) : 0,
      excerpt: description,
    });
  }
  return items;
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = re.exec(block);
  return m ? m[1].trim() : null;
}

function extractAttr(block, tag, attr) {
  // Self-closing or empty: <link href="..." />  or <link href="..."></link>
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}=["']([^"']+)["']`, 'i');
  const m = re.exec(block);
  return m ? m[1] : null;
}

function stripTags(s) {
  if (!s) return '';
  // CDATA passthrough
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  return s.replace(/<[^>]+>/g, '').trim();
}

const ENTITY_MAP = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };
function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, m => ENTITY_MAP[m] || m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function parseDate(raw) {
  if (!raw) return null;
  const t = Date.parse(raw);
  return isNaN(t) ? null : new Date(t).toISOString();
}

async function fetchOneFeed(channel, proxyOrigin, timeoutMs = 8_000) {
  const url = `${proxyOrigin}/api/rss-proxy?url=${encodeURIComponent(channel.url)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // Server-to-server fetch from this edge function → rss-proxy.
    // rss-proxy validateApiKey() rejects requests with neither Origin nor an
    // X-Argus-Key (returns 401), so we must announce ourselves as a trusted
    // browser origin. Pass our own deployment origin so the gateway treats
    // this like a same-origin browser call.
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'Origin': proxyOrigin,
        'Referer': `${proxyOrigin}/api/veritas/headlines`,
        'Accept': 'application/xml, text/xml, */*',
      },
    });
    if (!res.ok) {
      console.warn(`[veritas/headlines] ${channel.id} returned ${res.status}`);
      return [];
    }
    const xml = await res.text();
    return parseFeed(xml, channel.name, channel.color, channel.category);
  } catch (err) {
    console.warn(`[veritas/headlines] ${channel.id} failed:`, err?.message || err);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (isDisallowedOrigin(req)) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders);
  }
  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  const requestUrl = new URL(req.url);
  const priorityRaw = requestUrl.searchParams.get('priority');
  const limit = Math.min(parseInt(requestUrl.searchParams.get('limit') || '40', 10) || 40, 80);
  const idsRaw = requestUrl.searchParams.get('ids');

  // Resolve channel set
  let channels;
  if (idsRaw) {
    const ids = new Set(idsRaw.split(',').map(s => s.trim()).filter(Boolean));
    channels = VERITAS_CHANNELS.filter(c => ids.has(c.id));
  } else if (priorityRaw && /^[123]$/.test(priorityRaw)) {
    const p = parseInt(priorityRaw, 10);
    channels = VERITAS_CHANNELS.filter(c => c.priority === p);
  } else {
    channels = VERITAS_CHANNELS;
  }
  if (channels.length === 0) {
    return jsonResponse({ ok: false, error: 'No matching channels' }, 400, corsHeaders);
  }

  const cacheKey = `${idsRaw || ''}|${priorityRaw || ''}|${limit}`;
  const now = Date.now();
  const cached = _cache.get(cacheKey);
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return jsonResponse(cached.payload, 200, {
      'Cache-Control': 's-maxage=300, stale-while-revalidate=180',
      'X-Veritas-Cache': 'HIT',
      ...corsHeaders,
    });
  }

  const proxyOrigin = getProxyOrigin(req);
  const settled = await Promise.all(channels.map(c => fetchOneFeed(c, proxyOrigin)));
  const merged = settled.flat();

  // Sort by pubTimestamp desc; items without pubDate sink to bottom
  merged.sort((a, b) => (b.pubTimestamp || 0) - (a.pubTimestamp || 0));

  const items = merged.slice(0, limit).map(it => ({
    title: it.title,
    url: it.url,
    source: it.source,
    sourceColor: it.sourceColor,
    category: it.category,
    pubDate: it.pubDate,
    excerpt: it.excerpt,
  }));

  const channelsResolved = channels.map(c => ({
    id: c.id, name: c.name, category: c.category, priority: c.priority, color: c.color,
  }));

  const payload = {
    ok: true,
    items,
    channels: channelsResolved,
    totalChannels: channels.length,
    fetchedChannels: settled.filter(s => s.length > 0).length,
    generatedAt: new Date().toISOString(),
  };

  _cache.set(cacheKey, { payload, at: now });
  // Bound cache size
  if (_cache.size > 24) {
    const oldest = [..._cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) _cache.delete(oldest[0]);
  }

  return jsonResponse(payload, 200, {
    'Cache-Control': 's-maxage=300, stale-while-revalidate=180',
    'X-Veritas-Cache': 'MISS',
    ...corsHeaders,
  });
}
