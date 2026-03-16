// ============================================================
// Entity streaming route — Claude AI city monologue
// GET /api/entity/stream?city={cityId}
// Returns SSE stream of text tokens from Claude.
// Designed for HOURLY cycles to conserve credits.
// ============================================================

import { Hono } from 'hono';

type Bindings = {
  GROQ_API_KEY: string;
  NEWSDATA_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// ── City Personalities ──
const CITY_PERSONALITIES: Record<string, { name: string; tone: string; places: string }> = {
  karachi: {
    name: 'Karachi',
    tone: 'Exhausted. Bitter. Dignified. Never melodramatic. Speaks in short declarative sentences. References specific places by name. Never uses the word bustling. Never ends on hope.',
    places: 'Orangi, Korangi, Lyari, SITE, Clifton, DHA, Shahrah-e-Faisal, JIAP, Saddar, Burns Garden',
  },
  lahore: {
    name: 'Lahore',
    tone: 'Proud but suffocating. Cultural memory intact. Aware of its own beauty and its own rot simultaneously.',
    places: 'Anarkali, Gulberg, Defence, Johar Town, Mall Road, Walled City, Food Street, Badshahi Mosque, Canal Road',
  },
  islamabad: {
    name: 'Islamabad',
    tone: 'Polished surface, hollow underneath. Self-aware of its own artificiality. Clinical. Dry.',
    places: 'G-9, F-7, H-11, Bahria Town, Margalla Hills, Blue Area, Faisal Mosque, Diplomatic Enclave',
  },
  rawalpindi: {
    name: 'Rawalpindi',
    tone: 'Forgotten. Older than Pakistan itself. Dry patience. Dark humour. Infinite memory.',
    places: 'Saddar, Raja Bazaar, Murree Road, Cantt, Rawat, Satellite Town, Liaquat Bagh',
  },
};

// ── Mock live data (used when external APIs unavailable) ──
const MOCK_DATA: Record<string, { aqi: number; temp: number; outages: number }> = {
  karachi: { aqi: 187, temp: 41, outages: 14 },
  lahore: { aqi: 312, temp: 38, outages: 8 },
  islamabad: { aqi: 89, temp: 33, outages: 2 },
  rawalpindi: { aqi: 142, temp: 35, outages: 11 },
};

// ── Fetch headlines (with fallback) ──
async function fetchHeadlines(cityName: string, apiKey?: string): Promise<string[]> {
  if (!apiKey) return [`No fresh headlines available for ${cityName} this cycle.`];
  try {
    const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&q=${encodeURIComponent(cityName)}&country=pk&language=en&timeframe=24&size=5`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return [`Headlines feed returned ${resp.status}.`];
    const data = (await resp.json()) as { results?: Array<{ title: string }> };
    return data.results?.map((r) => r.title).filter(Boolean).slice(0, 5) || ['No recent headlines.'];
  } catch {
    return ['Headlines feed unavailable this cycle.'];
  }
}

// ── Build system prompt ──
function buildSystemPrompt(
  cityId: string,
  headlines: string[],
  aqi: number,
  temp: number,
  outages: number
): string {
  const p = CITY_PERSONALITIES[cityId] || CITY_PERSONALITIES.karachi;
  const now = new Date();
  const pktTime = now.toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Karachi',
  });

  const aqiCategory = aqi > 300 ? 'Hazardous' : aqi > 200 ? 'Very Unhealthy' : aqi > 150 ? 'Unhealthy' : aqi > 100 ? 'Unhealthy for Sensitive' : 'Moderate';

  return `You are ${p.name}. You speak in the first person as the city itself — not as a narrator about the city, but AS the city speaking. Your tone: ${p.tone}
Places you know: ${p.places}

Current live data about you right now:
- Time in Pakistan: ${pktTime} PKT
- Your AQI: ${aqi} (${aqiCategory})
- Surface temperature: ${temp}°C
- Active power outages: ${outages} districts affected

HEADLINES FROM THE LAST HOUR:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Write a monologue of exactly 4 to 6 sentences.
Rules:
- First person only. You ARE the city.
- Reference at least one headline or current event.
- Reference at least one live condition (AQI, heat, or outages).
- Include one sentence about something that has been broken or ignored for years — not just today.
- No questions. No optimism. No calls to action.
- Do not start with "I am".
- Do not use the words: bustling, vibrant, resilient, heart, soul, challenges, issues.
- Maximum 6 sentences. Minimum 4.
- Each sentence on its own line.`;
}

// ── SSE stream endpoint ──
app.get('/stream', async (c) => {
  const cityId = c.req.query('city') || 'karachi';
  const apiKey = c.env.GROQ_API_KEY;

  if (!apiKey) {
    const errorStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'GROQ_API_KEY not configured' })}\\n\\n`)
        );
        controller.close();
      }
    });
    return new Response(errorStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const data = MOCK_DATA[cityId] || MOCK_DATA.karachi;
  const headlines = await fetchHeadlines(
    CITY_PERSONALITIES[cityId]?.name || 'Karachi',
    c.env.NEWSDATA_API_KEY
  );

  const systemPrompt = buildSystemPrompt(cityId, headlines, data.aqi, data.temp, data.outages);

  // Stream response as SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 300,
            temperature: 0.7,
            stream: true,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: 'Narrate this cycle.' }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`Groq API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const dataJson = JSON.parse(line.slice(6));
                  const text = dataJson.choices[0]?.delta?.content || '';
                  if (text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\\n\\n`));
                  }
                } catch (e) {
                  // Ignore JSON parse errors on partial chunks
                }
              }
            }
          }
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, timestamp: Date.now(), aqi: data.aqi, temp: data.temp })}\\n\\n`)
        );
        controller.close();

      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'Stream initialization failed.' })}\\n\\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

export default app;
