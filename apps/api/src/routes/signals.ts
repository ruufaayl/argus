// ============================================================
// Signals Intelligence Route — Pakistan Sentinel
// Aggregates AQI, Weather, and Outages into unified Signals
// ============================================================

import { Hono } from 'hono';

const app = new Hono();

// Helper to generate a unique ID
function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

app.get('/', async (c) => {
  const cityId = c.req.query('city') || 'karachi';
  
  // To aggregate, we need to fetch the other endpoints.
  // We use the request origin to safely fetch our own API.
  let origin = new URL(c.req.url).origin;
  if (origin.includes('localhost')) {
    origin = 'http://127.0.0.1:8787';
  }
  
  const [aqiRes, weatherRes, outagesRes] = await Promise.all([
    fetch(`${origin}/api/aqi?city=${cityId}`).then(r => r.json() as Promise<any>).catch(() => null),
    fetch(`${origin}/api/weather?city=${cityId}`).then(r => r.json() as Promise<any>).catch(() => null),
    fetch(`${origin}/api/outages?city=${cityId}`).then(r => r.json() as Promise<any>).catch(() => null)
  ]);

  const signals: any[] = [];
  const now = Date.now();

  // 1. AQI Signals
  if (aqiRes && aqiRes.averageAqi) {
    const aqi = aqiRes.averageAqi;
    if (aqi > 200) {
      signals.push({
        id: makeId('sig-aqi'), cityId, timestamp: now - 120000,
        source: 'aqi', severity: 'critical',
        title: 'HAZARDOUS AIR QUALITY',
        detail: `Citywide PM2.5 levels indicate AQI ${aqi}. Severe respiratory risk.`,
        metadata: { aqi }
      });
    } else if (aqi > 150) {
      signals.push({
        id: makeId('sig-aqi'), cityId, timestamp: now - 350000,
        source: 'aqi', severity: 'warning',
        title: 'POOR AIR QUALITY',
        detail: `AQI levels elevated at ${aqi}. Sensitive groups should limit exposure.`,
        metadata: { aqi }
      });
    }
  }

  // 2. Weather Signals
  if (weatherRes) {
    const { temperature, isRaining, windSpeed } = weatherRes;
    if (temperature > 40) {
      signals.push({
        id: makeId('sig-wea'), cityId, timestamp: now - 180000,
        source: 'weather', severity: 'critical',
        title: 'EXTREME HEAT WARNING',
        detail: `Surface temperature measured at ${temperature}°C. High risk of grid strain.`,
        metadata: { temperature }
      });
    } else if (temperature > 35) {
      signals.push({
        id: makeId('sig-wea'), cityId, timestamp: now - 900000,
        source: 'weather', severity: 'warning',
        title: 'ELEVATED TEMPERATURE',
        detail: `Current temperature is ${temperature}°C.`,
        metadata: { temperature }
      });
    }

    if (isRaining) {
      signals.push({
        id: makeId('sig-wea-r'), cityId, timestamp: now - 45000,
        source: 'weather', severity: 'warning',
        title: 'PRECIPITATION DETECTED',
        detail: `Rain detected. Monitor low-lying districts for potential urban flooding.`,
        metadata: { isRaining }
      });
    }
    
    if (windSpeed > 30) {
      signals.push({
        id: makeId('sig-wea-w'), cityId, timestamp: now - 600000,
        source: 'weather', severity: 'warning',
        title: 'HIGH WINDS',
        detail: `Sustained winds at ${windSpeed} km/h detected.`,
        metadata: { windSpeed }
      });
    }
  }

  // 3. Outage Signals
  if (outagesRes && outagesRes.activeOutages) {
    outagesRes.activeOutages.forEach((outage: any) => {
      signals.push({
        id: outage.id,
        cityId,
        timestamp: outage.startTime,
        source: 'power',
        severity: outage.severity,
        title: outage.severity === 'critical' ? 'CRITICAL GRID FAILURE' : 'SCHEDULED LOAD SHEDDING',
        detail: `Power outage in ${outage.district} ongoing for ${outage.durationHours} hours.`,
        district: outage.district,
        metadata: { durationHours: outage.durationHours }
      });
    });
  }

  // Generate some synthetic info signals to keep the feed alive
  signals.push({
    id: makeId('sig-sys'), cityId, timestamp: now - 15000,
    source: 'traffic', severity: 'info',
    title: 'TRAFFIC FLOW NOMINAL',
    detail: 'Primary arterial routes reporting standard congestion levels.',
    metadata: {}
  });

  // Sort by timestamp descending
  signals.sort((a, b) => b.timestamp - a.timestamp);

  return c.json({
    cityId,
    timestamp: now,
    signals: signals.slice(0, 20) // send top 20 latest
  });
});

export default app;
