// File: apps/api/src/index.ts
// ARGUS v5.0 — Cloudflare Worker API with all routes registered

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Routes
import aqiRoute from './routes/aqi';
import weatherRoute from './routes/weather';
import outagesRoute from './routes/outages';
import signalsRoute from './routes/signals';
import stressRoute from './routes/stress';
import flightsRoute from './routes/flights';
import intelRoute from './routes/intel';
import osmRoute from './routes/osm';
import searchRoute from './routes/search';
import tleRoute from './routes/tle';
import vesselsRoute from './routes/vessels';

type Bindings = {
  ENVIRONMENT: string;
  GROQ_API_KEY: string;
  OPENSKY_USERNAME: string;
  OPENSKY_PASSWORD: string;
  OPENAQ_API_KEY: string;
  HERE_API_KEY: string;
  TOMTOM_API_KEY: string;
  UPSTASH_REDIS_URL: string;
  UPSTASH_REDIS_TOKEN: string;
  CLASSIFIED_PASSWORD: string;
  JWT_SECRET: string;
  // v5.0 additions
  AISSTREAM_KEY: string;
  OPENWEATHER_API_KEY: string;
  SENTINELHUB_CLIENT_ID: string;
  SENTINELHUB_CLIENT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',  // ← ADD THIS
    'http://localhost:5177',  // ← AND THIS (in case Vite increments again)
    'https://sentinel.vercel.app',
    'https://*.vercel.app',
  ],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'operational',
    service: 'sentinel-api',
    version: '5.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (c) => {
  return c.json({
    name: 'ARGUS Intelligence API',
    version: '5.0',
    docs: '/api/health',
  });
});

// Data Fusion Routes
app.route('/api/aqi', aqiRoute);
app.route('/api/weather', weatherRoute);
app.route('/api/outages', outagesRoute);
app.route('/api/signals', signalsRoute);
app.route('/api/stress', stressRoute);
app.route('/api/flights', flightsRoute);
app.route('/api/intel', intelRoute);

// v5.0 Routes
app.route('/api/osm', osmRoute);
app.route('/api/search', searchRoute);
app.route('/api/tle', tleRoute);
app.route('/api/vessels', vesselsRoute);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found', path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    { error: 'Internal server error', message: err.message },
    500
  );
});

export default app;
