// ============================================================
// AQI Route — ARGUS
// Extrapolates Air Quality Index from OpenAQ PM2.5/PM10 data
// ============================================================

import { Hono } from 'hono';

const app = new Hono<{ Bindings: { OPENAQ_API_KEY?: string } }>();

// City coordinates for radial search
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  karachi: { lat: 24.8615, lng: 67.0099 },
  lahore: { lat: 31.5497, lng: 74.3436 },
  islamabad: { lat: 33.6844, lng: 73.0479 },
  rawalpindi: { lat: 33.5973, lng: 73.0405 },
};

// US EPA PM2.5 Breakpoints for AQI Calculation
const PM25_BREAKPOINTS = [
  { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
  { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
  { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
];

/**
 * Calculate AQI using US EPA formula
 * AQI = ((I_High - I_Low) / (C_High - C_Low)) * (C - C_Low) + I_Low
 */
function calculateAqi(pm25: number): number {
  const bp = PM25_BREAKPOINTS.find((b) => pm25 >= b.cLow && pm25 <= b.cHigh) || PM25_BREAKPOINTS[PM25_BREAKPOINTS.length - 1];
  return Math.round(((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.iLow);
}

app.get('/', async (c) => {
  const cityId = c.req.query('city') || 'karachi';
  const coords = CITY_COORDS[cityId] || CITY_COORDS.karachi;

  try {
    const radius = 25000; // 25km
    const url = `https://api.openaq.org/v2/latest?coordinates=${coords.lat},${coords.lng}&radius=${radius}&parameter=pm25&limit=5`;
    
    const headers: Record<string, string> = {};
    if (c.env.OPENAQ_API_KEY) {
      headers['X-API-Key'] = c.env.OPENAQ_API_KEY;
    }

    const resp = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
    if (!resp.ok) {
      throw new Error(`OpenAQ returned ${resp.status}`);
    }

    const data = await resp.json() as any;
    
    // Safely extract results
    if (data.results && data.results.length > 0) {
      const readings = data.results.map((r: any) => {
        const pm25 = r.measurements[0]?.value || 0;
        return {
          location: r.location,
          coordinates: [r.coordinates.longitude, r.coordinates.latitude],
          pm25,
          aqi: calculateAqi(pm25),
          lastUpdated: r.measurements[0]?.lastUpdated
        };
      });

      // Calculate city average AQI based on top sensors
      const avgAqi = Math.round(readings.reduce((sum: number, r: any) => sum + r.aqi, 0) / readings.length);

      return c.json({
        cityId,
        averageAqi: avgAqi,
        sensors: readings
      });
    }

    // Fallback if no sensors found
    return c.json({
      cityId,
      averageAqi: cityId === 'lahore' ? 245 : cityId === 'karachi' ? 168 : 85,
      sensors: [],
      note: 'simulated fallback'
    });

  } catch (err) {
    console.error('AQI Error:', err);
    // Graceful fallback on error
    return c.json({
      cityId,
      averageAqi: cityId === 'lahore' ? 280 : cityId === 'karachi' ? 155 : 92,
      sensors: [],
      note: 'simulated fallback'
    });
  }
});

export default app;
