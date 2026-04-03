# ARGUS

**Real-time global intelligence dashboard** — AI-powered news aggregation, geopolitical monitoring, and infrastructure tracking in a unified situational awareness interface.

[![GitHub stars](https://img.shields.io/github/stars/ruufaayl/argus?style=social)](https://github.com/ruufaayl/argus/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/ruufaayl/argus?style=social)](https://github.com/ruufaayl/argus/network/members)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=flat&logo=discord&logoColor=white)](https://discord.gg/re63kWKxaz)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Last commit](https://img.shields.io/github/last-commit/ruufaayl/argus)](https://github.com/ruufaayl/argus/commits/main)
[![Latest release](https://img.shields.io/github/v/release/ruufaayl/argus?style=flat)](https://github.com/ruufaayl/argus/releases/latest)

<p align="center">
  <a href="https://argus.app"><img src="https://img.shields.io/badge/Web_App-argus.app-blue?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Web App"></a>&nbsp;
  <a href="https://tech.argus.app"><img src="https://img.shields.io/badge/Tech_Variant-tech.argus.app-0891b2?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Tech Variant"></a>&nbsp;
  <a href="https://finance.argus.app"><img src="https://img.shields.io/badge/Finance_Variant-finance.argus.app-059669?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Finance Variant"></a>&nbsp;
  <a href="https://commodity.argus.app"><img src="https://img.shields.io/badge/Commodity_Variant-commodity.argus.app-b45309?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Commodity Variant"></a>&nbsp;
  <a href="https://happy.argus.app"><img src="https://img.shields.io/badge/Happy_Variant-happy.argus.app-f59e0b?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Happy Variant"></a>
</p>

<p align="center">
  <a href="https://argus.app/api/download?platform=windows-exe"><img src="https://img.shields.io/badge/Download-Windows_(.exe)-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Download Windows"></a>&nbsp;
  <a href="https://argus.app/api/download?platform=macos-arm64"><img src="https://img.shields.io/badge/Download-macOS_Apple_Silicon-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Download macOS ARM"></a>&nbsp;
  <a href="https://argus.app/api/download?platform=macos-x64"><img src="https://img.shields.io/badge/Download-macOS_Intel-555555?style=for-the-badge&logo=apple&logoColor=white" alt="Download macOS Intel"></a>&nbsp;
  <a href="https://argus.app/api/download?platform=linux-appimage"><img src="https://img.shields.io/badge/Download-Linux_(.AppImage)-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Download Linux"></a>
</p>

<p align="center">
  <a href="https://docs.argus.app"><strong>Documentation</strong></a> &nbsp;·&nbsp;
  <a href="https://github.com/ruufaayl/argus/releases/latest"><strong>Releases</strong></a> &nbsp;·&nbsp;
  <a href="https://docs.argus.app/contributing"><strong>Contributing</strong></a>
</p>

![ARGUS Dashboard](docs/images/argus-7-mar-2026.jpg)

---

## What It Does

- **435+ curated news feeds** across 15 categories, AI-synthesized into briefs
- **Dual map engine** — 3D globe (globe.gl) and WebGL flat map (deck.gl) with 45 data layers
- **Cross-stream correlation** — military, economic, disaster, and escalation signal convergence
- **Country Intelligence Index** — composite risk scoring across 12 signal categories
- **Finance radar** — 92 stock exchanges, commodities, crypto, and 7-signal market composite
- **Local AI** — run everything with Ollama, no API keys required
- **5 site variants** from a single codebase (world, tech, finance, commodity, happy)
- **Native desktop app** (Tauri 2) for macOS, Windows, and Linux
- **21 languages** with native-language feeds and RTL support

For the full feature list, architecture, data sources, and algorithms, see the **[documentation](https://docs.argus.app)**.

---

## Quick Start

```bash
git clone https://github.com/ruufaayl/argus.git
cd argus
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173). No environment variables required for basic operation.

For variant-specific development:

```bash
npm run dev:tech       # tech.argus.app
npm run dev:finance    # finance.argus.app
npm run dev:commodity  # commodity.argus.app
npm run dev:happy      # happy.argus.app
```

See the **[self-hosting guide](https://docs.argus.app/getting-started)** for deployment options (Vercel, Docker, static).

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | Vanilla TypeScript, Vite, globe.gl + Three.js, deck.gl + MapLibre GL |
| **Desktop** | Tauri 2 (Rust) with Node.js sidecar |
| **AI/ML** | Ollama / Groq / OpenRouter, Transformers.js (browser-side) |
| **API Contracts** | Protocol Buffers (92 protos, 22 services), sebuf HTTP annotations |
| **Deployment** | Vercel Edge Functions (60+), Railway relay, Tauri, PWA |
| **Caching** | Redis (Upstash), 3-tier cache, CDN, service worker |

Full stack details in the **[architecture docs](https://docs.argus.app/architecture)**.

---

## Flight Data

Flight data provided gracefully by [Wingbits](https://wingbits.com?utm_source=argus&utm_medium=referral&utm_campaign=argus), the most advanced ADS-B flight data solution.

---

## Data Sources

Argus aggregates 30+ external data sources across geopolitics, finance, energy, climate, aviation, and cyber. See the full [data sources catalog](https://docs.argus.app/data-sources) for providers, feed tiers, and collection methods.

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

```bash
npm run typecheck        # Type checking
npm run build:full       # Production build
```

---

## License

**AGPL-3.0** for non-commercial use. **Commercial license** required for any commercial use.

| Use Case | Allowed? |
|----------|----------|
| Personal / research / educational | Yes |
| Self-hosted (non-commercial) | Yes, with attribution |
| Fork and modify (non-commercial) | Yes, share source under AGPL-3.0 |
| Commercial use / SaaS / rebranding | Requires commercial license |

See [LICENSE](LICENSE) for full terms. For commercial licensing, contact the maintainer.

Copyright (C) 2024-2026 ruufaayl. All rights reserved.

---

## Author

**ruufaayl** — [GitHub](https://github.com/ruufaayl)

## Contributors

<a href="https://github.com/ruufaayl/argus/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ruufaayl/argus" />
</a>

## Security Acknowledgments

We thank the following researchers for responsibly disclosing security issues:

- **Cody Richard** — Disclosed three security findings covering IPC command exposure, renderer-to-sidecar trust boundary analysis, and fetch patch credential injection architecture (2026)

See our [Security Policy](./SECURITY.md) for responsible disclosure guidelines.

---

<p align="center">
  <a href="https://argus.app">argus.app</a> &nbsp;·&nbsp;
  <a href="https://docs.argus.app">docs.argus.app</a> &nbsp;·&nbsp;
  <a href="https://finance.argus.app">finance.argus.app</a> &nbsp;·&nbsp;
  <a href="https://commodity.argus.app">commodity.argus.app</a>
</p>

## Star History

<a href="https://api.star-history.com/svg?repos=ruufaayl/argus&type=Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ruufaayl/argus&type=Date&type=Date&theme=dark" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ruufaayl/argus&type=Date&type=Date" />
 </picture>
</a>
