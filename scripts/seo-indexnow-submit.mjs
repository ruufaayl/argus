#!/usr/bin/env node
/**
 * Submit all argus-intel.vercel.app URLs to IndexNow after deploy.
 * Run once after deploying the IndexNow key file:
 *   node scripts/seo-indexnow-submit.mjs
 *
 * IndexNow requires all URLs in one request to share the same host.
 * Submits separate batches per subdomain.
 */

const KEY = 'a7f3e9d1b2c44e8f9a0b1c2d3e4f5a6b';

const BATCHES = [
  {
    host: 'www.argus-intel.vercel.app',
    urls: [
      'https://www.argus-intel.vercel.app/',
      'https://www.argus-intel.vercel.app/pro',
      'https://www.argus-intel.vercel.app/blog/',
      'https://www.argus-intel.vercel.app/blog/posts/what-is-argus-real-time-global-intelligence/',
      'https://www.argus-intel.vercel.app/blog/posts/five-dashboards-one-platform-argus-variants/',
      'https://www.argus-intel.vercel.app/blog/posts/track-global-conflicts-in-real-time/',
      'https://www.argus-intel.vercel.app/blog/posts/cyber-threat-intelligence-for-security-teams/',
      'https://www.argus-intel.vercel.app/blog/posts/osint-for-everyone-open-source-intelligence-democratized/',
      'https://www.argus-intel.vercel.app/blog/posts/natural-disaster-monitoring-earthquakes-fires-volcanoes/',
      'https://www.argus-intel.vercel.app/blog/posts/real-time-market-intelligence-for-traders-and-analysts/',
      'https://www.argus-intel.vercel.app/blog/posts/monitor-global-supply-chains-and-commodity-disruptions/',
      'https://www.argus-intel.vercel.app/blog/posts/satellite-imagery-orbital-surveillance/',
      'https://www.argus-intel.vercel.app/blog/posts/live-webcams-from-geopolitical-hotspots/',
      'https://www.argus-intel.vercel.app/blog/posts/prediction-markets-ai-forecasting-geopolitics/',
      'https://www.argus-intel.vercel.app/blog/posts/command-palette-search-everything-instantly/',
      'https://www.argus-intel.vercel.app/blog/posts/argus-in-21-languages-global-intelligence-for-everyone/',
      'https://www.argus-intel.vercel.app/blog/posts/ai-powered-intelligence-without-the-cloud/',
      'https://www.argus-intel.vercel.app/blog/posts/build-on-argus-developer-api-open-source/',
      'https://www.argus-intel.vercel.app/blog/posts/argus-vs-traditional-intelligence-tools/',
      'https://www.argus-intel.vercel.app/blog/posts/tracking-global-trade-routes-chokepoints-freight-costs/',
    ],
  },
  { host: 'tech.argus-intel.vercel.app', urls: ['https://tech.argus-intel.vercel.app/'] },
  { host: 'finance.argus-intel.vercel.app', urls: ['https://finance.argus-intel.vercel.app/'] },
  { host: 'happy.argus-intel.vercel.app', urls: ['https://happy.argus-intel.vercel.app/'] },
];

const ENDPOINTS = [
  'https://api.indexnow.org/IndexNow',
  'https://www.bing.com/IndexNow',
  'https://searchadvisor.naver.com/indexnow',
  'https://search.seznam.cz/indexnow',
  'https://yandex.com/indexnow',
];

async function submit(endpoint, host, urlList) {
  const keyLocation = `https://${host}/${KEY}.txt`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: KEY, keyLocation, urlList }),
  });
  return { endpoint, host, status: res.status, ok: res.ok };
}

for (const { host, urls } of BATCHES) {
  console.log(`\n[${host}] (${urls.length} URLs)`);
  const results = await Promise.allSettled(ENDPOINTS.map(ep => submit(ep, host, urls)));
  for (const r of results) {
    if (r.status === 'fulfilled') {
      console.log(`  ${r.value.ok ? '✓' : '✗'} ${r.value.endpoint.replace('https://', '')} → ${r.value.status}`);
    } else {
      console.log(`  ✗ error: ${r.reason}`);
    }
  }
}
