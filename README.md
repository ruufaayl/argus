<h1 align="center">VERITAS</h1>
<h3 align="center">Verified Emissions · Real Intelligence · Transparent Assets System</h3>
<p align="center"><strong>The Carbon Credit Anti-Greenwash Oracle</strong></p>

<p align="center">
  <a href="https://pakontir.vercel.app/"><img src="https://img.shields.io/badge/live-pakontir.vercel.app-c8860a?style=for-the-badge&labelColor=060a07" alt="Live" /></a>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vercel-Edge-000000?style=for-the-badge&logo=vercel" alt="Vercel" />
  <img src="https://img.shields.io/badge/Stack-Free%20Tier-c8860a?style=for-the-badge&labelColor=060a07" alt="Free Tier" />
</p>

---

## What is VERITAS?

The voluntary carbon market is plagued by unverifiable credits. After the 2023 investigation that found over **90%** of the world's leading carbon registry's flagship REDD+ credits to be effectively worthless, institutional buyers have been left without a trusted mechanism to verify what they are purchasing.

**VERITAS is the Bloomberg Terminal of carbon credit quality** — a real-time AI oracle that returns a transparent, AI-justified risk score for any carbon credit within seconds, powered by satellite imagery, IoT sensor feeds, registry cross-checks, and multi-model AI inference.

> *"The voluntary carbon market will survive its credibility crisis only through radical transparency at the asset level. VERITAS is the oracle that makes this possible."*

---

## The Product

| Layer | What it does |
|-------|--------------|
| **Landing** (`/`) | Premium marketing site — problem statement, platform overview, founders, market gap analysis. |
| **Dashboard** (`/dashboard`) | The oracle itself — 12 environmental intelligence panels rendered against a real-time 3D earth-system globe. |

### The 12 Dashboard Panels

1. **Earth System Map** — `globe.gl` 3D + `deck.gl` 2D, layered with environmental signals
2. **Carbon Intelligence Brief** — Daily AI-synthesised climate intelligence digest
3. **AI Climate Forecasts** — Forward-looking risk projections per region
4. **Climate Anomalies** — Live anomaly detection across regions
5. **Fire & Deforestation Monitor** — NASA FIRMS satellite hotspots
6. **Thermal Anomalies** — Sea-surface and land-surface temperature deviations
7. **Climate Risk Exposure** — Population-weighted exposure scoring
8. **Disaster Cascade** — Multi-hazard correlation analysis
9. **Climate Health Risks** — Outbreak surveillance correlated with climate signals
10. **Energy & Renewables** — Energy mix + renewable installation registry
11. **Air Quality Monitor** — Global PM2.5 / NO₂ via OpenAQ
12. **Carbon Credit Markets** — Spot pricing + project provenance

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| **Frontend** | TypeScript + Vite SPA (vanilla / Preact) |
| **3D Globe** | `globe.gl` (Three.js) |
| **2D Maps** | `deck.gl` + MapLibre GL |
| **Edge Compute** | Vercel Serverless / Edge Functions |
| **Cache** | 3-tier (Memory → IndexedDB → Upstash Redis) |
| **AI — Deep Audit** | Claude Opus (chain-of-thought verification) |
| **AI — Real-time** | Claude Haiku / Sonnet + Groq Llama-3.3-70b (sub-200ms) |
| **Satellite & Earth Data** | NASA FIRMS · NOAA ERDDAP · Global Forest Watch · ESA Sentinel-2 |
| **Climate APIs** | NOAA Mauna Loa CO₂ · OpenAQ · Xpansiv CBL |
| **Hosting Cost** | $0 — free-tier Vercel + free-tier Upstash |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Browser (TypeScript SPA, served by Vercel CDN)                │
│  ┌──────────────────┐    ┌────────────────────────────────┐   │
│  │  Landing  (/)    │    │  Dashboard (/dashboard)         │   │
│  │  landing.html    │    │  globe.gl + deck.gl + panels    │   │
│  └──────────────────┘    └────────────┬───────────────────┘   │
└──────────────────────────────────────┬─┴──────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                │  Vercel Edge Functions  (api/*)             │
                │  (NASA FIRMS, OpenAQ, NOAA, Forest Watch)   │
                └──────────────────────┬──────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                │   Upstash Redis (3-tier cache, free plan)   │
                └─────────────────────────────────────────────┘
```

Total deployable footprint: **~12 serverless functions**, well within Vercel's free-tier limit.

---

## The Founders

**The Green Ledger · Climate-Tech Startup Project · FAST-NUCES Islamabad · BSFT-4D Fintech Programme · April 2026**

| | Name | Role | Mandate |
|---|---|---|---|
| **CEO** | Taha Ali        | Chief Executive Officer  | *The Visionary* — Regulatory strategy, investor narrative, CSRD/ISSB alignment |
| **CTO** | Rufayl Waseem   | Chief Technology Officer | *The Architect* — Full-stack build, globe engine, API layer, deployment |
| **CSO** | Harris Safi     | Chief Science Officer    | *The Quant* — GHG Protocol methodology, carbon accounting engine |
| **COO** | Waleed          | Chief Operating Officer  | *The Navigator* — Phase timeline, deadline coordination, QA |

---

## Run Locally

```bash
pnpm install        # or npm install
pnpm dev            # vite dev server on :5173
# →  http://localhost:5173/             landing
# →  http://localhost:5173/dashboard    oracle
```

Required environment variables (see `.env.example`):

| Variable | Used by |
|----------|---------|
| `GROQ_API_KEY` | AI synthesis (real-time briefs) |
| `ANTHROPIC_API_KEY` | Claude Opus / Sonnet / Haiku audit chain |
| `OPENAQ_API_KEY` | Air quality data |
| `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN` | Cache layer |
| `NASA_FIRMS_KEY` | Fire hotspot satellite feed |

---

## Roadmap

- **Phase 00 — Group Formation** ✅ Complete (April 2, 2026)
- **Phase 01 — Market Identification & Comparative Analysis** ✅ Complete (April 9, 2026)
- **Phase 02 — Methodology & Alpha MVP** 🚧 In progress
  - GHG formula engine (live)
  - First clickable low-fidelity prototype (live URL: [pakontir.vercel.app](https://pakontir.vercel.app/))
- **Phase 03 — VERITAS RISK SCORE™ engine** ⏳ Next

---

## License

AGPL-3.0 — see [LICENSE](LICENSE).
