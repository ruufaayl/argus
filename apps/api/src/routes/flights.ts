import { Hono } from 'hono';

type Bindings = {
  OPENSKY_USERNAME?: string;
  OPENSKY_PASSWORD?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Full Pakistan ADS-B bounding box with 200km border buffer
const ADSB_LIVE_URL = 'https://api.airplanes.live/v2/point/30.37/69.34/900';

app.get('/', async (c) => {
  try {
    const res = await fetch(ADSB_LIVE_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Argus/1.0 Strategic Intelligence',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`ADS-B Live API error: ${res.status}`);
    }

    const data = await res.json();

    // Set CORS headers
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET');
    c.header('Cache-Control', 'no-cache, no-store');

    return c.json(data);
  } catch (error) {
    console.error('Flight proxy error:', error);

    // Fallback to OpenSky
    try {
      const { OPENSKY_USERNAME, OPENSKY_PASSWORD } = c.env;
      const openSkyUrl = 'https://opensky-network.org/api/states/all?lamin=22.0&lomin=59.0&lamax=38.5&lomax=78.5';
      const headers: Record<string, string> = { 'User-Agent': 'Argus/1.0' };
      if (OPENSKY_USERNAME && OPENSKY_PASSWORD) {
        headers['Authorization'] = `Basic ${btoa(`${OPENSKY_USERNAME}:${OPENSKY_PASSWORD}`)}`;
      }
      const osRes = await fetch(openSkyUrl, { headers, signal: AbortSignal.timeout(6000) });
      if (!osRes.ok) throw new Error(`OpenSky: ${osRes.status}`);
      const osData: any = await osRes.json();

      // Convert OpenSky format to ADS-B Live format
      const ac = (osData.states || []).map((s: any[]) => ({
        hex: s[0] || '',
        flight: s[1]?.trim() || '',
        alt_baro: typeof s[7] === 'number' ? Math.round(s[7] * 3.28084) : 'ground',
        lat: s[6],
        lon: s[5],
        track: s[10],
        speed: s[9] ? Math.round(s[9] * 1.94384) : 0,
        squawk: s[14] || '',
        military: false,
      }));

      c.header('Access-Control-Allow-Origin', '*');
      return c.json({ ac });
    } catch (fallbackError) {
      console.error('Both flight sources failed:', fallbackError);
      return c.json({ ac: [], error: 'All flight data sources unavailable' }, 503);
    }
  }
});

// CORS pre-flight
app.options('/', (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  return c.text('', 204);
});

export default app;
