// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const POST_DATES = {
  'https://www.argus.app/blog/posts/ai-powered-intelligence-without-the-cloud/': '2026-03-07',
  'https://www.argus.app/blog/posts/build-on-argus-developer-api-open-source/': '2026-03-09',
  'https://www.argus.app/blog/posts/command-palette-search-everything-instantly/': '2026-03-06',
  'https://www.argus.app/blog/posts/cyber-threat-intelligence-for-security-teams/': '2026-02-24',
  'https://www.argus.app/blog/posts/five-dashboards-one-platform-argus-variants/': '2026-02-12',
  'https://www.argus.app/blog/posts/live-webcams-from-geopolitical-hotspots/': '2026-03-01',
  'https://www.argus.app/blog/posts/monitor-global-supply-chains-and-commodity-disruptions/': '2026-02-26',
  'https://www.argus.app/blog/posts/natural-disaster-monitoring-earthquakes-fires-volcanoes/': '2026-02-19',
  'https://www.argus.app/blog/posts/osint-for-everyone-open-source-intelligence-democratized/': '2026-02-17',
  'https://www.argus.app/blog/posts/prediction-markets-ai-forecasting-geopolitics/': '2026-03-03',
  'https://www.argus.app/blog/posts/real-time-market-intelligence-for-traders-and-analysts/': '2026-02-21',
  'https://www.argus.app/blog/posts/satellite-imagery-orbital-surveillance/': '2026-02-28',
  'https://www.argus.app/blog/posts/track-global-conflicts-in-real-time/': '2026-02-14',
  'https://www.argus.app/blog/posts/tracking-global-trade-routes-chokepoints-freight-costs/': '2026-03-15',
  'https://www.argus.app/blog/posts/what-is-argus-real-time-global-intelligence/': '2026-02-10',
  'https://www.argus.app/blog/posts/argus-in-21-languages-global-intelligence-for-everyone/': '2026-03-04',
  'https://www.argus.app/blog/posts/argus-vs-traditional-intelligence-tools/': '2026-03-11',
  'https://www.argus.app/blog/': '2026-03-19',
};

export default defineConfig({
  site: 'https://www.argus.app',
  base: '/blog',
  output: 'static',
  integrations: [
    sitemap({
      serialize(item) {
        const lastmod = POST_DATES[item.url];
        if (lastmod) return { ...item, lastmod };
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
