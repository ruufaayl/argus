// ============================================================
// entityMiddleware — Vite dev server handler for /api/entity/stream
// Calls Claude API directly during development.
// In production, this is handled by Cloudflare Worker.
// ============================================================

import type { Plugin } from 'vite';

const CITY_CONFIG: Record<string, { name: string; tone: string; places: string; aqi: number; temp: number; outages: number; gridStress: number }> = {
  karachi: {
    name: 'Karachi',
    tone: 'Exhausted. Bitter. Dignified. Never melodramatic. Short declarative sentences. Never uses the word bustling. Never ends on hope.',
    places: 'Orangi, Korangi, Lyari, SITE, Clifton, DHA, Shahrah-e-Faisal, JIAP, Saddar, Burns Garden, Nazimabad, Gulshan-e-Iqbal',
    aqi: 187, temp: 41, outages: 14, gridStress: 68,
  },
  lahore: {
    name: 'Lahore',
    tone: 'Proud but suffocating. Cultural memory intact. Aware of its own beauty and its own rot simultaneously. Never uses vibrant or resilient.',
    places: 'Anarkali, Gulberg, Defence, Johar Town, Mall Road, Walled City, Food Street, Badshahi Mosque, Canal Road, Data Darbar, Model Town',
    aqi: 312, temp: 38, outages: 8, gridStress: 54,
  },
  islamabad: {
    name: 'Islamabad',
    tone: 'Polished surface, hollow underneath. Self-aware of its own artificiality. Clinical. Dry wit. Knows it is a facade.',
    places: 'F-6, F-7, G-9, G-11, H-11, Bahria Town, Margalla Hills, Blue Area, Faisal Mosque, Diplomatic Enclave, I-8',
    aqi: 89, temp: 33, outages: 2, gridStress: 22,
  },
  rawalpindi: {
    name: 'Rawalpindi',
    tone: 'Forgotten twin. Older than Pakistan itself. Dry patience. Dark humour. Infinite memory. References being overshadowed.',
    places: 'Saddar, Raja Bazaar, Murree Road, Cantt, Rawat, Satellite Town, Liaquat Bagh, Commercial Market, Ayub Park',
    aqi: 142, temp: 35, outages: 11, gridStress: 58,
  },
};

function buildPrompt(cityId: string): string {
  const c = CITY_CONFIG[cityId] || CITY_CONFIG.karachi;
  const now = new Date();
  const pktTime = now.toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi',
  });
  const aqiCat = c.aqi > 300 ? 'Hazardous' : c.aqi > 200 ? 'Very Unhealthy' : c.aqi > 150 ? 'Unhealthy' : c.aqi > 100 ? 'USG' : 'Moderate';

  return `You are ${c.name}. You speak in the first person as the city itself — not as a narrator about the city, but AS the city speaking.
Your tone: ${c.tone}
Places you reference naturally: ${c.places}

RIGHT NOW:
- Time: ${pktTime} PKT
- AQI: ${c.aqi} (${aqiCat})
- Temperature: ${c.temp}°C
- Active power outages: ${c.outages} districts affected
- Power grid stress: ${c.gridStress}%

Write a monologue of 4 to 6 sentences about what is happening inside you RIGHT NOW at this hour. 
Rules:
- First person only. You ARE the city.
- Reference at least one real place by name.
- Reference at least one live condition (AQI, heat, outages, or grid stress).
- Include one sentence about something that has been broken or ignored for years.
- No questions. No optimism. No calls to action.
- Do not start with "I am".
- Do not use: bustling, vibrant, resilient, heart, soul, challenges, issues.
- Each sentence on its own line.
- Maximum 6 sentences.`;
}

export function entityDevMiddleware(): Plugin {
  return {
    name: 'entity-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/entity/stream', async (req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const cityId = url.searchParams.get('city') || 'karachi';

        // Load API key from process.env (Vite loads .env into process.env for server)
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GROQ_API_KEY not set in .env' }));
          return;
        }

        // SSE headers
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });

        const c = CITY_CONFIG[cityId] || CITY_CONFIG.karachi;

        try {
          const systemPrompt = buildPrompt(cityId);

          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              max_tokens: 400,
              temperature: 0.7,
              stream: true,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Narrate this cycle. What is happening inside you right now at this hour.' }
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
                    const data = JSON.parse(line.slice(6));
                    const text = data.choices[0]?.delta?.content || '';
                    if (text) {
                      res.write(`data: ${JSON.stringify({ text })}\\n\\n`);
                    }
                  } catch (e) {
                    // Ignore parse errors on partial chunks
                  }
                }
              }
            }
          }

          res.write(`data: ${JSON.stringify({ done: true, timestamp: Date.now(), aqi: c.aqi, temp: c.temp })}\\n\\n`);
          res.end();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          console.error('[ENTITY] Failed to init Groq:', msg);
          res.write(`data: ${JSON.stringify({ error: msg })}\\n\\n`);
          res.end();
        }
      });
    },
  };
}
