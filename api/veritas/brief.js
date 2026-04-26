/**
 * VERITAS Carbon Intelligence Brief — Groq-powered synthesis.
 *
 * Pipeline:
 *   1. GDELT v2 Doc API → fetch top ~12 climate-relevant articles in last 24h
 *   2. Strip + dedupe headlines
 *   3. POST headlines to Groq Llama-3.3-70b for a 3-paragraph carbon-credit
 *      verification brief (risk signals, market events, regulatory shifts)
 *   4. Return { brief, headlines, sources, generatedAt }
 *
 * GET /api/veritas/brief
 *
 * Caching:
 *   - In-memory cache: 10 min (brief regenerates 6×/hour max)
 *   - Edge response Cache-Control: s-maxage=600, stale-while-revalidate=300
 *
 * No Claude / Anthropic. No hardcoded fallback brief — if Groq is down or
 * GROQ_API_KEY is missing, returns 503 with diagnostic so the panel can
 * show a clear error state.
 */

import { getCorsHeaders, isDisallowedOrigin } from '../_cors.js';
import { jsonResponse } from '../_json-response.js';

export const config = { runtime: 'edge', regions: ['iad1', 'lhr1', 'fra1'] };

// ── GDELT climate query (matches src/config/veritas-news-channels.ts) ──
const GDELT_KEYWORDS = [
  'carbon credits', 'carbon emissions', 'carbon market', 'REDD+',
  'climate change', 'global warming', 'deforestation', 'glacier melt',
  'sea level rise', 'coral bleaching', 'net zero', 'CSRD', 'ESG',
  'carbon offset', 'greenwashing', 'Verra', 'Gold Standard',
  'CO2 ppm', 'methane emissions', 'Paris Agreement', 'COP30',
];
const GDELT_QUERY = GDELT_KEYWORDS.join(' OR ');

// ── In-memory cache ──
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min
let _cache = null;
let _cacheAt = 0;

async function fetchGdeltHeadlines(timeoutMs = 15_000) {
  const url =
    `https://api.gdeltproject.org/api/v2/doc/doc?` +
    `query=${encodeURIComponent(GDELT_QUERY)}` +
    `&mode=artlist&maxrecords=20&format=json&timespan=1d&sort=DateDesc`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'VERITAS-Oracle/1.0 (+https://veritasoracle.vercel.app)' },
    });
    if (!res.ok) throw new Error(`GDELT ${res.status}`);
    const data = await res.json();
    const articles = Array.isArray(data?.articles) ? data.articles : [];
    return articles.slice(0, 12).map(a => ({
      title: String(a.title || '').slice(0, 240),
      url: String(a.url || ''),
      source: String(a.domain || ''),
      seendate: String(a.seendate || ''),
    })).filter(a => a.title && a.url);
  } catch (err) {
    console.warn('[veritas/brief] GDELT fetch failed:', err?.message || err);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

const SYSTEM_PROMPT = `You are VERITAS, a carbon-credit verification oracle. You synthesise climate-relevant headlines into a calibrated 3-paragraph intelligence brief for ESG analysts and carbon-credit traders.

VOICE: Bloomberg-Terminal-style. Tight, factual, no hedging adjectives. No "amid"/"as"/"in light of". No emojis.

STRUCTURE:
1. RISK SIGNALS (60-90 words): Greenwashing exposures, registry incidents, project failures, methodological challenges. Lead with the most consequential.
2. MARKET / POLICY (60-90 words): Carbon market price action, regulatory shifts (CSRD/ISSB/EU CBAM), national/COP commitments, registry decisions (Verra, Gold Standard).
3. PHYSICAL CLIMATE (40-70 words): Hot pixels (NASA FIRMS), deforestation, sea-level, coral bleaching, glacier loss — only if directly material to credit integrity.

RULES:
- Cite specific organisations, locations, and numbers when present in the headlines.
- If a topic isn't covered in the headlines, omit that paragraph entirely (don't fabricate).
- Output plain text. No markdown headers, no bullet points. Three paragraphs separated by blank lines.
- Maximum 250 words total.`;

async function callGroq(headlines, timeoutMs = 30_000) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const headlineText = headlines
    .map((h, i) => `${i + 1}. ${h.title} — ${h.source}`)
    .join('\n');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.25,
        max_tokens: 600,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Today's climate headlines (last 24h):\n\n${headlineText}\n\nWrite the brief.` },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Groq ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') throw new Error('Groq returned no content');
    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}

async function buildBrief() {
  const headlines = await fetchGdeltHeadlines();
  if (headlines.length === 0) {
    return {
      ok: false,
      error: 'No climate headlines available from GDELT in the last 24h.',
    };
  }
  let brief;
  try {
    brief = await callGroq(headlines);
  } catch (err) {
    return {
      ok: false,
      error: `AI synthesis failed: ${err?.message || 'unknown'}`,
      headlines,
    };
  }
  const sources = [...new Set(headlines.map(h => h.source).filter(Boolean))];
  return {
    ok: true,
    brief,
    headlines,
    sources,
    generatedAt: new Date().toISOString(),
    model: 'groq:llama-3.3-70b-versatile',
  };
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

  const now = Date.now();
  if (_cache && now - _cacheAt < CACHE_TTL_MS) {
    return jsonResponse(_cache, 200, {
      'Cache-Control': 's-maxage=600, stale-while-revalidate=300',
      'X-Veritas-Cache': 'HIT',
      ...corsHeaders,
    });
  }

  const result = await buildBrief();
  if (!result.ok) {
    return jsonResponse(result, 503, {
      'Cache-Control': 'no-cache, no-store',
      'X-Veritas-Cache': 'MISS-FAIL',
      ...corsHeaders,
    });
  }

  _cache = result;
  _cacheAt = now;
  return jsonResponse(result, 200, {
    'Cache-Control': 's-maxage=600, stale-while-revalidate=300',
    'X-Veritas-Cache': 'MISS-OK',
    ...corsHeaders,
  });
}
