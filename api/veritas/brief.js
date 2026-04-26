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

// ── GDELT climate query ──
// GDELT v2 Doc API requires multi-word phrases to be quoted, otherwise the
// tokens are AND-ed individually and the OR expression yields garbage / empty
// results (which is what was producing the 503 we saw in production).
//
// Two query tiers: a primary (rich) query, and a fallback (terse) query used
// if the primary returns 0 articles. The fallback drops the multi-word
// phrases that GDELT often misses and keeps single-token climate keywords.
const GDELT_PRIMARY_PHRASES = [
  '"carbon credits"', '"carbon market"', '"carbon offset"', '"net zero"',
  '"climate change"', '"global warming"', '"sea level rise"',
  '"greenwashing"', '"Paris Agreement"', '"methane emissions"',
  'REDD', 'deforestation', 'CSRD', 'COP30', 'Verra',
];
const GDELT_FALLBACK_PHRASES = [
  'climate', 'emissions', 'carbon', 'deforestation', 'wildfire', 'drought',
];
const GDELT_PRIMARY_QUERY = GDELT_PRIMARY_PHRASES.join(' OR ');
const GDELT_FALLBACK_QUERY = GDELT_FALLBACK_PHRASES.join(' OR ');

// ── In-memory cache (per timespan) ──
// 12-hour TTL caps Groq/OpenRouter spend at ~2 syntheses per span per day, per
// region. Edge instances are warm a few minutes each — total cold-call rate
// stays well under 60/day across all regions even on heavy traffic.
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours = 2x/day max
const _cacheBySpan = new Map(); // span -> { result, at }

const ALLOWED_SPANS = new Set(['1h', '6h', '12h', '1d', '2d', '3d', '7d']);
const DEFAULT_SPAN = '1d';

async function fetchGdeltOnce(query, span, timeoutMs) {
  const url =
    `https://api.gdeltproject.org/api/v2/doc/doc?` +
    `query=${encodeURIComponent(query)}` +
    `&mode=artlist&maxrecords=20&format=json&timespan=${span}&sort=DateDesc`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'VERITAS-Oracle/1.0 (+https://veritasoracle.vercel.app)' },
    });
    if (!res.ok) throw new Error(`GDELT ${res.status}`);
    // GDELT sometimes returns text/html with status 200 when query is malformed.
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { return []; }
    const articles = Array.isArray(data?.articles) ? data.articles : [];
    return articles.slice(0, 12).map(a => ({
      title: String(a.title || '').slice(0, 240),
      url: String(a.url || ''),
      source: String(a.domain || ''),
      seendate: String(a.seendate || ''),
    })).filter(a => a.title && a.url);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGdeltHeadlines(timespan, timeoutMs = 15_000) {
  const span = ALLOWED_SPANS.has(timespan) ? timespan : DEFAULT_SPAN;
  // Try primary (climate-specific quoted phrases) first.
  try {
    const primary = await fetchGdeltOnce(GDELT_PRIMARY_QUERY, span, timeoutMs);
    if (primary.length > 0) return primary;
  } catch (err) {
    console.warn('[veritas/brief] GDELT primary failed:', err?.message || err);
  }
  // Widen to single-token fallback if primary returned nothing.
  try {
    const fallback = await fetchGdeltOnce(GDELT_FALLBACK_QUERY, span, timeoutMs);
    if (fallback.length > 0) return fallback;
  } catch (err) {
    console.warn('[veritas/brief] GDELT fallback failed:', err?.message || err);
  }
  // Last resort: widen the timespan.
  if (span !== '7d') {
    try {
      const wider = await fetchGdeltOnce(GDELT_FALLBACK_QUERY, '7d', timeoutMs);
      if (wider.length > 0) return wider;
    } catch (err) {
      console.warn('[veritas/brief] GDELT 7d widen failed:', err?.message || err);
    }
  }
  return [];
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

function spanToHumanLabel(span) {
  switch (span) {
    case '1h': return 'last 1 hour';
    case '6h': return 'last 6 hours';
    case '12h': return 'last 12 hours';
    case '1d': return 'last 24 hours';
    case '2d': return 'last 48 hours';
    case '3d': return 'last 3 days';
    case '7d': return 'last 7 days';
    default: return 'last 24 hours';
  }
}

// OpenAI-compatible chat completion call. Used for both Groq and OpenRouter
// (both expose the same /v1/chat/completions schema). Returns trimmed content
// or throws with provider+status in the message so the orchestrator can fall
// back to the next provider in its chain.
async function callChatCompletion({ provider, baseUrl, apiKey, model, headlines, span, extraHeaders = {}, timeoutMs = 30_000 }) {
  const headlineText = headlines
    .map((h, i) => `${i + 1}. ${h.title} — ${h.source}`)
    .join('\n');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        max_tokens: 600,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Climate headlines from the ${spanToHumanLabel(span)}:\n\n${headlineText}\n\nWrite the brief.` },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`${provider} ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') throw new Error(`${provider} returned no content`);
    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}

// Resolve LLM provider chain in priority order. Groq is preferred (fastest,
// cheapest for Llama-3.3-70b), with OpenRouter as fallback when Groq is rate-
// limited, geo-blocked, or its key is missing. The brief endpoint will try
// each in turn and report the first successful provider in `model`.
function getLlmProviderChain() {
  const chain = [];
  if (process.env.GROQ_API_KEY) {
    chain.push({
      provider: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile',
    });
  }
  if (process.env.OPENROUTER_API_KEY) {
    chain.push({
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      // Free, fast Llama-3.3 70B via OpenRouter — same family as Groq's so
      // the prompt + temperature transfer cleanly.
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct',
      extraHeaders: {
        'HTTP-Referer': 'https://veritasoracle.vercel.app',
        'X-Title': 'VERITAS Carbon Brief',
      },
    });
  }
  return chain;
}

async function callLlmWithFallback(headlines, span) {
  const chain = getLlmProviderChain();
  if (chain.length === 0) {
    throw new Error('No LLM API keys configured (set GROQ_API_KEY or OPENROUTER_API_KEY)');
  }
  const errors = [];
  for (const cfg of chain) {
    try {
      const content = await callChatCompletion({ ...cfg, headlines, span });
      return { content, model: `${cfg.provider}:${cfg.model}` };
    } catch (err) {
      errors.push(err?.message || String(err));
    }
  }
  throw new Error(`All LLM providers failed: ${errors.join(' | ')}`);
}

async function buildBrief(span) {
  const headlines = await fetchGdeltHeadlines(span);
  if (headlines.length === 0) {
    return {
      ok: false,
      error: `No climate headlines available from GDELT for ${spanToHumanLabel(span)}.`,
    };
  }
  let brief;
  let modelUsed = 'unknown';
  try {
    const result = await callLlmWithFallback(headlines, span);
    brief = result.content;
    modelUsed = result.model;
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
    span,
    spanLabel: spanToHumanLabel(span),
    generatedAt: new Date().toISOString(),
    model: modelUsed,
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

  const requestUrl = new URL(req.url);
  const spanRaw = requestUrl.searchParams.get('span') || DEFAULT_SPAN;
  const span = ALLOWED_SPANS.has(spanRaw) ? spanRaw : DEFAULT_SPAN;

  const now = Date.now();
  const cached = _cacheBySpan.get(span);
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return jsonResponse(cached.result, 200, {
      'Cache-Control': 's-maxage=43200, stale-while-revalidate=3600',
      'X-Veritas-Cache': 'HIT',
      ...corsHeaders,
    });
  }

  const result = await buildBrief(span);
  if (!result.ok) {
    return jsonResponse(result, 503, {
      'Cache-Control': 'no-cache, no-store',
      'X-Veritas-Cache': 'MISS-FAIL',
      ...corsHeaders,
    });
  }

  _cacheBySpan.set(span, { result, at: now });
  // Bound cache size to avoid memory growth
  if (_cacheBySpan.size > 12) {
    const oldest = [..._cacheBySpan.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) _cacheBySpan.delete(oldest[0]);
  }
  return jsonResponse(result, 200, {
    'Cache-Control': 's-maxage=600, stale-while-revalidate=300',
    'X-Veritas-Cache': 'MISS-OK',
    ...corsHeaders,
  });
}
