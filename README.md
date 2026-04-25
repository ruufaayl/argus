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

## Deploying to Vercel

The site is **fully API-driven** — no panel falls back to fabricated data. Set the env vars below in **Vercel → Project → Settings → Environment Variables**, redeploy, and every panel will populate from live sources. Missing vars surface as empty panels, never fake numbers.

### Required for the 12 VERITAS panels

| Env Var | Powers |
|---------|--------|
| `GROQ_API_KEY` | `Carbon Intelligence Brief`, `AI Climate Forecasts`, `VERITAS Risk Signals` |
| `ANTHROPIC_API_KEY` | Deep-audit chain (Claude Opus verification step) |
| `EIA_API_KEY` | `Energy & Renewables` panel (US EIA tape) |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | 3-tier cache layer (panels still work without it, but every request hits upstream APIs) |

### Strongly recommended

| Env Var | Powers |
|---------|--------|
| `OPENAQ_API_KEY` | `Air Quality Monitor` (panel works without a key but at lower quota) |
| `OPENWEATHER_API_KEY` | Weather overlay on the globe |
| `RESEND_API_KEY` + `CONTACT_NOTIFY_EMAIL` | Landing page contact / waitlist forms |
| `WORLDMONITOR_VALID_KEYS` | Comma-separated allowlist of API keys for premium endpoints (leave unset for browser-trusted-origin only) |

### Optional integrations

| Env Var | Powers |
|---------|--------|
| `EOSDIS_NASA_TOKEN` / `NASA_FIRMS_KEY` | NASA FIRMS fire & deforestation feed (panel works without — uses public proxy) |
| `CLERK_SECRET_KEY` + `CLERK_JWT_ISSUER_DOMAIN` | Pro account auth |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `DISCORD_REDIRECT_URI` | Discord notification channel |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` / `SLACK_REDIRECT_URI` | Slack notification channel |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile bot-protection on forms |
| `CONVEX_URL` / `CONVEX_SITE_URL` | Convex backend (waitlist, user prefs) |
| `WS_RELAY_URL` + `RELAY_SHARED_SECRET` | Live AIS/ADS-B WebSocket relay |
| `WINGBITS_API_KEY` / `AVIATIONSTACK_API` / `ICAO_API_KEY` | Aviation feeds (off in VERITAS variant by default) |
| `ABUSEIPDB_API_KEY` / `OTX_API_KEY` / `URLHAUS_AUTH_KEY` | Cyber-threat overlays (off in VERITAS variant) |
| `COINGECKO_API_KEY` / `WTO_API_KEY` / `TRAVELPAYOUTS_API_TOKEN` | Auxiliary data feeds |

### Variant selector

| Env Var | Effect |
|---------|--------|
| `VITE_VARIANT=full` (default) | VERITAS — 12 environmental panels |
| `VITE_VARIANT=tech` | Tech/AI/startup variant |
| `VITE_VARIANT=finance` | Markets/trading variant |
| `VITE_VARIANT=commodity` | Mining/metals/energy variant |
| `VITE_VARIANT=happy` | Good-news variant |

### Workflow

1. Open Vercel → `pakontir` project → **Settings** → **Environment Variables**.
2. Add the rows above (paste only the keys you have — missing ones leave their panels empty, not broken).
3. Trigger a redeploy (push to `main`, or **Deployments → … → Redeploy**).
4. Confirm panels populate at `https://pakontir.vercel.app/dashboard`.

> Nothing is hardcoded. Every figure on every panel originates from a live API response or a cache hit. If a panel is empty, its upstream feed is either missing an env var or rate-limited.

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
