# VERITAS — Required API Keys & Where Each One Powers the Dashboard

Set every key below in **Vercel Dashboard → Project (veritasoracle) → Settings → Environment Variables**, mark them for **Production + Preview + Development**, then trigger a redeploy.

> AI calls (Groq + OpenRouter) are capped at **2 syntheses per span per day** via a 12-hour in-memory + edge cache. Worst-case fan-out across 7 GDELT spans × 3 Vercel regions = ≤42 API calls/day.

---

## ⚠️ MUST-HAVE — without these the panel shows an explicit error state

| Variable                    | Powers                                                                                          | Free tier                | Where to get it                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------- |
| `GROQ_API_KEY`              | AI Insights (carbon brief), Country Intelligence Brief, Chat Analyst, Forecast synthesis        | **14,400 req/day**       | https://console.groq.com/keys                              |
| `OPENROUTER_API_KEY`        | Fallback when Groq is rate-limited / 5xx; also the default for forecast enrichment              | **50 req/day** (cheap)   | https://openrouter.ai/keys                                 |

The brief endpoint (`/api/veritas/brief`) tries **Groq → OpenRouter** in order and reports which one served the response in the `model` field of the JSON.

---

## 🛰️ HIGH-VALUE — needed for layers most analysts will turn on first

| Variable                       | Powers                                                            | Free tier             | Where to get it                                            |
| ------------------------------ | ----------------------------------------------------------------- | --------------------- | ---------------------------------------------------------- |
| `OPENWEATHER_API_KEY`          | Weather Alerts layer, Weather panel                                | 1,000 calls/day        | https://openweathermap.org/api                             |
| `OPENAQ_API_KEY`               | Air Quality (PM2.5 / NO₂) overlay, used by Country Climate brief   | 10,000 calls/day       | https://openaq.org/develop/                                |
| `NASA_API_KEY`                 | NASA FIRMS active-fire pixels (Fires layer), EOSDIS imagery        | 1,000 req/hour          | https://api.nasa.gov/                                      |
| `SENTINELHUB_CLIENT_ID`        | Sentinel-2 NDVI deltas for project-polygon analysis (Oracle)       | 30k processing units/mo | https://www.sentinel-hub.com/                              |
| `SENTINELHUB_CLIENT_SECRET`    | Pair with `SENTINELHUB_CLIENT_ID`                                  | —                     | same dashboard                                             |
| `MAPTILER_API_KEY`             | Satellite basemap fallback when Esri tiles rate-limit              | 100k tiles/mo          | https://www.maptiler.com/cloud/                            |

---

## 💾 INFRASTRUCTURE — speeds the dashboard but optional

| Variable                  | Powers                                                                | Free tier                 | Where to get it                                |
| ------------------------- | --------------------------------------------------------------------- | ------------------------- | ---------------------------------------------- |
| `UPSTASH_REDIS_URL`       | Cross-user cache for risk scores + AI deduplication                   | 10k cmd/day, 256 MB        | https://upstash.com/redis                      |
| `UPSTASH_REDIS_TOKEN`     | Pair with `UPSTASH_REDIS_URL`                                          | —                         | same dashboard                                 |
| `NEON_DATABASE_URL`       | Persistent Oracle audit trail + waitlist signups                       | 0.5 GB free               | https://neon.tech                              |
| `R2_ACCESS_KEY_ID`        | Cloudflare R2 tile cache (cheaper than re-fetching from MapTiler)      | 10 GB free egress         | https://dash.cloudflare.com/r2                 |
| `R2_SECRET_ACCESS_KEY`    | Pair with `R2_ACCESS_KEY_ID`                                           | —                         | same                                           |
| `R2_BUCKET_NAME`          | Bucket name (e.g. `veritas-tiles`)                                     | —                         | same                                           |

---

## 🌱 PROJECT-VERIFICATION DATA — for the Oracle on the landing page

| Variable                  | Powers                                                                | Free tier                  | Where to get it                                |
| ------------------------- | --------------------------------------------------------------------- | -------------------------- | ---------------------------------------------- |
| `VERRA_REGISTRY_TOKEN`    | Live VCS project lookup (when a serial is entered in the Oracle)       | not public — partner key   | partnership@verra.org                          |
| `GOLD_STANDARD_API_KEY`   | Gold Standard project lookup                                           | not public                 | https://www.goldstandard.org/contact-us        |
| `OPENAI_EMBEDDINGS_KEY`   | (Optional) Embedding-based similarity matching against historical fraud cases | $5 credit on signup | https://platform.openai.com/                   |

> Until the registry tokens land, the Oracle widget runs in **DEMO mode** with three preset serials returning pre-staged AI output (Indus Delta REDD+, Kariba REDD+, Cordillera Azul). See `public/landing.html` `data-veritas-demo-serials` for the catalogue.

---

## 🔒 OPTIONAL — sign-in / payments

| Variable                          | Powers                                       | Free tier              |
| --------------------------------- | -------------------------------------------- | ---------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY`      | Sign-in button + UserButton (Clerk)           | 10k MAU                |
| `CLERK_SECRET_KEY`                | Server-side session validation                | —                      |
| `STRIPE_SECRET_KEY`               | Future paid-tier checkout (not yet wired)     | —                      |

---

## 🧪 LOCAL DEVELOPMENT

Copy `.env.local.example` → `.env.local` (the example file has working free-tier values for Groq + OpenRouter that you can reuse for testing). The dev server reads from `.env.local`; **Vercel ignores it** — production reads only from the dashboard env vars above.

---

## 🩺 HOW TO TELL WHICH KEYS ARE LIVE IN PRODUCTION

```bash
curl https://veritasoracle.vercel.app/api/health.js | jq
```

The response includes a `keys` object that reports which env vars are present in the running edge function. Missing keys for active panels appear in red on the dashboard with a "503 — synthesis unavailable" overlay and a Retry button.
