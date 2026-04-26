/**
 * VERITAS Oracle — single-credit AI audit (landing-page widget endpoint).
 *
 * GET /api/veritas/oracle?serial=<id>
 *
 * Returns:
 *   { ok: true, score: 0-100, verdict: string, reason: string,
 *     bars: { ndvi, fire, add, perm }, latencyMs, model, serial }
 *
 * Uses OpenRouter (preferred — primary) with Groq fallback.
 * Both expose the same /v1/chat/completions schema.
 *
 * The model is asked to score a credit serial across four sub-metrics +
 * one composite. Structured-output (JSON mode where supported) keeps the
 * response parseable without a fragile regex pass on the client.
 *
 * Caching: 12-hour in-memory per serial (carbon-credit verdicts are stable
 * over short windows; expensive to re-run otherwise).
 */

import { getCorsHeaders, isDisallowedOrigin } from '../_cors.js';
import { jsonResponse } from '../_json-response.js';

export const config = { runtime: 'edge', regions: ['iad1', 'lhr1', 'fra1'] };

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const _cache = new Map(); // serial -> { result, at }

const SYSTEM_PROMPT = `You are VERITAS, a carbon-credit verification oracle. You produce a calibrated risk score for a single registry serial across four sub-dimensions, plus one composite VERITAS RISK SCORE.

VOICE: Bloomberg-Terminal. Tight, factual, no hedging. No emojis. No marketing language.

OUTPUT: Valid JSON only, matching this schema exactly:
{
  "score": <integer 0-100, composite VERITAS RISK SCORE — higher = more trustworthy>,
  "verdict": "<one short sentence verdict, max 90 chars>",
  "reason": "<2-3 sentence concrete justification citing methodology, region, or known cohort risks; max 280 chars>",
  "bars": {
    "ndvi":  <integer 0-100, satellite NDVI delta confidence>,
    "fire":  <integer 0-100, fire-permanence integrity (higher = safer)>,
    "add":   <integer 0-100, additionality score>,
    "perm":  <integer 0-100, permanence score>
  }
}

RULES:
- Infer registry / region / methodology from the serial pattern (VCS-, GS-, ACR-, CAR- prefixes; AMS-/VM00xx/VMD00xx methodologies).
- If you cannot identify the serial, base the score on the methodology family + region cohort risk profile.
- Score generously when the credit is from a high-integrity cohort (Switzerland Klik, Verra REDD+ post-2024 update, Gold Standard cookstoves with IoT MRV).
- Score harshly for known over-credited cohorts (pre-2024 cookstove AMS-II.G, Kariba REDD+ family, Cordillera Azul methodology issues).
- Never invent specific project names, GPS coordinates, or registry IDs that aren't in the serial.
- Output JSON only — no preamble, no markdown fence, no trailing commentary.`;

async function callChatJson({ provider, baseUrl, apiKey, model, serial, extraHeaders = {}, timeoutMs = 25_000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const body = {
      model,
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Audit this carbon-credit serial: ${serial}\n\nReturn JSON only.` },
      ],
    };
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: JSON.stringify(body),
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

function getProviderChain() {
  const chain = [];
  // Prefer OpenRouter for the Oracle (richer model selection, lower rate-limit
  // pressure on Groq's free tier which is shared with the Brief endpoint).
  if (process.env.OPENROUTER_API_KEY) {
    chain.push({
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_ORACLE_MODEL || 'meta-llama/llama-3.3-70b-instruct',
      extraHeaders: {
        'HTTP-Referer': 'https://veritasoracle.vercel.app',
        'X-Title': 'VERITAS Oracle',
      },
    });
  }
  if (process.env.GROQ_API_KEY) {
    chain.push({
      provider: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile',
    });
  }
  return chain;
}

function safeParseAuditJson(raw) {
  if (!raw) return null;
  // Strip optional markdown fences the model occasionally adds despite system prompt.
  let s = raw.trim();
  if (s.startsWith('```')) s = s.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  // Find first { … last } in case of preamble noise.
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last < first) return null;
  try {
    const obj = JSON.parse(s.slice(first, last + 1));
    return obj;
  } catch {
    return null;
  }
}

function clamp01_100(v, fallback = 50) {
  const n = Number(v);
  if (!isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeAudit(raw, serial) {
  const score = clamp01_100(raw?.score, 50);
  const verdict = String(raw?.verdict || 'Verdict unavailable.').slice(0, 200);
  const reason = String(raw?.reason || 'Audit returned no justification text.').slice(0, 600);
  const bars = {
    ndvi: clamp01_100(raw?.bars?.ndvi, 50),
    fire: clamp01_100(raw?.bars?.fire, 50),
    add:  clamp01_100(raw?.bars?.add ?? raw?.bars?.additionality, 50),
    perm: clamp01_100(raw?.bars?.perm ?? raw?.bars?.permanence, 50),
  };
  return { score, verdict, reason, bars, serial };
}

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (isDisallowedOrigin(req)) return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders);
  if (req.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);

  const url = new URL(req.url);
  let serial = (url.searchParams.get('serial') || '').trim();
  if (!serial) return jsonResponse({ ok: false, error: 'Missing ?serial parameter' }, 400, corsHeaders);
  // Cap absurd lengths to avoid unbounded prompt growth.
  if (serial.length > 120) serial = serial.slice(0, 120);

  const cached = _cache.get(serial);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return jsonResponse(cached.result, 200, {
      'Cache-Control': 's-maxage=43200, stale-while-revalidate=3600',
      'X-Veritas-Cache': 'HIT',
      ...corsHeaders,
    });
  }

  const chain = getProviderChain();
  if (chain.length === 0) {
    return jsonResponse({
      ok: false,
      error: 'No LLM API keys configured (set OPENROUTER_API_KEY or GROQ_API_KEY)',
    }, 503, { ...corsHeaders, 'Cache-Control': 'no-store' });
  }

  const errors = [];
  const start = Date.now();
  for (const cfg of chain) {
    try {
      const raw = await callChatJson({ ...cfg, serial });
      const parsed = safeParseAuditJson(raw);
      if (!parsed) {
        errors.push(`${cfg.provider}: unparseable JSON`);
        continue;
      }
      const normalized = normalizeAudit(parsed, serial);
      const result = {
        ok: true,
        ...normalized,
        latencyMs: Date.now() - start,
        model: `${cfg.provider}:${cfg.model}`,
        generatedAt: new Date().toISOString(),
      };
      _cache.set(serial, { result, at: Date.now() });
      // Bound cache size
      if (_cache.size > 256) {
        const oldest = [..._cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (oldest) _cache.delete(oldest[0]);
      }
      return jsonResponse(result, 200, {
        'Cache-Control': 's-maxage=43200, stale-while-revalidate=3600',
        'X-Veritas-Cache': 'MISS-OK',
        ...corsHeaders,
      });
    } catch (err) {
      errors.push(`${cfg.provider}: ${err?.message || String(err)}`);
    }
  }

  return jsonResponse({
    ok: false,
    error: `All LLM providers failed: ${errors.join(' | ')}`,
    serial,
  }, 503, { ...corsHeaders, 'Cache-Control': 'no-store' });
}
