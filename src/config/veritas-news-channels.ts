/**
 * VERITAS Environmental News Feed Configuration
 * ───────────────────────────────────────────────
 * Source: VERITAS_Environmental_Feeds.docx (Phase 2A reference document).
 * 18 verified active RSS feeds — no API keys required, all free public sources.
 *
 * Category palette:
 *   #00D4AA — carbon science (tier 1, primary)
 *   #3DBBA8 — UN/scientific authority
 *   #7FE03A — climate policy / forest cover
 *   #FFB020 — mainstream investigative
 *   #8BA0BE — analysis / registry / specialist
 *
 * IMPLEMENTATION NOTE: Browser fetches must route through /api/news/fetch
 * (existing Vercel Edge proxy) to bypass CORS. Pass `url` as query param.
 */

export interface VeritasNewsChannel {
  /** Stable id used in storage / panel routing. */
  id: string;
  /** Display name (used in UI tabs). */
  name: string;
  /** RSS feed URL — fetched server-side via /api/news/fetch?url=... */
  url: string;
  /** Coverage focus tag, shown as eyebrow above headlines. */
  category: string;
  /**
   * Priority tier (1 = highest VERITAS relevance, 3 = specialist).
   * Tier 1 enabled by default; tier 2/3 opt-in.
   */
  priority: 1 | 2 | 3;
  /** Hex color used for tab indicator + category chip. */
  color: string;
}

export const VERITAS_NEWS_CHANNELS: VeritasNewsChannel[] = [
  // ─── TIER 1 — CARBON & ESG (highest VERITAS relevance) ──────────────
  { id: 'carbon-brief',         name: 'Carbon Brief',         url: 'https://www.carbonbrief.org/feed',                    category: 'CARBON SCIENCE',     priority: 1, color: '#00D4AA' },
  { id: 'carbon-pulse',         name: 'Carbon Pulse',         url: 'https://carbon-pulse.com/feed/',                      category: 'CARBON MARKETS',     priority: 1, color: '#00D4AA' },
  { id: 'unep',                 name: 'UNEP',                 url: 'https://www.unep.org/news-and-stories/rss.xml',       category: 'UN ENVIRONMENT',     priority: 1, color: '#3DBBA8' },
  { id: 'climate-change-news',  name: 'Climate Change News',  url: 'https://www.climatechangenews.com/feed',              category: 'CLIMATE POLICY',     priority: 1, color: '#7FE03A' },
  { id: 'inside-climate',       name: 'Inside Climate News',  url: 'https://insideclimatenews.org/feed',                  category: 'INVESTIGATIVE',      priority: 1, color: '#00D4AA' },
  { id: 'columbia-climate',     name: 'Columbia Climate',     url: 'https://news.climate.columbia.edu/feed',              category: 'RESEARCH',           priority: 1, color: '#3DBBA8' },
  { id: 'carbonchain',          name: 'CarbonChain',          url: 'https://carbonchain.com/blog/rss.xml',                category: 'CARBON ACCOUNTING',  priority: 1, color: '#00D4AA' },
  { id: 'ecologist',            name: 'The Ecologist',        url: 'https://theecologist.org/whats_new/feed',             category: 'POLICY',             priority: 1, color: '#7FE03A' },

  // ─── TIER 2 — MAINSTREAM ENVIRONMENTAL ──────────────────────────────
  { id: 'reuters-env',          name: 'Reuters Environment',  url: 'https://feeds.reuters.com/reuters/environment',       category: 'BREAKING NEWS',      priority: 2, color: '#FFB020' },
  { id: 'guardian-env',         name: 'The Guardian',         url: 'https://www.theguardian.com/environment/rss',         category: 'INVESTIGATIVE',      priority: 2, color: '#FFB020' },
  { id: 'bbc-science-env',      name: 'BBC Science & Env',    url: 'http://feeds.bbci.co.uk/news/science_and_environment/rss.xml', category: 'GLOBAL',    priority: 2, color: '#FFB020' },
  { id: 'npr-climate',          name: 'NPR Climate',          url: 'https://feeds.npr.org/1167/rss.xml',                  category: 'US POLICY',          priority: 2, color: '#FFB020' },
  { id: 'nasa-earth',           name: 'NASA Earth',           url: 'https://www.nasa.gov/rss/dyn/earth.rss',              category: 'SATELLITE DATA',     priority: 2, color: '#3DBBA8' },
  { id: 'noaa-news',            name: 'NOAA',                 url: 'https://www.noaa.gov/news-features/feed',             category: 'OCEAN & ATMOSPHERE', priority: 2, color: '#3DBBA8' },

  // ─── TIER 3 — SPECIALIST & REGISTRY ─────────────────────────────────
  { id: 'mongabay',             name: 'Mongabay',             url: 'https://news.mongabay.com/feed/',                     category: 'DEFORESTATION',      priority: 3, color: '#7FE03A' },
  { id: 'gfw-blog',             name: 'Global Forest Watch',  url: 'https://www.globalforestwatch.org/blog/feed',         category: 'FOREST COVER',       priority: 3, color: '#7FE03A' },
  { id: 'yale-e360',            name: 'Yale E360',            url: 'https://e360.yale.edu/feed.xml',                      category: 'ANALYSIS',           priority: 3, color: '#8BA0BE' },
  { id: 'verra',                name: 'Verra',                url: 'https://verra.org/feed',                              category: 'CARBON REGISTRY',    priority: 3, color: '#8BA0BE' },
  { id: 'unfccc',               name: 'UNFCCC',               url: 'https://unfccc.int/blog/feed',                        category: 'UN CLIMATE',         priority: 3, color: '#8BA0BE' },
];

/** Channels enabled on first load — Tier 1 + the most-recognised mainstream sources. */
export const VERITAS_DEFAULT_CHANNEL_IDS: readonly string[] = [
  'carbon-brief',
  'carbon-pulse',
  'reuters-env',
  'guardian-env',
  'nasa-earth',
];

/**
 * GDELT climate query — used by AI news summariser to pull environmental
 * articles. Encode and concatenate into the GDELT v2 doc API URL.
 *
 * Example:
 *   const url = `https://api.gdeltproject.org/api/v2/doc/doc?` +
 *               `query=${encodeURIComponent(VERITAS_GDELT_CLIMATE_QUERY)}` +
 *               `&mode=artlist&maxrecords=20&format=json&timespan=1d`;
 */
export const VERITAS_GDELT_CLIMATE_KEYWORDS: readonly string[] = [
  'carbon credits', 'carbon emissions', 'carbon market', 'REDD+',
  'climate change', 'global warming', 'deforestation', 'glacier melt',
  'sea level rise', 'coral bleaching', 'net zero', 'CSRD', 'ESG',
  'carbon offset', 'greenwashing', 'Verra', 'Gold Standard',
  'CO2 ppm', 'methane emissions', 'Paris Agreement', 'COP30',
];

export const VERITAS_GDELT_CLIMATE_QUERY: string =
  VERITAS_GDELT_CLIMATE_KEYWORDS.join(' OR ');
