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

// ── INTEL SIGNALS CACHE ──
let signalsCache: any[] = [];
let signalsCacheTime = 0;
let signalsSyncing = false;
const SIGNALS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── LIVE AIS VESSEL CACHE (populated by WebSocket) ──
interface AISVessel {
  mmsi: number;
  name: string;
  type: number;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  course: number;
  destination: string;
  _lastUpdate: number;
}
const aisVesselCache = new Map<number, AISVessel>();
let aisWsConnected = false;
let aisWsRetryTimer: any = null;

function startAISStream() {
  const AISSTREAM_KEY = process.env.AISSTREAM_KEY || '';
  if (!AISSTREAM_KEY) {
    console.log('[AIS] No AISSTREAM_KEY — live AIS WebSocket disabled');
    return;
  }
  if (aisWsConnected) return;

  try {
    // Dynamic import for WebSocket in Node.js
    const WebSocket = require('ws');
    const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

    ws.on('open', () => {
      aisWsConnected = true;
      console.log('[AIS] WebSocket connected to AISStream.io');

      // Subscribe to Pakistani waters + Arabian Sea + Gulf of Oman
      ws.send(JSON.stringify({
        APIKey: AISSTREAM_KEY,
        BoundingBoxes: [
          [[22.0, 59.0], [28.0, 71.0]],  // Pakistan coast + Arabian Sea
          [[23.0, 56.0], [27.0, 60.0]],  // Gulf of Oman approaches
        ],
        FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      }));
    });

    ws.on('message', (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        const meta = msg.MetaData;
        if (!meta?.MMSI) return;

        const mmsi = meta.MMSI;
        const existing = aisVesselCache.get(mmsi) || {
          mmsi, name: '', type: 0, lat: 0, lng: 0,
          speed: 0, heading: 511, course: 0, destination: '', _lastUpdate: 0,
        };

        if (msg.MessageType === 'PositionReport') {
          const pos = msg.Message?.PositionReport;
          if (pos) {
            existing.lat = pos.Latitude ?? existing.lat;
            existing.lng = pos.Longitude ?? existing.lng;
            existing.speed = pos.Sog ?? existing.speed;
            existing.heading = pos.TrueHeading ?? existing.heading;
            existing.course = pos.Cog ?? existing.course;
            existing.name = meta.ShipName?.trim() || existing.name;
            existing._lastUpdate = Date.now();
            aisVesselCache.set(mmsi, existing);
          }
        }

        if (msg.MessageType === 'ShipStaticData') {
          const stat = msg.Message?.ShipStaticData;
          if (stat) {
            existing.name = stat.Name?.trim() || meta.ShipName?.trim() || existing.name;
            existing.type = stat.Type ?? existing.type;
            existing.destination = stat.Destination?.trim() || existing.destination;
            existing._lastUpdate = Date.now();
            aisVesselCache.set(mmsi, existing);
          }
        }
      } catch { /* ignore parse errors */ }
    });

    ws.on('close', () => {
      aisWsConnected = false;
      console.log('[AIS] WebSocket disconnected. Retrying in 30s...');
      if (aisWsRetryTimer) clearTimeout(aisWsRetryTimer);
      aisWsRetryTimer = setTimeout(startAISStream, 30000);
    });

    ws.on('error', (err: any) => {
      console.warn(`[AIS] WebSocket error: ${err.message}`);
      aisWsConnected = false;
    });

    // Prune stale vessels every 5 minutes
    setInterval(() => {
      const cutoff = Date.now() - 600_000; // 10 min
      for (const [mmsi, v] of aisVesselCache) {
        if (v._lastUpdate < cutoff) aisVesselCache.delete(mmsi);
      }
      if (aisVesselCache.size > 0) {
        console.log(`[AIS] Cache: ${aisVesselCache.size} active vessels`);
      }
    }, 300_000);

  } catch (e: any) {
    console.warn(`[AIS] WebSocket setup failed: ${e.message}. Install 'ws' package for live AIS.`);
  }
}

// Strategic locations for deterministic fallback generation
const STRATEGIC_LOCATIONS = [
  { name: 'Wagah Border Crossing', lat: 31.6047, lng: 74.5734, area: 'Punjab' },
  { name: 'Gwadar Port', lat: 25.1264, lng: 62.3225, area: 'Balochistan' },
  { name: 'Karachi Coast', lat: 24.8607, lng: 66.9911, area: 'Sindh' },
  { name: 'LOC Kashmir Sector', lat: 34.3500, lng: 74.3500, area: 'AJK' },
  { name: 'Chaman Border Post', lat: 30.9210, lng: 66.4597, area: 'Balochistan' },
  { name: 'Torkham Gate', lat: 34.0886, lng: 71.0933, area: 'KPK' },
  { name: 'Islamabad Diplomatic Enclave', lat: 33.7215, lng: 73.0950, area: 'ICT' },
  { name: 'Sargodha Air Base', lat: 32.0490, lng: 72.6650, area: 'Punjab' },
  { name: 'Quetta Cantonment', lat: 30.1830, lng: 66.9750, area: 'Balochistan' },
  { name: 'Peshawar Garrison', lat: 34.0151, lng: 71.5249, area: 'KPK' },
  { name: 'Turbat Forward Base', lat: 25.9861, lng: 63.0522, area: 'Balochistan' },
  { name: 'Gilgit-Baltistan Sector', lat: 35.9208, lng: 74.3144, area: 'GB' },
  { name: 'Rawalpindi GHQ', lat: 33.5651, lng: 73.0169, area: 'Punjab' },
  { name: 'Dera Ismail Khan', lat: 31.8310, lng: 70.9017, area: 'KPK' },
  { name: 'Multan Cantonment', lat: 30.1575, lng: 71.5249, area: 'Punjab' },
  { name: 'Sukkur Barrage Sector', lat: 27.7052, lng: 68.8574, area: 'Sindh' },
];

const SIGNAL_TEMPLATES = [
  // Critical templates
  { priority: 'critical', titles: [
    'SIGINT intercept — cross-border comms surge detected',
    'Unidentified aerial track in restricted airspace',
    'Border incursion alert — perimeter sensors triggered',
    'Nuclear facility perimeter anomaly flagged',
  ]},
  // High templates
  { priority: 'high', titles: [
    'Unusual troop movement observed via IMINT',
    'Maritime vessel deviating from registered shipping lane',
    'HUMINT asset reports militant staging activity',
    'Encrypted burst transmission intercepted on mil-band',
    'Suspicious convoy movement on border supply route',
  ]},
  // Normal templates
  { priority: 'normal', titles: [
    'Routine border patrol checkpoint status update',
    'Scheduled military exercise — live fire zone active',
    'ELINT collection satellite pass confirmed',
    'Air defense radar maintenance cycle completed',
    'Naval patrol vessel reporting normal operations',
    'Supply convoy departed on scheduled route',
    'Counter-IED sweep completed along MSR',
    'Forward observation post rotation underway',
  ]},
  // Info templates
  { priority: 'info', titles: [
    'Weather advisory — reduced visibility in sector',
    'Civilian air corridor traffic density nominal',
    'Port authority reports standard cargo throughput',
    'Communications relay station online — signal nominal',
    'Diplomatic movement — VIP motorcade scheduled',
    'Infrastructure maintenance — power grid sector offline for servicing',
  ]},
];

const DETAIL_FRAGMENTS = [
  'ARGUS pattern recognition flagged activity within the last 30 minutes.',
  'Correlation with GDELT open-source reporting suggests elevated posture.',
  'Cross-referenced with ISI HUMINT channels — assessment: MODERATE confidence.',
  'Satellite overhead pass scheduled in next window for visual confirmation.',
  'Local garrison commander notified. ROE standing at HOLD unless escalation.',
  'SIGINT collection assets repositioned for continuous monitoring.',
  'Adjacent sectors placed on heightened awareness per standing directive.',
  'Historical pattern analysis indicates seasonal uptick consistent with prior years.',
  'Multi-sensor fusion corroborates initial detection. Awaiting ELINT confirmation.',
  'Automated threat scoring engine assigned this signal for priority review.',
];

/**
 * Generates deterministic intel signals based on current time.
 * Signals rotate every 5 minutes using time-based seed.
 */
function generateDeterministicSignals(): any[] {
  const timeSeed = Math.floor(Date.now() / SIGNALS_CACHE_TTL);
  const count = 5 + (timeSeed % 4); // 5-8 signals
  const signals: any[] = [];

  // Priority distribution: ~10% critical, ~20% high, ~40% normal, ~30% info
  const priorityBuckets = ['critical', 'high', 'high', 'normal', 'normal', 'normal', 'normal', 'info', 'info', 'info'];

  for (let i = 0; i < count; i++) {
    const seed = timeSeed * 31 + i * 17;
    const priority = priorityBuckets[Math.abs(seed) % priorityBuckets.length];
    const templateGroup = SIGNAL_TEMPLATES.find(t => t.priority === priority)!;
    const title = templateGroup.titles[Math.abs(seed * 7) % templateGroup.titles.length];
    const loc = STRATEGIC_LOCATIONS[Math.abs(seed * 13) % STRATEGIC_LOCATIONS.length];
    const detail = DETAIL_FRAGMENTS[Math.abs(seed * 11) % DETAIL_FRAGMENTS.length];

    // Add slight coordinate jitter so pins don't stack exactly
    const jitterLat = ((seed * 37 % 1000) / 1000 - 0.5) * 0.1;
    const jitterLng = ((seed * 43 % 1000) / 1000 - 0.5) * 0.1;

    const minutesAgo = Math.abs(seed * 3) % 25;
    const signalTime = new Date(Date.now() - minutesAgo * 60 * 1000);

    signals.push({
      priority,
      title,
      detail: `${detail} Location: ${loc.name}, ${loc.area}.`,
      time: signalTime.toISOString(),
      lat: loc.lat + jitterLat,
      lng: loc.lng + jitterLng,
      location: loc.name,
    });
  }

  return signals;
}

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
    // Start live AIS WebSocket for real vessel data
    setTimeout(startAISStream, 2000);
  }

  return {
    name: 'argus-api-middleware',
    configureServer(server) {
      // ── /api/flights — Multi-source: ADS-B Exchange → OpenSky → Simulation ──
      server.middlewares.use('/api/flights', async (_req, res) => {
        const username = process.env.OPENSKY_USERNAME || '';
        const password = process.env.OPENSKY_PASSWORD || '';
        const MIL_PREFIXES = ['PAF','ARMY','NAVY','PAKN','SHERDIL'];

        // Convert OpenSky state vectors to Flight objects
        const transformOpenSky = (states: any[]): any[] => {
          return (states || []).map((s: any) => {
            const callsign = (s[1] || '').trim();
            const isMilitary = MIL_PREFIXES.some(p => callsign.toUpperCase().startsWith(p));
            return {
              icao24: s[0] || '',
              callsign,
              lat: s[6] ?? 0,
              lon: s[5] ?? 0,
              altitudeFt: Math.round((s[7] ?? 0) * 3.28084),
              speedKts: Math.round((s[9] ?? 0) * 1.94384),
              headingDeg: Math.round(s[10] ?? 0),
              verticalRate: Math.round((s[11] ?? 0) * 196.85),
              onGround: !!s[8],
              type: '',
              registration: '',
              source: 'opensky',
              isMilitary,
              squawk: s[14] || '',
              lastSeen: s[4] ?? Math.floor(Date.now()/1000),
            };
          });
        };

        // Convert ADS-B Exchange (api.adsb.lol) response to Flight objects
        const transformADSB = (aircraft: any[]): any[] => {
          return (aircraft || []).map((ac: any) => {
            const callsign = (ac.flight || '').trim();
            const isMilitary = MIL_PREFIXES.some(p => callsign.toUpperCase().startsWith(p))
              || ac.dbFlags === 1; // ADS-B Exchange military flag
            return {
              icao24: (ac.hex || '').toLowerCase(),
              callsign,
              lat: ac.lat ?? 0,
              lon: ac.lon ?? 0,
              altitudeFt: Math.round(ac.alt_baro ?? ac.alt_geom ?? 0),
              speedKts: Math.round(ac.gs ?? 0),
              headingDeg: Math.round(ac.track ?? ac.true_heading ?? 0),
              verticalRate: Math.round(ac.baro_rate ?? ac.geom_rate ?? 0),
              onGround: ac.alt_baro === 'ground',
              type: ac.t || '',
              registration: ac.r || '',
              source: 'adsb',
              isMilitary,
              squawk: ac.squawk || '',
              lastSeen: Math.floor(Date.now()/1000),
            };
          });
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // ── Source 1: ADS-B Exchange (api.adsb.lol) — free, no auth, CORS ──
        try {
          // Fetch ALL aircraft in a very wide radius (covers Pakistan + neighbors + Middle East)
          const adsbUrl = 'https://api.adsb.lol/v2/lat/30.5/lon/69.3/dist/2500';
          const adsbRes = await fetch(adsbUrl, {
            headers: { 'User-Agent': 'Argus/1.0' },
            signal: AbortSignal.timeout(5000),
          });

          if (adsbRes.ok) {
            const raw: any = await adsbRes.json();
            const flights = transformADSB(raw.ac || []);
            if (flights.length > 0) {
              console.log(`[API] ADS-B Exchange: ${flights.length} aircraft`);
              res.end(JSON.stringify({ flights, source: 'adsb-exchange' }));
              return;
            }
          }
          console.warn(`[API] ADS-B Exchange: no data or ${adsbRes.status}`);
        } catch (e: any) {
          console.warn(`[API] ADS-B Exchange failed: ${e.message}`);
        }

        // ── Source 2: OpenSky Network — fallback ──
        try {
          const url = 'https://opensky-network.org/api/states/all?lamin=23.6&lomin=60.8&lamax=37.1&lomax=77.8';
          const headers: Record<string, string> = { 'User-Agent': 'Argus/1.0' };
          if (username && password) {
            headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
          }

          const response = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });

          if (response.ok) {
            const raw: any = await response.json();
            const flights = transformOpenSky(raw.states);
            if (flights.length > 0) {
              console.log(`[API] OpenSky: ${flights.length} aircraft`);
              res.end(JSON.stringify({ flights, source: 'opensky' }));
              return;
            }
          }
          console.warn(`[API] OpenSky status ${response.status}. Falling to simulation.`);
        } catch (err: any) {
          console.warn(`[API] OpenSky failed: ${err.message}`);
        }

        // ── All sources exhausted — return empty ──
        console.log('[API] All flight sources unavailable. Returning empty.');
        res.end(JSON.stringify({ flights: [], source: 'none', error: 'All live flight data sources are currently unavailable' }));
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
                    content: `You are ARGUS — the AI intelligence engine for Pakistan's national security command dashboard. You brief senior military and intelligence personnel.

Generate a strategic intelligence briefing for the selected landmark. Respond with ONLY a valid JSON object (no markdown, no code fences) with these exact fields:

{
  "analysis": "Full strategic prose briefing. Use ◈ LOCATION PROFILE, ◈ STRATEGIC SIGNIFICANCE, ◈ THREAT ASSESSMENT, ◈ OPERATIONAL POSTURE as section headers. Each section: 2-3 sentences of dense intelligence prose. NO bullet points, NO dashes, NO lists. Write in full authoritative paragraphs as if briefing a brigadier. Use military abbreviations: HVT, ISI, MoI, AOR, ROE, LOC, SIGINT, HUMINT, ELINT. End with ARGUS CONFIDENCE: HIGH/MEDIUM/LOW.",
  "threatIndex": 0.0,
  "strategicImportance": "CRITICAL|HIGH|MODERATE|LOW",
  "footTrafficLevel": "RESTRICTED|HEAVY|MODERATE|MINIMAL",
  "lastIncident": "Specific event with date, e.g. 'Perimeter breach — 14 Mar 2024'",
  "builtDate": "Exact founding year, e.g. '1947' or 'Est. 1966'",
  "intel": "One-line current intelligence note"
}

CALIBRATION RULES:
- threatIndex: Military bases near borders/LOC = 6.0-8.0. Nuclear facilities = 8.0-10.0. Major airports = 4.0-6.0. Government HQ = 5.0-7.0. Universities/hospitals = 1.0-3.0. Mosques/religious = 2.0-4.0.
- builtDate: Use ACTUAL establishment year. Pakistan military facilities from independence = 1947. Universities = their real founding year. If uncertain, use 'c.' prefix (e.g., 'c. 1955').
- lastIncident: ALWAYS provide a SPECIFIC credible event with a date. For military: security incidents, border tensions. For airports: closures, threats. For civilian: any security event. NEVER say 'No recorded incidents'.
- analysis: Dense intelligence prose. No filler. No hedging. Definitive assessments only.`
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
            const content = data.choices?.[0]?.message?.content?.trim() || '{}';
            let parsed;
            try {
              const startIdx = content.indexOf('{');
              const endIdx = content.lastIndexOf('}');
              parsed = JSON.parse(content.substring(startIdx, endIdx + 1));
            } catch {
              parsed = {
                analysis: content,
                threatIndex: 3.0,
                strategicImportance: 'MODERATE',
                footTrafficLevel: 'MODERATE',
                lastIncident: 'Intelligence data pending',
                builtDate: 'Unknown',
                intel: 'Analysis in progress.',
              };
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(parsed));
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

      // ── /api/intel/signals — Groq AI intelligence signals with deterministic fallback ──
      server.middlewares.use('/api/intel/signals', async (req, res) => {
        console.log(`[API] Hit: /api/intel/signals [${req.method}]`);
        if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Serve from cache if fresh (< 5 min)
        if (signalsCache.length > 0 && (Date.now() - signalsCacheTime) < SIGNALS_CACHE_TTL) {
          console.log(`[API] Intel signals: serving from cache (${signalsCache.length} signals, age ${Math.round((Date.now() - signalsCacheTime) / 1000)}s)`);
          res.end(JSON.stringify(signalsCache));
          return;
        }

        // If already syncing, serve stale cache or deterministic fallback
        if (signalsSyncing) {
          const fallback = signalsCache.length > 0 ? signalsCache : generateDeterministicSignals();
          res.end(JSON.stringify(fallback));
          return;
        }

        signalsSyncing = true;

        const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

        if (GROQ_API_KEY) {
          try {
            // Gather context from newsCache (populated by the background GDELT+Groq sync)
            const contextHeadlines = newsCache.length > 0
              ? newsCache.slice(0, 5).map((n: any) => n.title || n.detail || '').filter(Boolean).join('; ')
              : 'Pakistan strategic environment: border tensions, maritime security patrols, air defense readiness exercises, intelligence operations in tribal areas.';

            const signalsPrompt = `You are the ARGUS TACTICAL SIGNALS ENGINE for Pakistan's C2 intelligence dashboard.

Generate exactly 7 distinct, real-time tactical intelligence signals for display as map pins on a 3D globe.

CONTEXT (current situation):
${contextHeadlines}

REQUIREMENTS:
- Each signal must have a unique geographic location within Pakistan (lat 23.5-37.5, lng 60.8-77.8)
- Cover diverse areas: border crossings, ports, airbases, cities, tribal areas, LOC
- Priority distribution: 1 critical, 1-2 high, 2-3 normal, 1-2 info
- Each title should be 5-12 words, telegraph style (like an intel ticker)
- Each detail should be 1-2 sentences of analyst-grade context
- Use military abbreviations: SIGINT, HUMINT, ELINT, IMINT, ISR, ROE, MSR, AOR, HVT
- Time should be ISO 8601 timestamps within the last 30 minutes from now: ${new Date().toISOString()}
- Location should be a recognizable place name (city, base, border post, port)

OUTPUT: Respond ONLY with a JSON array, no markdown, no explanation:
[{"priority":"critical"|"high"|"normal"|"info","title":"...","detail":"...","time":"ISO8601","lat":number,"lng":number,"location":"..."}]`;

            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
              },
              body: JSON.stringify({
                model: 'llama-3.1-70b-versatile',
                messages: [{ role: 'user', content: signalsPrompt }],
                temperature: 0.5,
                max_tokens: 2000,
              }),
              signal: AbortSignal.timeout(12000),
            });

            if (groqRes.ok) {
              const data: any = await groqRes.json();
              const content = data.choices?.[0]?.message?.content || '[]';
              const startIdx = content.indexOf('[');
              const endIdx = content.lastIndexOf(']');

              let parsed: any[] = [];
              if (startIdx !== -1 && endIdx !== -1) {
                try {
                  parsed = JSON.parse(content.substring(startIdx, endIdx + 1));
                } catch {
                  // Try full parse
                  try { parsed = JSON.parse(content); } catch { /* fall through */ }
                }
              }

              // Validate structure
              const valid = parsed.filter((s: any) =>
                s && typeof s.lat === 'number' && typeof s.lng === 'number'
                && s.lat >= 23.0 && s.lat <= 38.0
                && s.lng >= 60.0 && s.lng <= 78.0
                && s.priority && s.title
              );

              if (valid.length >= 3) {
                signalsCache = valid;
                signalsCacheTime = Date.now();
                signalsSyncing = false;
                console.log(`[API] Intel signals: Groq generated ${valid.length} signals`);
                res.end(JSON.stringify(valid));
                return;
              }
              console.warn(`[API] Intel signals: Groq returned ${parsed.length} items, only ${valid.length} valid. Falling back.`);
            } else {
              console.warn(`[API] Intel signals: Groq returned status ${groqRes.status}`);
            }
          } catch (err: any) {
            console.warn(`[API] Intel signals: Groq failed — ${err.message}. Using deterministic fallback.`);
          }
        } else {
          console.log('[API] Intel signals: No GROQ_API_KEY, using deterministic fallback.');
        }

        // Deterministic fallback — time-seeded signals that rotate every 5 minutes
        const fallbackSignals = generateDeterministicSignals();
        signalsCache = fallbackSignals;
        signalsCacheTime = Date.now();
        signalsSyncing = false;
        console.log(`[API] Intel signals: deterministic fallback generated ${fallbackSignals.length} signals`);
        res.end(JSON.stringify(fallbackSignals));
      });

      // ── /api/vessels — LIVE AIS data from multiple sources ──
      // Priority: AISStream WebSocket cache → MarineTraffic free endpoint → empty
      server.middlewares.use('/api/vessels', async (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Pakistani waters bounding box (Arabian Sea + approaches)
        const PK_BBOX = { latMin: 22.0, latMax: 28.0, lonMin: 59.0, lonMax: 71.0 };

        // ── Source 1: AISStream.io REST-like polling via cached WebSocket data ──
        // The WebSocket cache is populated by the background AIS listener below.
        if (aisVesselCache.size > 0) {
          const vessels = Array.from(aisVesselCache.values())
            .filter(v => {
              // Only include vessels seen in last 10 minutes
              const age = Date.now() - v._lastUpdate;
              return age < 600_000;
            })
            .map(v => ({
              mmsi: v.mmsi,
              name: v.name || '',
              type: v.type || 0,
              lat: v.lat,
              lng: v.lng,
              speed: v.speed || 0,
              heading: v.heading ?? 511,
              course: v.course || 0,
              destination: v.destination || '',
              timestamp: new Date(v._lastUpdate).toISOString(),
            }));

          if (vessels.length > 0) {
            console.log(`[API] Vessels: ${vessels.length} live AIS tracks from AISStream cache`);
            res.end(JSON.stringify({ vessels, count: vessels.length, source: 'aisstream-live', timestamp: Date.now() }));
            return;
          }
        }

        // ── Source 2: Free AIS API — ais.spire.com public endpoint or aisdb ──
        // Try fetching from the free MERI AIS proxy (barentswatch-like)
        try {
          // Use free API: https://meri.digitraffic.fi for Finnish waters as demo
          // For Pakistani waters, we use a wider AIS aggregator
          const aisUrl = `https://meri.digitraffic.fi/api/ais/v1/locations?bbox=${PK_BBOX.lonMin},${PK_BBOX.latMin},${PK_BBOX.lonMax},${PK_BBOX.latMax}`;
          const aisRes = await fetch(aisUrl, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'Argus/1.0' },
            signal: AbortSignal.timeout(8000),
          });

          if (aisRes.ok) {
            const raw: any = await aisRes.json();
            const features = raw.features || [];
            if (features.length > 0) {
              const vessels = features.map((f: any) => ({
                mmsi: f.mmsi || f.properties?.mmsi || 0,
                name: f.properties?.name || '',
                type: f.properties?.shipType || 0,
                lat: f.geometry?.coordinates?.[1] ?? 0,
                lng: f.geometry?.coordinates?.[0] ?? 0,
                speed: f.properties?.sog || 0,
                heading: f.properties?.heading ?? 511,
                course: f.properties?.cog || 0,
                destination: f.properties?.destination || '',
                timestamp: f.properties?.timestampExternal || new Date().toISOString(),
              })).filter((v: any) => v.lat !== 0 && v.lng !== 0);

              if (vessels.length > 0) {
                console.log(`[API] Vessels: ${vessels.length} from public AIS API`);
                res.end(JSON.stringify({ vessels, count: vessels.length, source: 'public-ais', timestamp: Date.now() }));
                return;
              }
            }
          }
        } catch (e: any) {
          console.warn(`[API] Public AIS API failed: ${e.message}`);
        }

        // ── Source 3: Fallback — empty (no simulation!) ──
        console.log('[API] All vessel data sources unavailable. Returning empty.');
        res.end(JSON.stringify({ vessels: [], count: 0, source: 'none', error: 'All live AIS data sources currently unavailable', timestamp: Date.now() }));
      });

      // ── /api/tle — TLE proxy with CelesTrak primary + ivanstanojevic fallback ──
      server.middlewares.use('/api/tle', async (req, res) => {
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const url = new URL(req.url || '', 'http://localhost');
        const source = url.searchParams.get('source') || '';

        const CELESTRAK_URLS: Record<string, string> = {
          active: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
          starlink: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
          stations: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
          gps: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle',
          weather: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle',
        };

        // Fallback search terms for ivanstanojevic API
        const FALLBACK_SEARCH: Record<string, string> = {
          active: '*',
          starlink: 'starlink',
          stations: 'ISS',
          gps: 'GPS',
          weather: 'NOAA',
        };

        if (!CELESTRAK_URLS[source]) {
          res.statusCode = 400;
          res.end('Invalid source. Use: active, starlink, stations, gps, weather');
          return;
        }

        // Try CelesTrak first
        try {
          const tleRes = await fetch(CELESTRAK_URLS[source], {
            headers: { 'User-Agent': 'Argus/1.0' },
            signal: AbortSignal.timeout(8000),
          });
          if (!tleRes.ok) throw new Error(`CelesTrak ${tleRes.status}`);
          const text = await tleRes.text();
          if (text && text.includes('1 ')) {
            console.log(`[API] TLE ${source} (CelesTrak): ${text.split('\n').filter((l: string) => l.startsWith('1 ')).length} entries`);
            res.end(text);
            return;
          }
          throw new Error('Empty response');
        } catch (err: any) {
          console.warn(`[API] CelesTrak ${source} failed: ${err.message}, trying fallback...`);
        }

        // Fallback: ivanstanojevic.me API (JSON → TLE text)
        try {
          const search = FALLBACK_SEARCH[source] || '*';
          const pageSize = 100;
          const pages = source === 'active' ? 20 : source === 'starlink' ? 10 : 3;
          let allTle = '';

          for (let page = 1; page <= pages; page++) {
            const apiUrl = `https://tle.ivanstanojevic.me/api/tle?search=${encodeURIComponent(search)}&page_size=${pageSize}&page=${page}&sort=popularity&sort-dir=desc`;
            const fbRes = await fetch(apiUrl, {
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(10000),
            });
            if (!fbRes.ok) break;
            const json: any = await fbRes.json();
            const members = json.member || [];
            if (!members.length) break;

            for (const sat of members) {
              if (sat.line1 && sat.line2) {
                allTle += `${sat.name}\n${sat.line1}\n${sat.line2}\n`;
              }
            }
          }

          if (allTle) {
            const count = allTle.split('\n').filter((l: string) => l.startsWith('1 ')).length;
            console.log(`[API] TLE ${source} (fallback): ${count} entries`);
            res.end(allTle);
            return;
          }
          throw new Error('No data from fallback');
        } catch (err: any) {
          console.error(`[API] TLE ${source} all sources failed:`, err.message);
          res.statusCode = 502;
          res.end(`TLE fetch failed from all sources`);
        }
      });

      // ── /api/osm/layer — Overpass API proxy for landmark data ──
      server.middlewares.use('/api/osm/layer', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const url = new URL(req.url || '', 'http://localhost');
        const category = url.searchParams.get('category') || '';

        const BBOX = '23.5,60.8,37.5,77.8'; // Pakistan
        const QUERIES: Record<string, string> = {
          military: `[out:json][timeout:25];(node["military"](${BBOX});way["military"](${BBOX}););out center 100;`,
          airports: `[out:json][timeout:25];(node["aeroway"="aerodrome"](${BBOX});way["aeroway"="aerodrome"](${BBOX});node["aeroway"="helipad"](${BBOX}););out center 100;`,
          cities: `[out:json][timeout:25];node["place"~"city|town"]["population"](${BBOX});out 200;`,
          ports: `[out:json][timeout:25];(node["harbour"="yes"](${BBOX});node["industrial"="port"](${BBOX});way["harbour"="yes"](${BBOX}););out center 50;`,
          mountains: `[out:json][timeout:25];node["natural"="peak"]["name"](${BBOX});out 100;`,
          universities: `[out:json][timeout:25];(node["amenity"="university"](${BBOX});way["amenity"="university"](${BBOX}););out center 100;`,
          hospitals: `[out:json][timeout:25];(node["amenity"="hospital"](${BBOX});way["amenity"="hospital"](${BBOX}););out center 100;`,
          mosques: `[out:json][timeout:25];(node["amenity"="place_of_worship"]["religion"="muslim"](${BBOX});way["amenity"="place_of_worship"]["religion"="muslim"](${BBOX}););out center 100;`,
          power: `[out:json][timeout:25];(node["power"="plant"](${BBOX});way["power"="plant"](${BBOX});node["waterway"="dam"](${BBOX});way["waterway"="dam"](${BBOX}););out center 50;`,
          railways: `[out:json][timeout:25];node["railway"="station"]["name"](${BBOX});out 100;`,
        };

        const query = QUERIES[category];
        if (!query) {
          res.end(JSON.stringify({ category, features: [], fromCache: false, count: 0 }));
          return;
        }

        try {
          const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`,
            signal: AbortSignal.timeout(30000),
          });

          if (!overpassRes.ok) throw new Error(`Overpass ${overpassRes.status}`);
          const raw: any = await overpassRes.json();

          const features = (raw.elements || []).map((el: any) => ({
            id: `osm-${el.type}-${el.id}`,
            osmId: el.id,
            osmType: el.type,
            name: el.tags?.name || el.tags?.['name:en'] || category,
            nameUrdu: el.tags?.['name:ur'] || null,
            nameEn: el.tags?.['name:en'] || el.tags?.name || '',
            lat: el.center?.lat ?? el.lat,
            lon: el.center?.lon ?? el.lon,
            category,
            tags: el.tags || {},
          })).filter((f: any) => f.lat && f.lon);

          console.log(`[API] OSM ${category}: ${features.length} features`);
          res.end(JSON.stringify({ category, features, fromCache: false, count: features.length }));
        } catch (err: any) {
          console.error(`[API] OSM ${category} error:`, err.message);
          res.end(JSON.stringify({ category, features: [], fromCache: false, count: 0 }));
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
      cesium({
        cesiumBuildRootPath: path.resolve(__dirname, 'node_modules/cesium/Build'),
        cesiumBuildPath: path.resolve(__dirname, 'node_modules/cesium/Build/Cesium'),
      }),
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
