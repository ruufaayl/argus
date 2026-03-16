// ============================================================
// Stress Route — Pakistan Sentinel
// Derives aggregate City Stress Score (0-10) from live data
// ============================================================

import { Hono } from 'hono';

const app = new Hono();

app.get('/', async (c) => {
  const cityId = c.req.query('city') || 'karachi';
  let origin = new URL(c.req.url).origin;
  if (origin.includes('localhost')) {
    origin = 'http://127.0.0.1:8787';
  }

  // We only strictly *need* AQI, Weather, Outages, and Signals to compute stress
  const [aqiRes, weatherRes, outagesRes, signalsRes] = await Promise.all([
    fetch(`${origin}/api/aqi?city=${cityId}`).then(r => r.json() as Promise<any>).catch(() => null),
    fetch(`${origin}/api/weather?city=${cityId}`).then(r => r.json() as Promise<any>).catch(() => null),
    fetch(`${origin}/api/outages?city=${cityId}`).then(r => r.json() as Promise<any>).catch(() => null),
    fetch(`${origin}/api/signals?city=${cityId}`).then(r => r.json() as Promise<any>).catch(() => null)
  ]);

  // 1. AQI Component (Max 2.5) — Maps 0-500 to 0-2.5
  let aqiScore = 0;
  if (aqiRes && aqiRes.averageAqi) {
    aqiScore = Math.min(2.5, (aqiRes.averageAqi / 500) * 2.5);
  } else {
    aqiScore = cityId === 'lahore' ? 1.5 : 0.8; // Safe fallback
  }

  // 2. Heat Component (Max 2.0) — Maps 20C-50C to 0-2.0
  let heatScore = 0;
  if (weatherRes && weatherRes.temperature) {
    heatScore = Math.max(0, Math.min(2.0, ((weatherRes.temperature - 20) / 30) * 2.0));
  } else {
    heatScore = 1.0;
  }

  // 3. Grid Component (Max 2.0) — Maps 0-100% stress to 0-2.0
  let gridScore = 0;
  if (outagesRes && outagesRes.gridStress) {
    gridScore = (outagesRes.gridStress / 100) * 2.0;
  } else {
    gridScore = 0.5;
  }

  // 4. Signal Severity Component (Max 3.5) — Count critical/warnings
  let signalScore = 0;
  if (signalsRes && signalsRes.signals) {
    let criticals = 0;
    let warnings = 0;
    signalsRes.signals.forEach((s: any) => {
      if (s.severity === 'critical') criticals++;
      if (s.severity === 'warning') warnings++;
    });
    // Criticals weight 0.8, warnings weight 0.3
    signalScore = Math.min(3.5, (criticals * 0.8) + (warnings * 0.3));
  } else {
    signalScore = 1.0;
  }

  const totalScore = Math.min(10.0, aqiScore + heatScore + gridScore + signalScore);

  return c.json({
    cityId,
    timestamp: Date.now(),
    score: Number(totalScore.toFixed(1)),
    breakdown: {
      aqi: Number(aqiScore.toFixed(2)),
      heat: Number(heatScore.toFixed(2)),
      grid: Number(gridScore.toFixed(2)),
      signals: Number(signalScore.toFixed(2))
    }
  });
});

export default app;
