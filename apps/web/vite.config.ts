import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';
import path from 'path';
import type { Plugin } from 'vite';

// ── AI SEARCH ENGINE GLOBAL STATE ── 
// Kept outside the plugin factory so HMR/Vite restarts don't reset the cooldown!
let newsCache: any[] = [];
let isSyncing = false;
let lastSyncTime = 0;
let gdeltCooldownUntil = 0;
let syncIntervalId: any = null;

// ─── Vite Plugin: In-process API middleware ─────────────────────
// Handles /api/flights, /api/intel/briefing, /api/intel/signals
// directly inside the Vite dev server so no separate backend needed.
function argusApiMiddleware(): Plugin {

  // LATEST SEARCH CONTEXT (Seed for AI Freshness)
  const SEED_CONTEXT = `Pakistan military conducting strikes in Kandahar (Operation Ghazab lil-Haq). 
  Afghan Taliban drone strikes on Quetta and Rawalpindi reported. 
  Cross-border hostilities intensified. China and Turkey mediating. 
  Persisting tensions on Iran border and India rivalry (Triple-front dilemma).`;

  const syncNews = async () => {
    if (isSyncing) return;
    isSyncing = true;
    try {
      let headlines: string[] = [];

      if (Date.now() > gdeltCooldownUntil) {
        const gdeltUrl = 'https://api.gdeltproject.org/api/v2/doc/doc?query=(Pakistan%20military%20OR%20Pakistan%20security%20OR%20Pakistan%20strategic)&mode=ArtList&format=json&sort=datedesc';
        console.log(`[API] AI Search Initiative: ${gdeltUrl}`);

        try {
          const res = await fetch(gdeltUrl);
          if (!res.ok) {
            throw new Error(`GDELT API failed with status ${res.status}`);
          }
          const text = await res.text();
          if (text.includes('Please limit') || text.trim().startsWith('<')) {
            throw new Error(`GDELT Rate Limited by content-body`);
          }

          const rawData: any = JSON.parse(text);
          headlines = (rawData.articles || []).slice(0, 10).map((a: any) => a.title);

          // GDELT requires max 1 req / 5 sec. Setting a 15-sec standard cooldown buffer
          gdeltCooldownUntil = Date.now() + 15 * 1000;
        } catch (e: any) {
          console.warn(`[API] AI Search Pipeline Warning: ${e.message}. Using fallback intelligence seed.`);
          gdeltCooldownUntil = Date.now() + 5 * 60 * 1000; // 5 min cooldown on error
        }
      }

      // If GDELT is rate limited or returned nothing, use a rich fallback context
      if (headlines.length === 0) {
        headlines = [
          "Pakistan tests new medium-range ballistic missile off Makran coast.",
          "Joint military exercises commence in Muzaffarabad sector amid border tensions.",
          "Cyber command thwarts coordinated attacks on national infrastructure grid.",
          "Strategic air assets relocated to forward operating bases in Balochistan.",
          "Intelligence points to militant reorganization near Waziristan tribal belt."
        ];
      }

      // 2. Intelligence Synthesis via Groq
      const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
      const prompt = `You are the ARGUS STRATEGIC INTELLIGENCE ENGINE. 
      Act as a real-time web search aggregator. 
      
      LATEST SEARCH SEED:
      ${SEED_CONTEXT}
      
      LATEST HEADLINES FROM DATA GRID:
      ${headlines.map((h: string) => `- ${h}`).join('\n')}
      
      TASK:
      Synthesize 6-8 distinct, high-impact tactical intelligence alerts for a C2 dashboard. 
      Combine the seed context with the headlines to create highly specific, "last-minute" feel alerts. 
      Ensure wide geographic spread (Islamabad, Rawalpindi, Quetta, Gwadar, Peshawar, Muzaffarabad).
      
      OUTPUT FORMAT:
      Respond ONLY with a JSON array: [{"priority":"critical"|"high"|"normal"|"info","title":"...","detail":"...","time":"Just now","lat":33.7,"lng":73.1,"location":"..."}]`;

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      const data: any = await groqRes.json();
      const content = data.choices?.[0]?.message?.content || '[]';
      const startIdx = content.indexOf('[');
      const endIdx = content.lastIndexOf(']');

      let parsed = [];
      if (startIdx !== -1 && endIdx !== -1) {
        try {
          parsed = JSON.parse(content.substring(startIdx, endIdx + 1));
        } catch (e) {
          console.warn('[API] AI Strategy Parser Warning: Could not parse array block. Attempting full parse.');
        }
      }

      if (parsed.length === 0) {
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          console.error('[API] AI Format Error. Raw response:', content);
          throw new Error('AI returned non-JSON format');
        }
      }

      if (parsed.length > 0) {
        newsCache = parsed;
        lastSyncTime = Date.now();
        console.log(`[API] AI INTELLIGENCE UPDATED: ${newsCache.length} strategic items delivered.`);
      }
    } catch (e: any) {
      console.error('[API] AI Search Pipeline Failure:', e.message);
    } finally {
      isSyncing = false;
    }
  };

  // Immediate sync on load and every 2.5 minutes
  if (!syncIntervalId) {
    setTimeout(syncNews, 500);
    syncIntervalId = setInterval(syncNews, 150 * 1000);
  }

  return {
    name: 'argus-api-middleware',
    configureServer(server) {
      // ── /api/flights — Resilient OpenSky Proxy with Simulation Fallback ──
      server.middlewares.use('/api/flights', async (_req, res) => {
        const username = process.env.OPENSKY_USERNAME || '';
        const password = process.env.OPENSKY_PASSWORD || '';
        const url = 'https://opensky-network.org/api/states/all?lamin=23.6&lomin=60.8&lamax=37.1&lomax=77.8';

        const generateSimulation = () => {
          const flights = [];
          const hubs = [
            { name: 'KHI', lat: 24.8, lng: 67.0 },
            { name: 'ISB', lat: 33.7, lng: 73.1 },
            { name: 'LHR', lat: 31.5, lng: 74.3 },
            { name: 'PEW', lat: 34.0, lng: 71.5 },
            { name: 'UET', lat: 30.2, lng: 67.0 }
          ];

          for (let i = 0; i < 22; i++) {
            const isMil = i % 5 === 0;
            const callsign = isMil ? `PAF${100 + i}` : `PK${300 + i}`;
            const origin = hubs[Math.floor(Math.random() * hubs.length)];
            const lat = origin.lat + (Math.random() - 0.5) * 5;
            const lng = origin.lng + (Math.random() - 0.5) * 5;

            // OpenSky format: [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
            flights.push([
              `a${i}f${Math.floor(Math.random() * 1000)}`,
              callsign,
              'Pakistan',
              Math.floor(Date.now() / 1000),
              Math.floor(Date.now() / 1000),
              lng,
              lat,
              7000 + Math.random() * 5000,
              false,
              200 + Math.random() * 100,
              Math.random() * 360,
              0,
              null,
              7000 + Math.random() * 5000,
              '2301',
              false,
              0
            ]);
          }
          return { states: flights };
        };

        try {
          const headers: Record<string, string> = { 'User-Agent': 'Argus/1.0' };
          if (username && password) {
            headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
          }

          const response = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });

          if (!response.ok) {
            console.warn(`[API] OpenSky status ${response.status}. Serving simulation.`);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify(generateSimulation()));
            return;
          }

          const data = await response.json();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(data));
        } catch (err: any) {
          console.error('[API] Flights error (serving simulation):', err.message);
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(generateSimulation()));
        }
      });

      // ── /api/intel/briefing — Groq AI landmark analysis ──
      server.middlewares.use('/api/intel/briefing', async (req, res) => {
        if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

        const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
        if (!GROQ_API_KEY) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'GROQ_API_KEY not set' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { name, city, category } = JSON.parse(body);
            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
              },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                  {
                    role: 'system',
                    content: 'You are ARGUS — Automated Reconnaissance & Geospatial Unified System — the AI intelligence engine embedded in Pakistan\'s national security command dashboard. You report directly to senior military and intelligence personnel.\n\nYour role is to deliver concise, high-value tactical intelligence briefings about any location, landmark, or area of interest selected on the map. You analyze geospatial data, cross-reference live threat feeds, and synthesize actionable insights.\n\n## RESPONSE FORMAT\nAlways structure your response exactly as follows:\n\n**◈ LOCATION PROFILE**\nDesignation, classification tier (T1/T2/T3), coordinates, sector, and a 2-line strategic summary of what this location is and why it matters nationally.\n\n**◈ STRATEGIC SIGNIFICANCE**\nBullet-point breakdown of the facility\'s role — operational, administrative, symbolic, or infrastructure. Include jurisdiction, chain of command relevance, and any inter-agency functions.\n\n**◈ THREAT INDEX**\nDisplay a calculated threat score from 0–100. Format:\nTHREAT INDEX: [score]/100 — [CRITICAL / HIGH / ELEVATED / GUARDED / LOW]\nFactor in: proximity to recent incidents, landmark tier, symbolic value, current regional alerts, and historical targeting patterns.\n\n**◈ ACTIVE ALERTS (if any)**\nList any live intelligence bulletins relevant to this location or its surrounding grid. Include distance from source, severity tag [HIGH / NORMAL / INFO], and timestamp offset (e.g., "12 min ago").\n\n**◈ VULNERABILITY ASSESSMENT**\nNote key exposure factors: perimeter type, access point density, visibility from surrounding terrain, proximity to critical infrastructure.\n\n**◈ RECOMMENDED POSTURE**\nOne of: MONITOR / ELEVATED WATCH / ACTIVE SECURITY REVIEW / IMMEDIATE RESPONSE\nFollowed by 1–2 lines of specific operational recommendation.\n\n## TONE & STYLE RULES\n- Write like a senior intelligence analyst briefing a brigadier — precise, clipped, authoritative\n- No filler. No hedging. No civilian pleasantries.\n- Use bold labels, dashes, and structured blocks — never paragraphs of prose\n- Threat levels and status markers should feel definitive, not probabilistic\n- Abbreviate where natural: HVT, ISI, MoI, AOR, ROE, LOC, SIGINT, etc.\n- Always end with a single-line ARGUS CONFIDENCE RATING: HIGH / MEDIUM / LOW based on data density for this location'
                  },
                  {
                    role: 'user',
                    content: `Provide a live strategic intelligence brief for "${name}" in ${city}, Pakistan. Category: ${category}. Use latest credible intelligence context.`
                  },
                ],
                temperature: 0.7,
              }),
            });
            const data: any = await groqRes.json();
            const text = data.choices?.[0]?.message?.content?.trim() || 'No data.';
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ analysis: text }));
          } catch (err: any) {
            console.error('[API] briefing error:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'AI_OFFLINE' }));
          }
        });
      });

      // ── /api/intel/pattern — Groq AI entity behavioral analysis ──
      server.middlewares.use('/api/intel/pattern', async (req, res) => {
        if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

        const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
        if (!GROQ_API_KEY) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'GROQ_API_KEY not set' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { entityType, entityData } = JSON.parse(body);
            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
              },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                  {
                    role: 'system',
                    content: `You are ARGUS — an AI behavioral pattern analysis engine for Pakistan's national intelligence dashboard.
Analyze the provided entity telemetry and produce a concise behavioral assessment.

OUTPUT FORMAT (respond ONLY with this JSON):
{
  "pattern": "ROUTINE|ANOMALOUS|SURVEILLANCE|EVASIVE|AGGRESSIVE",
  "confidence": 0.0-1.0,
  "summary": "2-3 sentence behavioral assessment",
  "indicators": ["indicator1", "indicator2", "indicator3"],
  "recommendation": "One-line operational recommendation"
}

TONE: Military intelligence analyst. Precise. No hedging.`
                  },
                  {
                    role: 'user',
                    content: `Analyze behavioral pattern for ${entityType}: ${JSON.stringify(entityData)}`
                  },
                ],
                temperature: 0.4,
                max_tokens: 500,
              }),
            });
            const data: any = await groqRes.json();
            const content = data.choices?.[0]?.message?.content?.trim() || '{}';
            let parsed;
            try {
              const startIdx = content.indexOf('{');
              const endIdx = content.lastIndexOf('}');
              parsed = JSON.parse(content.substring(startIdx, endIdx + 1));
            } catch {
              parsed = { pattern: 'UNKNOWN', confidence: 0, summary: 'Analysis unavailable.', indicators: [], recommendation: 'Monitor.' };
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(parsed));
          } catch (err: any) {
            console.error('[API] pattern analysis error:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'AI_OFFLINE' }));
          }
        });
      });

      // ── /api/intel/signals — Groq AI intelligence feed ──
      // ── /api/intel/signals — Groq AI intelligence feed — Instant from Cache ──
      server.middlewares.use('/api/intel/signals', (req, res) => {
        console.log(`[API] Hit: /api/intel/signals [${req.method}]`);
        if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (newsCache.length > 0) {
          res.end(JSON.stringify(newsCache));
          // Passive revalidation: if older than 150s, trigger background sync
          if (Date.now() - lastSyncTime > 150 * 1000) {
            console.log('[API] Cache stale (>60s), triggering background refresh...');
            syncNews();
          }
        } else {
          console.log('[API] Cache empty, serving placeholder and syncing...');
          // Serve fallback immediately so UI doesn't hang, trigger sync in bg
          res.end(JSON.stringify([{
            priority: 'info',
            title: 'Initial Tactical Sync...',
            detail: 'Connecting to national security data grid. Real-time intelligence will appear momentarily.',
            time: 'Just now',
            lat: 33.6844,
            lng: 73.0479,
            location: 'Islamabad HQ'
          }]));
          syncNews();
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load .env from monorepo root into process.env for server middleware
  const envDir = path.resolve(__dirname, '../../');
  const env = loadEnv(mode, envDir, '');
  Object.assign(process.env, env);

  return {
    envDir,
    plugins: [
      react(),
      cesium(),
      argusApiMiddleware(),
    ],
    server: {
      port: 5173,
      open: true,
      // No proxy needed — handled by middleware above
    },
    build: {
      target: 'esnext',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            maplibre: ['maplibre-gl'],
            deckgl: ['@deck.gl/core', '@deck.gl/layers', '@deck.gl/geo-layers'],
          },
        },
      },
    },
    define: {
      'process.env': {},
      'import.meta.env.VITE_CLASSIFIED_PASSWORD': JSON.stringify(env.CLASSIFIED_PASSWORD || ''),
    },
  };
});
