#!/usr/bin/env node
// ============================================================
// gcp-relay.cjs — Lightweight AIS WebSocket relay for GCP e2-micro
// Connects to AISStream.io, caches vessel positions, writes to
// Upstash Redis every 30s so Vercel/CF Workers can serve them.
//
// Usage:  AISSTREAM_KEY=xxx UPSTASH_REDIS_REST_URL=xxx UPSTASH_REDIS_REST_TOKEN=xxx node gcp-relay.cjs
// PM2:   pm2 start gcp-relay.cjs --name argus-relay
// ============================================================

const WebSocket = require('ws');

// ── ENV ──
const AISSTREAM_KEY       = process.env.AISSTREAM_KEY       || '';
const UPSTASH_REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL  || '';
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

const REDIS_KEY  = 'argus:vessels:v1';
const REDIS_TTL  = 120;          // seconds — generous so data survives brief relay restarts
const FLUSH_MS   = 30_000;       // write to Redis every 30s
const PRUNE_MS   = 300_000;      // prune stale vessels every 5 min
const STALE_MS   = 600_000;      // vessel considered stale after 10 min
const RETRY_MS   = 30_000;       // reconnect delay on disconnect

// ── In-memory vessel cache ──
const vessels = new Map();
let wsConnected = false;
let reconnectTimer = null;
let msgCount = 0;

// ── Redis helpers ──
async function redisSet(key, value, ttl) {
  if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN) return;
  try {
    const res = await fetch(`${UPSTASH_REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['SET', key, JSON.stringify(value), 'EX', ttl],
      ]),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[REDIS] SET failed: ${res.status} — ${text}`);
    }
  } catch (err) {
    console.warn(`[REDIS] SET error: ${err.message}`);
  }
}

// ── Flush vessel cache to Redis ──
async function flushToRedis() {
  const cutoff = Date.now() - STALE_MS;
  const live = [];

  for (const [, v] of vessels) {
    if (v._lastUpdate >= cutoff && v.lat !== 0 && v.lng !== 0) {
      live.push({
        mmsi:        v.mmsi,
        name:        v.name || '',
        type:        v.type || 0,
        lat:         v.lat,
        lng:         v.lng,
        speed:       v.speed || 0,
        heading:     v.heading ?? 511,
        course:      v.course || 0,
        destination: v.destination || '',
        timestamp:   new Date(v._lastUpdate).toISOString(),
      });
    }
  }

  const payload = {
    vessels: live,
    count:   live.length,
    source:  'aisstream-live',
    timestamp: Date.now(),
  };

  await redisSet(REDIS_KEY, payload, REDIS_TTL);
  console.log(`[FLUSH] ${live.length} vessels → Redis (cache: ${vessels.size} total)`);
}

// ── Prune stale entries from memory ──
function prune() {
  const cutoff = Date.now() - STALE_MS;
  let pruned = 0;
  for (const [mmsi, v] of vessels) {
    if (v._lastUpdate < cutoff) {
      vessels.delete(mmsi);
      pruned++;
    }
  }
  if (pruned > 0) console.log(`[PRUNE] Removed ${pruned} stale vessels. Active: ${vessels.size}`);
}

// ── AISStream WebSocket ──
function connect() {
  if (!AISSTREAM_KEY) {
    console.error('[FATAL] AISSTREAM_KEY not set. Exiting.');
    process.exit(1);
  }
  if (wsConnected) return;

  console.log('[AIS] Connecting to AISStream.io...');
  const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

  ws.on('open', () => {
    wsConnected = true;
    console.log('[AIS] WebSocket CONNECTED');

    // AISStream format: [[latMin, lonMin], [latMax, lonMax]]
    const sub = {
      APIKey: AISSTREAM_KEY,
      BoundingBoxes: [
        [[-90, -180], [90, 180]],   // GLOBAL — will narrow after confirming data flows
      ],
      FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
    };
    console.log('[AIS] Sending subscription:', JSON.stringify(sub));
    ws.send(JSON.stringify(sub));
  });

  ws.on('message', (raw) => {
    msgCount++;
    if (msgCount <= 3 || msgCount % 100 === 0) {
      console.log(`[AIS] Message #${msgCount} received (cache: ${vessels.size} vessels)`);
    }
    try {
      const msg = JSON.parse(raw.toString());
      const meta = msg.MetaData;
      if (!meta?.MMSI) return;

      const mmsi = meta.MMSI;
      const existing = vessels.get(mmsi) || {
        mmsi, name: '', type: 0, lat: 0, lng: 0,
        speed: 0, heading: 511, course: 0, destination: '', _lastUpdate: 0,
      };

      if (msg.MessageType === 'PositionReport') {
        const pos = msg.Message?.PositionReport;
        if (pos) {
          existing.lat     = pos.Latitude  ?? existing.lat;
          existing.lng     = pos.Longitude ?? existing.lng;
          existing.speed   = pos.Sog       ?? existing.speed;
          existing.heading = pos.TrueHeading ?? existing.heading;
          existing.course  = pos.Cog       ?? existing.course;
          existing.name    = meta.ShipName?.trim() || existing.name;
          existing._lastUpdate = Date.now();
          vessels.set(mmsi, existing);
        }
      }

      if (msg.MessageType === 'ShipStaticData') {
        const stat = msg.Message?.ShipStaticData;
        if (stat) {
          existing.name        = stat.Name?.trim() || meta.ShipName?.trim() || existing.name;
          existing.type        = stat.Type ?? existing.type;
          existing.destination = stat.Destination?.trim() || existing.destination;
          existing._lastUpdate = Date.now();
          vessels.set(mmsi, existing);
        }
      }
    } catch { /* ignore parse errors */ }
  });

  ws.on('close', (code) => {
    wsConnected = false;
    console.log(`[AIS] Disconnected (code ${code}). Reconnecting in ${RETRY_MS / 1000}s...`);
    scheduleReconnect();
  });

  ws.on('error', (err) => {
    console.warn(`[AIS] WebSocket error: ${err.message}`);
    wsConnected = false;
  });
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RETRY_MS);
}

// ── Boot ──
console.log('═══════════════════════════════════════════');
console.log('  ARGUS GCP Relay — AIS WebSocket → Redis');
console.log('═══════════════════════════════════════════');
console.log(`  Redis:      ${UPSTASH_REDIS_URL ? UPSTASH_REDIS_URL.replace(/https?:\/\//, '').split('.')[0] + '...' : 'NOT SET'}`);
console.log(`  AISStream:  ${AISSTREAM_KEY ? 'configured' : 'MISSING'}`);
console.log(`  Flush:      every ${FLUSH_MS / 1000}s`);
console.log(`  Prune:      every ${PRUNE_MS / 1000}s`);
console.log('═══════════════════════════════════════════');

// Start WebSocket
connect();

// Periodic flush to Redis
setInterval(flushToRedis, FLUSH_MS);

// Periodic memory prune
setInterval(prune, PRUNE_MS);

// Initial flush after 10s (give WebSocket time to receive first batch)
setTimeout(flushToRedis, 10_000);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[SHUTDOWN] Flushing final state to Redis...');
  await flushToRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[SHUTDOWN] Flushing final state to Redis...');
  await flushToRedis();
  process.exit(0);
});

// Keep alive
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught:', err.message);
  // Don't crash — PM2 will restart, but try to stay alive
});

process.on('unhandledRejection', (err) => {
  console.error('[WARN] Unhandled rejection:', err);
});
