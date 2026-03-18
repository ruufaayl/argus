// ============================================================
// Weather Route — ARGUS
// Fetches live meteorology from Open-Meteo
// ============================================================

import { Hono } from 'hono';

const app = new Hono();

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  karachi: { lat: 24.8615, lng: 67.0099 },
  lahore: { lat: 31.5497, lng: 74.3436 },
  islamabad: { lat: 33.6844, lng: 73.0479 },
  rawalpindi: { lat: 33.5973, lng: 73.0405 },
};

app.get('/', async (c) => {
  const cityId = c.req.query('city') || 'karachi';
  const coords = CITY_COORDS[cityId] || CITY_COORDS.karachi;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    
    if (!resp.ok) {
      throw new Error(`Open-Meteo returned ${resp.status}`);
    }

    const data = await resp.json() as any;
    
    return c.json({
      cityId,
      timestamp: Date.now(),
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      precipitation: data.current.precipitation,
      windSpeed: data.current.wind_speed_10m,
      isRaining: data.current.precipitation > 0,
      weatherCode: data.current.weather_code
    });

  } catch (err) {
    console.error('Weather API Error:', err);
    // Graceful fallback
    return c.json({
      cityId,
      timestamp: Date.now(),
      temperature: cityId === 'karachi' ? 38 : 34,
      feelsLike: cityId === 'karachi' ? 42 : 36,
      precipitation: 0,
      windSpeed: 12,
      isRaining: false,
      weatherCode: 0,
      note: 'simulated fallback'
    });
  }
});

export default app;
