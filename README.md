<p align="center">
  <img src="docs/images/argus-banner.png" alt="ARGUS" width="600" />
</p>

<h1 align="center">ARGUS</h1>
<h3 align="center">Automated Reconnaissance & Geospatial Unified System</h3>
<p align="center"><strong>Pakistan's Real-Time Military Intelligence & Situational Awareness Platform</strong></p>

<p align="center">
  <a href="https://github.com/ruufaayl/argus"><img src="https://img.shields.io/github/stars/ruufaayl/argus?style=for-the-badge&color=0a0e14&labelColor=1a1f2e" alt="Stars" /></a>
  <a href="https://github.com/ruufaayl/argus"><img src="https://img.shields.io/github/last-commit/ruufaayl/argus?style=for-the-badge&color=00C8FF&labelColor=1a1f2e" alt="Last Commit" /></a>
  <a href="https://github.com/ruufaayl/argus"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://github.com/ruufaayl/argus/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-AGPL%20v3-blue?style=for-the-badge&labelColor=1a1f2e" alt="License" /></a>
</p>

---

## Overview

ARGUS is a classified-grade intelligence dashboard built for Pakistan's national security apparatus. It aggregates 50+ live data sources into a unified command interface — from ADS-B flight tracking and AIS maritime surveillance to AI-synthesized threat analysis and cross-domain signal correlation.

Every panel, every feed, every data point is tuned for Pakistan's strategic environment: LOC tensions, western border operations, CPEC corridor security, maritime domain awareness in the Arabian Sea, and the broader South Asian theater.

---

## Capabilities

| Domain | What ARGUS Tracks |
|--------|-------------------|
| **Air Surveillance** | 400+ live aircraft via ADS-B Exchange, military flight detection, NOTAM alerts |
| **Maritime Domain** | AIS vessel tracking (Arabian Sea, Gwadar, Karachi), naval patrol monitoring |
| **Satellite Intel** | 10,000+ orbital objects via TLE/SGP4, overpass detection for Pakistan airspace |
| **News Intelligence** | 435+ curated feeds — Dawn, Geo, ARY, ISPR, Express Tribune, Reuters, AP |
| **Threat Correlation** | Multi-domain signal convergence (military + economic + disaster + escalation) |
| **Country Risk Index** | 12-factor composite scoring: conflict, economic stress, displacement, health |
| **Financial Radar** | PSX/KSE-100, global commodities, crypto, 92 exchanges, PKR FX tracking |
| **Climate & CBRN** | Earthquake monitoring, NASA FIRMS fire detection, radiation watch |
| **Cyber & Infrastructure** | Internet outages (Cloudflare Radar), submarine cable health, DDoS tracking |
| **AI Analysis** | Groq/OpenRouter LLM synthesis — threat classification, behavioral patterns |

---

## Quick Start

```bash
git clone https://github.com/ruufaayl/argus.git
cd argus
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173). No API keys required for basic operation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla TypeScript, Vite |
| **3D Globe** | globe.gl + Three.js |
| **2D Map** | deck.gl + MapLibre GL |
| **AI/ML** | Groq, OpenRouter, Ollama (local) |
| **API Layer** | Vercel Edge Functions (60+), Protocol Buffers |
| **Real-time** | Railway relay (AIS WebSocket, OpenSky, RSS proxy) |
| **Cache** | Upstash Redis (3-tier: Memory → IndexedDB → Redis) |
| **Desktop** | Tauri 2 (Rust) — macOS, Windows, Linux |

---

## Architecture

```
ARGUS
├── src/                    # Frontend (TypeScript, 118 components)
│   ├── app/                # Bootstrap, context, data loaders
│   ├── components/         # 100+ UI panels (intel, market, military, etc.)
│   ├── config/             # Feeds, variants, geo data, layer definitions
│   ├── services/           # 125+ service modules (correlation, CII, AI)
│   └── workers/            # Web Workers (analysis, ML, vector DB)
├── api/                    # Vercel Edge Functions (60+ endpoints)
├── server/                 # Business logic (22 RPC services)
├── proto/                  # Protocol Buffer definitions (92 .proto files)
├── scripts/                # Seed scripts, relay server, utilities
└── shared/                 # Cross-platform utilities
```

---

## Data Sources

ARGUS aggregates 50+ external data providers:

- **Conflict**: ACLED, UCDP, HAPI/HDX
- **Aviation**: ADS-B Exchange, OpenSky, AviationStack, Wingbits
- **Maritime**: AISStream (live AIS), corridor risk scoring
- **Markets**: Finnhub, Yahoo Finance, CoinGecko, Alpha Vantage
- **Economic**: FRED, BLS, BIS, ECB, EIA, Eurostat
- **Climate**: NASA FIRMS, Open-Meteo, USGS earthquakes
- **Intelligence**: GDELT, Telegram OSINT, Polymarket predictions
- **Infrastructure**: Cloudflare Radar, TeleGeography submarine cables
- **Health**: WHO disease surveillance, UNHCR displacement

---

## Environment Variables

All keys are optional — features degrade gracefully without them.

Copy `.env.example` to `.env.local` and fill in what you have:

```bash
cp .env.example .env.local
```

**Priority keys:**

| Key | Source | Purpose |
|-----|--------|---------|
| `GROQ_API_KEY` | [Groq](https://console.groq.com/) | AI threat synthesis |
| `UPSTASH_REDIS_REST_URL` | [Upstash](https://upstash.com/) | Cross-user cache |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | Cache auth |
| `FINNHUB_API_KEY` | [Finnhub](https://finnhub.io/) | Stock market data |
| `ACLED_EMAIL` | [ACLED](https://acleddata.com/) | Conflict events |
| `AISSTREAM_API_KEY` | [AISStream](https://aisstream.io/) | Maritime tracking |

See `.env.example` for the complete list of 40+ optional keys.

---

## Deployment

**Vercel (recommended):**
```bash
npm run build
# Deploy via Vercel CLI or GitHub integration
```

**Docker:**
```bash
docker-compose up -d
```

**Self-hosted:** See [SELF_HOSTING.md](./SELF_HOSTING.md)

---

## License

AGPL-3.0 for non-commercial use. See [LICENSE](LICENSE) for full terms.

---

<p align="center">
  Built for Pakistan's defense by <a href="https://github.com/ruufaayl">@ruufaayl</a>
</p>
