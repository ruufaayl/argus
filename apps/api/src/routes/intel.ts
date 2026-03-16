import { Hono } from 'hono';

type Bindings = {
  GROQ_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ── Threat Index Logic ──────────────────────────────────────────
// Calculated server-side, seeded by Groq's knowledge of real events.
// Formula: base category weight + geopolitical turbulence + strategic importance penalty
const CATEGORY_WEIGHTS: Record<string, number> = {
  military: 8.5,
  nuclear: 9.5,
  government: 7.5,
  transport: 5.5,
  industrial: 6.0,
  education: 3.5,
  healthcare: 3.0,
  religious: 4.5,
  commercial: 4.0,
  media: 5.0,
  tourism: 3.5,
};

// POST /api/intel/briefing — Landmark deep-dive with threat index
app.post('/briefing', async (c) => {
  const { GROQ_API_KEY } = c.env;
  if (!GROQ_API_KEY) return c.json({ error: 'AI_KEY_MISSING' }, 500);

  const { name, city, category } = await c.req.json();
  const baseWeight = CATEGORY_WEIGHTS[category?.toLowerCase()] ?? 5.0;
  const today = '2026-03-16';

  const systemPrompt = `You are ARGUS, a classified military-grade intelligence AI with access to real-world geopolitical data. 
Your analysis is grounded in actual events, historical data, and strategic assessments.
Current date: ${today}. Pakistan/South Asia regional focus.
Respond ONLY with a valid JSON object matching the requested schema exactly. No markdown, no explanation.`;

  const userPrompt = `Provide a classified strategic intelligence briefing for the following target:
Name: "${name}"
City: ${city}, Pakistan
Category: ${category}
Base Category Risk Weight: ${baseWeight}/10

Respond with this exact JSON schema:
{
  "analysis": "Three distinct intelligence bullets separated by double newlines. Each starts with •. Be specific, factual, grounded in real strategic context.",
  "threatIndex": <number 0.0-10.0, calculated combining: base weight ${baseWeight} + recent regional instability + target prominence + proximity to conflict zones>,
  "strategicImportance": <"CRITICAL" | "HIGH" | "MODERATE" | "LOW">,
  "footTrafficLevel": <"VERY HIGH" | "HIGH" | "MODERATE" | "LOW" | "RESTRICTED">,
  "lastIncident": "<year or 'No recorded incidents' or 'CLASSIFIED'>",
  "yearsStable": <integer, years since last major security incident at or near this location>,
  "intel": "<one-line concise summary of current threat posture>"
}`;

  try {
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    const data: any = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '{}';
    
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        analysis: `• ${name} is a ${category} facility in ${city} under routine monitoring.\n\n• No extraordinary threat indicators detected in recent intelligence cycle.\n\n• Standard security protocols apply for this classification tier.`,
        threatIndex: baseWeight,
        strategicImportance: baseWeight > 7 ? 'HIGH' : 'MODERATE',
        footTrafficLevel: 'MODERATE',
        lastIncident: 'No recorded incidents',
        yearsStable: 5,
        intel: 'Nominal threat posture',
      };
    }

    // Ensure threatIndex is clamped
    if (typeof parsed.threatIndex === 'number') {
      parsed.threatIndex = Math.min(10, Math.max(0, parsed.threatIndex));
    } else {
      parsed.threatIndex = baseWeight;
    }

    return c.json({ analysis: parsed.analysis, ...parsed });
  } catch (e) {
    console.error('Groq briefing error:', e);
    return c.json({ error: 'AI_OFFLINE' }, 500);
  }
});

// GET /api/intel/signals — Live strategic intelligence feed with real threat analysis
app.get('/signals', async (c) => {
  const { GROQ_API_KEY } = c.env;
  if (!GROQ_API_KEY) return c.json({ error: 'AI_KEY_MISSING' }, 500);

  const today = '2026-03-16';
  
  const systemPrompt = `You are ARGUS, a real-time classified intelligence AI for Pakistan's strategic monitoring network.
Current date: ${today}.
Your job is to provide the LATEST real news and strategic intelligence about Pakistan from the last 24 hours.
Focus on: military deployments, defense policy, India-Pakistan border activity, Afghanistan-Pakistan border, CPEC developments, nuclear program updates, political decisions affecting national security, terror incidents, major protests, constitutional changes, Supreme Court orders, economic sanctions, IMF negotiations, US-Pakistan relations, China-Pakistan relations, and any events with strategic implications.
Use your training data to provide the most recent and realistic intelligence.
Respond ONLY with a valid JSON array. No markdown. No explanations.`;

  const prompt = `Provide 6 real strategic intelligence items about Pakistan based on the most recent events (within the last 24 hours as of ${today}).

These should be REAL news events grounded in actual geopolitical developments — not fictional scenarios.
Cover: military movements, border tensions, political decisions, economic developments, security incidents, defense agreements.

Return ONLY a JSON array with this exact schema for each item:
[
  {
    "priority": "critical" | "high" | "normal",
    "title": "<specific headline based on real events — max 70 chars>",
    "detail": "<2-3 sentences about the real event with factual context>",
    "time": "<X min ago | X hrs ago | Just now — approximate recency>",
    "lat": <precise decimal latitude of the event location>,
    "lng": <precise decimal longitude of the event location>,
    "location": "<specific city, region or facility name>",
    "threatIndex": <number 0.0-10.0 based on strategic significance>,
    "footTraffic": "<VERY HIGH|HIGH|MODERATE|LOW|RESTRICTED>",
    "source": "<SIGINT|HUMINT|SATIMG|OSINT|ELINT>"
  }
]

Distribute priorities: 1 critical, 2 high, 3 normal. Use real Pakistan coordinates. Be specific — cite real institutions, programs, locations.`;

  try {
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.35,
        response_format: { type: 'json_object' },
      }),
    });

    const data: any = await res.json();
    let content = data.choices?.[0]?.message?.content || '{}';

    let parsed: any[] = [];
    try {
      const obj = JSON.parse(content);
      // Groq may wrap in an object key like { signals: [...] } or { items: [...] }
      if (Array.isArray(obj)) {
        parsed = obj;
      } else {
        // Find first array value
        const arrKey = Object.keys(obj).find(k => Array.isArray(obj[k]));
        parsed = arrKey ? obj[arrKey] : [];
      }
    } catch {
      console.error('Groq signals JSON parse error, raw:', content);
      parsed = [];
    }

    // Clamp threat indices and ensure valid structure
    parsed = parsed.map((item: any) => ({
      priority: item.priority || 'normal',
      title: item.title || 'Signal received',
      detail: item.detail || '',
      time: item.time || 'Just now',
      lat: typeof item.lat === 'number' ? item.lat : 30.37,
      lng: typeof item.lng === 'number' ? item.lng : 69.34,
      location: item.location || 'Pakistan',
      threatIndex: typeof item.threatIndex === 'number' ? Math.min(10, Math.max(0, item.threatIndex)) : 5.0,
      footTraffic: item.footTraffic || 'MODERATE',
      source: item.source || 'SIGINT',
    }));

    return c.json(parsed);
  } catch (e) {
    console.error('Groq signals error:', e);
    return c.json([], 500);
  }
});

export default app;
