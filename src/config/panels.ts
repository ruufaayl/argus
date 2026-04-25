import type { PanelConfig, MapLayers, DataSourceId } from '@/types';
import { SITE_VARIANT } from './variant';
// boundary-ignore: isDesktopRuntime is a pure env probe with no service dependencies
import { isDesktopRuntime } from '@/services/runtime';
// boundary-ignore: getSecretState is a pure env/keychain probe with no service dependencies
import { getSecretState } from '@/services/runtime-config';

// Desktop-runtime probe retained for future variant gating (currently unused
// in VERITAS — kept to avoid ripping the import chain out unnecessarily).
void isDesktopRuntime;

// ============================================
// VERITAS DASHBOARD — 12 environmental panels
// ============================================
// Carbon credit verification + climate intelligence focus.
// Panel keys preserved (used by component lookup); only names + enabled flags
// changed. Everything not on this 12-panel list is disabled.
const FULL_PANELS: Record<string, PanelConfig> = {
  // === The Map (always on) ===
  map: { name: 'Earth System Map', enabled: true, priority: 1 },

  // === The 12 VERITAS panels ===
  insights:               { name: 'Carbon Intelligence Brief',  enabled: true, priority: 1 },
  forecast:               { name: 'AI Climate Forecasts',       enabled: true, priority: 1 },
  climate:                { name: 'Climate Anomalies',          enabled: true, priority: 1 },
  'satellite-fires':      { name: 'Fire & Deforestation',       enabled: true, priority: 1 },
  'thermal-escalation':   { name: 'Thermal Anomalies',          enabled: true, priority: 2 },
  'population-exposure':  { name: 'Climate Risk Exposure',      enabled: true, priority: 2 },
  'disaster-correlation': { name: 'Disaster Cascade',           enabled: true, priority: 2 },
  'disease-outbreaks':    { name: 'Climate Health Risks',       enabled: true, priority: 2 },
  'energy-complex':       { name: 'Energy & Renewables',        enabled: true, priority: 2 },
  'radiation-watch':      { name: 'Air Quality Monitor',        enabled: true, priority: 2 },
  giving:                 { name: 'Carbon Credit Markets',      enabled: true, priority: 2 },
  'cross-source-signals': { name: 'VERITAS Risk Signals',       enabled: true, priority: 2 },

  // === Live media — climate & earth-observation feeds ===
  'live-news':              { name: 'Climate News Live',  enabled: true,  priority: 2 },
  'live-webcams':           { name: 'Earth Live Cams',    enabled: true,  priority: 2 },

  // === Everything below is DISABLED for VERITAS ===
  'windy-webcams':          { name: 'Windy Webcam', enabled: false, priority: 3 },
  'strategic-posture':      { name: 'Strategic Posture', enabled: false, priority: 3 },
  cii:                      { name: 'Country Instability', enabled: false, priority: 3 },
  'strategic-risk':         { name: 'Strategic Risk', enabled: false, priority: 3 },
  intel:                    { name: 'Intel Feed', enabled: false, priority: 3 },
  'gdelt-intel':            { name: 'Live Intelligence', enabled: false, priority: 3 },
  cascade:                  { name: 'Cascade', enabled: false, priority: 3 },
  'military-correlation':   { name: 'Force Posture', enabled: false, priority: 3 },
  'escalation-correlation': { name: 'Escalation', enabled: false, priority: 3 },
  'economic-correlation':   { name: 'Economic Warfare', enabled: false, priority: 3 },
  politics:                 { name: 'World News', enabled: false, priority: 3 },
  us:                       { name: 'US', enabled: false, priority: 3 },
  europe:                   { name: 'Europe', enabled: false, priority: 3 },
  middleeast:               { name: 'Middle East', enabled: false, priority: 3 },
  africa:                   { name: 'Africa', enabled: false, priority: 3 },
  latam:                    { name: 'Latin America', enabled: false, priority: 3 },
  asia:                     { name: 'Asia-Pacific', enabled: false, priority: 3 },
  energy:                   { name: 'Energy', enabled: false, priority: 3 },
  gov:                      { name: 'Government', enabled: false, priority: 3 },
  thinktanks:               { name: 'Think Tanks', enabled: false, priority: 3 },
  polymarket:               { name: 'Predictions', enabled: false, priority: 3 },
  commodities:              { name: 'Commodities', enabled: false, priority: 3 },
  markets:                  { name: 'Markets', enabled: false, priority: 3 },
  'stock-analysis':         { name: 'Stock Analysis', enabled: false, priority: 3 },
  'stock-backtest':         { name: 'Backtesting', enabled: false, priority: 3 },
  'daily-market-brief':     { name: 'Market Brief', enabled: false, priority: 3 },
  'chat-analyst':           { name: 'Analyst', enabled: false, priority: 3 },
  economic:                 { name: 'Macro Stress', enabled: false, priority: 3 },
  'trade-policy':           { name: 'Trade Policy', enabled: false, priority: 3 },
  'supply-chain':           { name: 'Supply Chain', enabled: false, priority: 3 },
  finance:                  { name: 'Financial', enabled: false, priority: 3 },
  tech:                     { name: 'Technology', enabled: false, priority: 3 },
  crypto:                   { name: 'Crypto', enabled: false, priority: 3 },
  heatmap:                  { name: 'Sector Heatmap', enabled: false, priority: 3 },
  ai:                       { name: 'AI/ML', enabled: false, priority: 3 },
  layoffs:                  { name: 'Layoffs', enabled: false, priority: 3 },
  monitors:                 { name: 'My Monitors', enabled: false, priority: 3 },
  'macro-signals':          { name: 'Market Regime', enabled: false, priority: 3 },
  'fear-greed':             { name: 'Fear & Greed', enabled: false, priority: 3 },
  'macro-tiles':            { name: 'Macro Indicators', enabled: false, priority: 3 },
  'fsi':                    { name: 'Financial Stress', enabled: false, priority: 3 },
  'yield-curve':            { name: 'Yield Curve', enabled: false, priority: 3 },
  'earnings-calendar':      { name: 'Earnings Calendar', enabled: false, priority: 3 },
  'economic-calendar':      { name: 'Economic Calendar', enabled: false, priority: 3 },
  'cot-positioning':        { name: 'COT Positioning', enabled: false, priority: 3 },
  'hormuz-tracker':         { name: 'Hormuz Tracker', enabled: false, priority: 3 },
  'gulf-economies':         { name: 'Gulf Economies', enabled: false, priority: 3 },
  'consumer-prices':        { name: 'Consumer Prices', enabled: false, priority: 3 },
  'grocery-basket':         { name: 'Grocery Index', enabled: false, priority: 3 },
  'bigmac':                 { name: 'Big Mac Index', enabled: false, priority: 3 },
  'fuel-prices':            { name: 'Fuel Prices', enabled: false, priority: 3 },
  'etf-flows':              { name: 'ETF Tracker', enabled: false, priority: 3 },
  stablecoins:              { name: 'Stablecoins', enabled: false, priority: 3 },
  'ucdp-events':            { name: 'Conflict Events', enabled: false, priority: 3 },
  'social-velocity':        { name: 'Social Velocity', enabled: false, priority: 3 },
  displacement:             { name: 'Displacement', enabled: false, priority: 3 },
  'security-advisories':    { name: 'Security Advisories', enabled: false, priority: 3 },
  'sanctions-pressure':     { name: 'Sanctions', enabled: false, priority: 3 },
  'defense-patents':        { name: 'R&D Signal', enabled: false, priority: 3 },
  'oref-sirens':            { name: 'Sirens', enabled: false, priority: 3 },
  'telegram-intel':         { name: 'Telegram Intel', enabled: false, priority: 3 },
  'airline-intel':          { name: 'Airline Intel', enabled: false, priority: 3 },
  'tech-readiness':         { name: 'Tech Readiness', enabled: false, priority: 3 },
  'world-clock':            { name: 'World Clock', enabled: false, priority: 3 },
  'national-debt':          { name: 'Debt Clock', enabled: false, priority: 3 },
  'market-implications':    { name: 'Market Implications', enabled: false, priority: 3 },
  'deduction':              { name: 'Deduction', enabled: false, priority: 3 },
  'geo-hubs':               { name: 'Geo Hubs', enabled: false, priority: 3 },
  'tech-hubs':              { name: 'Tech Hubs', enabled: false, priority: 3 },
};

const FULL_MAP_LAYERS: MapLayers = {
  // ─── VERITAS environmental layer defaults ────────────────────────────
  // Layers in VARIANT_LAYER_ORDER.full (map-layer-definitions.ts) appear
  // in the toggle menu. The flags below control which start ON at first
  // load. All non-VERITAS layers are forced false — sanitizeLayersForVariant
  // would zero them anyway, so setting false here keeps types honest.
  //
  // Default-ON priority: layers with the strongest visual & data signal
  // for carbon-credit verification.

  // ─── ON: core carbon / climate signal ─────────
  fires: true,                   // NASA FIRMS hot pixels
  climate: true,                 // climate anomaly overlay
  speciesRecovery: true,         // biodiversity recovery dataset
  renewableInstallations: true,  // Global Energy Monitor renewables
  natural: true,                 // USGS earthquakes, Smithsonian volcanoes
  weather: true,                 // OpenWeatherMap alerts
  waterways: true,               // hydrology / SST context

  // ─── OFF (available in toggle, opt-in to keep globe uncluttered) ─────
  hotspots: false,
  weatherRadar: false,
  diseaseOutbreaks: false,
  displacement: false,
  webcams: false,
  dayNight: false,

  // ─── FORCED OFF in VERITAS: military / finance / OSINT / commodity ───
  iranAttacks: false,
  gpsJamming: false,
  satellites: false,
  conflicts: false,
  bases: false,
  cables: false,
  pipelines: false,
  ais: false,
  nuclear: false,
  irradiators: false,
  radiationWatch: false,
  sanctions: false,
  economic: false,
  outages: false,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  spaceports: false,
  minerals: false,
  ucdpEvents: false,
  // Tech layers (off)
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  // Finance layers (off)
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: false,
  gulfInvestments: false,
  // Happy variant layers (off)
  positiveEvents: false,
  kindness: false,
  happiness: false,
  tradeRoutes: false,
  ciiChoropleth: false,
  // Commodity layers (off)
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
};

const FULL_MOBILE_MAP_LAYERS: MapLayers = {
  iranAttacks: true,
  gpsJamming: false,
  satellites: false,


  conflicts: true,
  bases: false,
  cables: false,
  pipelines: false,
  hotspots: true,
  ais: false,
  nuclear: false,
  irradiators: false,
  radiationWatch: false,
  sanctions: true,
  weather: true,
  economic: false,
  waterways: false,
  outages: true,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  natural: true,
  spaceports: false,
  minerals: false,
  fires: false,
  // Data source layers
  ucdpEvents: false,
  displacement: false,
  climate: false,
  // Tech layers (disabled in full variant)
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  // Finance layers (disabled in full variant)
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: false,
  gulfInvestments: false,
  // Happy variant layers
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: false,
  ciiChoropleth: false,
  dayNight: false,
  // Commodity layers (disabled in full variant)
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
  weatherRadar: false, diseaseOutbreaks: false,
};

// ============================================
// TECH VARIANT (Tech/AI/Startups)
// ============================================
const TECH_PANELS: Record<string, PanelConfig> = {
  map: { name: 'Global Tech Map', enabled: true, priority: 1 },
  'live-news': { name: 'Tech Headlines', enabled: true, priority: 1 },
  'live-webcams': { name: 'Live Webcams', enabled: true, priority: 2 },
  'windy-webcams': { name: 'Windy Live Webcam', enabled: false, priority: 2 },
  insights: { name: 'AI Insights', enabled: true, priority: 1 },
  ai: { name: 'AI/ML News', enabled: true, priority: 1 },
  tech: { name: 'Technology', enabled: true, priority: 1 },
  startups: { name: 'Startups & VC', enabled: true, priority: 1 },
  vcblogs: { name: 'VC Insights & Essays', enabled: true, priority: 1 },
  regionalStartups: { name: 'Global Startup News', enabled: true, priority: 1 },
  unicorns: { name: 'Unicorn Tracker', enabled: true, priority: 1 },
  accelerators: { name: 'Accelerators & Demo Days', enabled: true, priority: 1 },
  security: { name: 'Cybersecurity', enabled: true, priority: 1 },
  policy: { name: 'AI Policy & Regulation', enabled: true, priority: 1 },
  regulation: { name: 'AI Regulation News', enabled: true, priority: 1 },
  layoffs: { name: 'Layoffs Tracker', enabled: true, priority: 1 },
  markets: { name: 'Tech Stocks', enabled: true, priority: 2 },
  finance: { name: 'Financial News', enabled: true, priority: 2 },
  crypto: { name: 'Crypto', enabled: true, priority: 2 },
  hardware: { name: 'Semiconductors & Hardware', enabled: true, priority: 2 },
  cloud: { name: 'Cloud & Infrastructure', enabled: true, priority: 2 },
  dev: { name: 'Developer Community', enabled: true, priority: 2 },
  github: { name: 'GitHub Trending', enabled: true, priority: 1 },
  ipo: { name: 'IPO & SPAC', enabled: true, priority: 2 },
  polymarket: { name: 'Tech Predictions', enabled: true, priority: 2 },
  funding: { name: 'Funding & VC', enabled: true, priority: 1 },
  producthunt: { name: 'Product Hunt', enabled: true, priority: 1 },
  events: { name: 'Tech Events', enabled: true, priority: 1 },
  'internet-disruptions': { name: 'Internet Disruptions', enabled: true, priority: 2 },
  'service-status': { name: 'Service Status', enabled: true, priority: 2 },
  economic: { name: 'Macro Stress', enabled: true, priority: 2 },
  'tech-readiness': { name: 'Tech Readiness Index', enabled: true, priority: 1 },
  'macro-signals': { name: 'Market Regime', enabled: true, priority: 2 },
  'etf-flows': { name: 'BTC ETF Tracker', enabled: true, priority: 2 },
  stablecoins: { name: 'Stablecoins', enabled: true, priority: 2 },
  'airline-intel': { name: 'Airline Intelligence', enabled: true, priority: 2 },
  'world-clock': { name: 'World Clock', enabled: true, priority: 2 },
  monitors: { name: 'My Monitors', enabled: true, priority: 2 },
  'tech-hubs': { name: 'Hot Tech Hubs', enabled: false, priority: 2 },
  'ai-regulation': { name: 'AI Regulation Dashboard', enabled: false, priority: 2 },
};

const TECH_MAP_LAYERS: MapLayers = {
  gpsJamming: false,
  satellites: false,


  conflicts: false,
  bases: false,
  cables: true,
  pipelines: false,
  hotspots: false,
  ais: false,
  nuclear: false,
  irradiators: false,
  sanctions: false,
  weather: false,
  economic: false,
  waterways: false,
  outages: true,
  cyberThreats: false,
  datacenters: true,
  protests: false,
  flights: false,
  military: false,
  natural: true,
  spaceports: false,
  minerals: false,
  fires: false,
  // Data source layers
  ucdpEvents: false,
  displacement: false,
  climate: false,
  // Tech layers (enabled in tech variant)
  startupHubs: true,
  cloudRegions: true,
  accelerators: false,
  techHQs: true,
  techEvents: true,
  // Finance layers (disabled in tech variant)
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: false,
  gulfInvestments: false,
  // Happy variant layers
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: false,
  iranAttacks: false,
  ciiChoropleth: false,
  dayNight: false,
  // Commodity layers (disabled in tech variant)
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
  weatherRadar: false, diseaseOutbreaks: false,
};

const TECH_MOBILE_MAP_LAYERS: MapLayers = {
  gpsJamming: false,
  satellites: false,


  conflicts: false,
  bases: false,
  cables: false,
  pipelines: false,
  hotspots: false,
  ais: false,
  nuclear: false,
  irradiators: false,
  sanctions: false,
  weather: false,
  economic: false,
  waterways: false,
  outages: true,
  cyberThreats: false,
  datacenters: true,
  protests: false,
  flights: false,
  military: false,
  natural: true,
  spaceports: false,
  minerals: false,
  fires: false,
  // Data source layers
  ucdpEvents: false,
  displacement: false,
  climate: false,
  // Tech layers (limited on mobile)
  startupHubs: true,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: true,
  // Finance layers (disabled in tech variant)
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: false,
  gulfInvestments: false,
  // Happy variant layers
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: false,
  iranAttacks: false,
  ciiChoropleth: false,
  dayNight: false,
  // Commodity layers (disabled in tech variant)
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
  weatherRadar: false, diseaseOutbreaks: false,
};

// ============================================
// FINANCE VARIANT (Markets/Trading)
// ============================================
const FINANCE_PANELS: Record<string, PanelConfig> = {
  map: { name: 'Global Markets Map', enabled: true, priority: 1 },
  'live-news': { name: 'Market Headlines', enabled: true, priority: 1 },
  'live-webcams': { name: 'Live Webcams', enabled: true, priority: 2 },
  'windy-webcams': { name: 'Windy Live Webcam', enabled: false, priority: 2 },
  insights: { name: 'AI Market Insights', enabled: true, priority: 1 },
  markets: { name: 'Live Markets', enabled: true, priority: 1 },
  'stock-analysis': { name: 'Premium Stock Analysis', enabled: true, priority: 1, premium: 'locked' },
  'stock-backtest': { name: 'Premium Backtesting', enabled: true, priority: 1, premium: 'locked' },
  'daily-market-brief': { name: 'Daily Market Brief', enabled: true, priority: 1, premium: 'locked' },
  'markets-news': { name: 'Markets News', enabled: true, priority: 2 },
  forex: { name: 'Forex & Currencies', enabled: true, priority: 1 },
  bonds: { name: 'Fixed Income', enabled: true, priority: 1 },
  commodities: { name: 'Metals & Materials', enabled: true, priority: 1 },
  'energy-complex': { name: 'Energy Complex', enabled: true, priority: 1 },
  'commodities-news': { name: 'Commodities News', enabled: true, priority: 2 },
  crypto: { name: 'Crypto & Digital Assets', enabled: true, priority: 1 },
  'crypto-news': { name: 'Crypto News', enabled: true, priority: 2 },
  'crypto-heatmap': { name: 'Crypto Sectors', enabled: true, priority: 1 },
  'defi-tokens': { name: 'DeFi Tokens', enabled: true, priority: 2 },
  'ai-tokens': { name: 'AI Tokens', enabled: true, priority: 2 },
  'other-tokens': { name: 'Alt Tokens', enabled: true, priority: 2 },
  centralbanks: { name: 'Central Bank Watch', enabled: true, priority: 1 },
  economic: { name: 'Macro Stress', enabled: true, priority: 1 },
  'trade-policy': { name: 'Trade Policy', enabled: true, priority: 1 },
  'sanctions-pressure': { name: 'Sanctions Pressure', enabled: true, priority: 1 },
  'supply-chain': { name: 'Supply Chain', enabled: true, priority: 1 },
  'economic-news': { name: 'Economic News', enabled: true, priority: 2 },
  ipo: { name: 'IPOs, Earnings & M&A', enabled: true, priority: 1 },
  heatmap: { name: 'Sector Heatmap', enabled: true, priority: 1 },
  'macro-signals': { name: 'Market Regime', enabled: true, priority: 1 },
  'macro-tiles': { name: 'Macro Indicators', enabled: true, priority: 1 },
  'fear-greed': { name: 'Fear & Greed', enabled: true, priority: 1 },
  'fsi': { name: 'Financial Stress', enabled: true, priority: 1 },
  'yield-curve': { name: 'Yield Curve', enabled: true, priority: 1 },
  'earnings-calendar': { name: 'Earnings Calendar', enabled: true, priority: 1 },
  'economic-calendar': { name: 'Economic Calendar', enabled: true, priority: 1 },
  'cot-positioning': { name: 'COT Positioning', enabled: true, priority: 2 },
  derivatives: { name: 'Derivatives & Options', enabled: true, priority: 2 },
  fintech: { name: 'Fintech & Trading Tech', enabled: true, priority: 2 },
  regulation: { name: 'Financial Regulation', enabled: true, priority: 2 },
  institutional: { name: 'Hedge Funds & PE', enabled: true, priority: 2 },
  analysis: { name: 'Market Analysis', enabled: true, priority: 2 },
  'etf-flows': { name: 'BTC ETF Tracker', enabled: true, priority: 2 },
  stablecoins: { name: 'Stablecoins', enabled: true, priority: 2 },
  'gcc-investments': { name: 'GCC Investments', enabled: true, priority: 2 },
  gccNews: { name: 'GCC Business News', enabled: true, priority: 2 },
  'gulf-economies': { name: 'Gulf Economies', enabled: true, priority: 1 },
  'consumer-prices': { name: 'Consumer Prices', enabled: true, priority: 1 },
  polymarket: { name: 'Predictions', enabled: true, priority: 2 },
  'airline-intel': { name: 'Airline Intelligence', enabled: true, priority: 2 },
  'world-clock': { name: 'World Clock', enabled: true, priority: 2 },
  monitors: { name: 'My Monitors', enabled: true, priority: 2 },
};

const FINANCE_MAP_LAYERS: MapLayers = {
  gpsJamming: false,
  satellites: false,


  conflicts: false,
  bases: false,
  cables: true,
  pipelines: true,
  hotspots: false,
  ais: false,
  nuclear: false,
  irradiators: false,
  sanctions: true,
  weather: true,
  economic: true,
  waterways: true,
  outages: true,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  natural: true,
  spaceports: false,
  minerals: false,
  fires: false,
  // Data source layers
  ucdpEvents: false,
  displacement: false,
  climate: false,
  // Tech layers (disabled in finance variant)
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  // Finance layers (enabled in finance variant)
  stockExchanges: true,
  financialCenters: true,
  centralBanks: true,
  commodityHubs: false,
  gulfInvestments: false,
  // Happy variant layers
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: true,
  iranAttacks: false,
  ciiChoropleth: false,
  dayNight: false,
  // Commodity layers (disabled in finance variant)
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
  weatherRadar: false, diseaseOutbreaks: false,
};

const FINANCE_MOBILE_MAP_LAYERS: MapLayers = {
  gpsJamming: false,
  satellites: false,


  conflicts: false,
  bases: false,
  cables: false,
  pipelines: false,
  hotspots: false,
  ais: false,
  nuclear: false,
  irradiators: false,
  sanctions: false,
  weather: false,
  economic: true,
  waterways: false,
  outages: true,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  natural: true,
  spaceports: false,
  minerals: false,
  fires: false,
  // Data source layers
  ucdpEvents: false,
  displacement: false,
  climate: false,
  // Tech layers (disabled)
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  // Finance layers (limited on mobile)
  stockExchanges: true,
  financialCenters: false,
  centralBanks: true,
  commodityHubs: false,
  gulfInvestments: false,
  // Happy variant layers
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: false,
  iranAttacks: false,
  ciiChoropleth: false,
  dayNight: false,
  // Commodity layers (disabled in finance variant)
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
  weatherRadar: false, diseaseOutbreaks: false,
};

// ============================================
// HAPPY VARIANT (Good News & Progress)
// ============================================
const HAPPY_PANELS: Record<string, PanelConfig> = {
  map: { name: 'World Map', enabled: true, priority: 1 },
  'positive-feed': { name: 'Good News Feed', enabled: true, priority: 1 },
  progress: { name: 'Human Progress', enabled: true, priority: 1 },
  counters: { name: 'Live Counters', enabled: true, priority: 1 },
  spotlight: { name: "Today's Hero", enabled: true, priority: 1 },
  breakthroughs: { name: 'Breakthroughs', enabled: true, priority: 1 },
  digest: { name: '5 Good Things', enabled: true, priority: 1 },
  species: { name: 'Conservation Wins', enabled: true, priority: 1 },
  renewable: { name: 'Renewable Energy', enabled: true, priority: 1 },
  giving: { name: 'Global Giving', enabled: true, priority: 1 },
};

const HAPPY_MAP_LAYERS: MapLayers = {
  gpsJamming: false,
  satellites: false,


  conflicts: false,
  bases: false,
  cables: false,
  pipelines: false,
  hotspots: false,
  ais: false,
  nuclear: false,
  irradiators: false,
  sanctions: false,
  weather: false,
  economic: false,
  waterways: false,
  outages: false,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  natural: false,
  spaceports: false,
  minerals: false,
  fires: false,
  // Data source layers
  ucdpEvents: false,
  displacement: false,
  climate: false,
  // Tech layers (disabled)
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  // Finance layers (disabled)
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: false,
  gulfInvestments: false,
  // Happy variant layers
  positiveEvents: true,
  kindness: true,
  happiness: true,
  speciesRecovery: true,
  renewableInstallations: true,
  tradeRoutes: false,
  iranAttacks: false,
  ciiChoropleth: false,
  dayNight: false,
  // Commodity layers (disabled)
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
  weatherRadar: false, diseaseOutbreaks: false,
};

const HAPPY_MOBILE_MAP_LAYERS: MapLayers = {
  gpsJamming: false,
  satellites: false,


  conflicts: false,
  bases: false,
  cables: false,
  pipelines: false,
  hotspots: false,
  ais: false,
  nuclear: false,
  irradiators: false,
  sanctions: false,
  weather: false,
  economic: false,
  waterways: false,
  outages: false,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  natural: false,
  spaceports: false,
  minerals: false,
  fires: false,
  // Data source layers
  ucdpEvents: false,
  displacement: false,
  climate: false,
  // Tech layers (disabled)
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  // Finance layers (disabled)
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: false,
  gulfInvestments: false,
  // Happy variant layers
  positiveEvents: true,
  kindness: true,
  happiness: true,
  speciesRecovery: true,
  renewableInstallations: true,
  tradeRoutes: false,
  iranAttacks: false,
  ciiChoropleth: false,
  dayNight: false,
  // Commodity layers (disabled)
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
  weatherRadar: false, diseaseOutbreaks: false,
};

// ============================================
// COMMODITY VARIANT (Mining, Metals, Energy)
// ============================================
const COMMODITY_PANELS: Record<string, PanelConfig> = {
  map: { name: 'Commodity Map', enabled: true, priority: 1 },
  'live-news': { name: 'Commodity Headlines', enabled: true, priority: 1 },
  insights: { name: 'AI Commodity Insights', enabled: true, priority: 1 },
  'commodity-news': { name: 'Commodity News', enabled: true, priority: 1 },
  'gold-silver': { name: 'Gold & Silver', enabled: true, priority: 1 },
  energy: { name: 'Energy Markets', enabled: true, priority: 1 },
  'mining-news': { name: 'Mining News', enabled: true, priority: 1 },
  'critical-minerals': { name: 'Critical Minerals', enabled: true, priority: 1 },
  'base-metals': { name: 'Base Metals', enabled: true, priority: 1 },
  'mining-companies': { name: 'Mining Companies', enabled: true, priority: 1 },
  'supply-chain': { name: 'Supply Chain & Logistics', enabled: true, priority: 1 },
  'commodity-regulation': { name: 'Regulation & Policy', enabled: true, priority: 1 },
  markets: { name: 'Commodity Markets', enabled: true, priority: 1 },
  commodities: { name: 'Live Metals & Materials', enabled: true, priority: 1 },
  'energy-complex': { name: 'Energy Complex', enabled: true, priority: 1 },
  heatmap: { name: 'Sector Heatmap', enabled: true, priority: 1 },
  'macro-signals': { name: 'Market Regime', enabled: true, priority: 1 },
  'trade-policy': { name: 'Trade Policy', enabled: true, priority: 1 },
  'sanctions-pressure': { name: 'Sanctions Pressure', enabled: true, priority: 1 },
  economic: { name: 'Macro Stress', enabled: true, priority: 1 },
  'gulf-economies': { name: 'Gulf & OPEC Economies', enabled: true, priority: 1 },
  'gcc-investments': { name: 'GCC Resource Investments', enabled: true, priority: 2 },
  'consumer-prices': { name: 'Consumer Prices', enabled: true, priority: 2 },
  'airline-intel': { name: 'Airline Intelligence', enabled: true, priority: 2 },
  polymarket: { name: 'Commodity Predictions', enabled: true, priority: 2 },
  'world-clock': { name: 'World Clock', enabled: true, priority: 2 },
  monitors: { name: 'My Monitors', enabled: true, priority: 2 },
};

const COMMODITY_MAP_LAYERS: MapLayers = {
  gpsJamming: false,
  satellites: false,


  conflicts: false,
  bases: false,
  cables: false,
  pipelines: true,
  hotspots: false,
  ais: true,
  nuclear: false,
  irradiators: false,
  sanctions: true,
  weather: true,
  economic: true,
  waterways: true,
  outages: true,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  natural: true,
  spaceports: false,
  minerals: true,
  fires: true,
  // Data source layers
  ucdpEvents: false,
  displacement: false,
  climate: true,         // Climate events disrupt supply chains
  // Tech layers (disabled)
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  // Finance layers (enabled for commodity hubs)
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: true,
  gulfInvestments: false,
  // Happy variant layers (disabled)
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: true,
  iranAttacks: false,
  ciiChoropleth: false,
  dayNight: false,
  // Commodity layers (enabled)
  miningSites: true,
  processingPlants: true,
  commodityPorts: true,
  webcams: false,
  weatherRadar: false, diseaseOutbreaks: false,
};

const COMMODITY_MOBILE_MAP_LAYERS: MapLayers = {
  gpsJamming: false,
  satellites: false,


  conflicts: false,
  bases: false,
  cables: false,
  pipelines: false,
  hotspots: false,
  ais: false,
  nuclear: false,
  irradiators: false,
  sanctions: false,
  weather: false,
  economic: true,
  waterways: false,
  outages: true,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  natural: true,
  spaceports: false,
  minerals: true,
  fires: false,
  // Data source layers
  ucdpEvents: false,
  displacement: false,
  climate: false,
  // Tech layers (disabled)
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  // Finance layers (limited on mobile)
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: true,
  gulfInvestments: false,
  // Happy variant layers (disabled)
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: false,
  iranAttacks: false,
  ciiChoropleth: false,
  dayNight: false,
  // Commodity layers (limited on mobile)
  miningSites: true,
  processingPlants: false,
  commodityPorts: true,
  webcams: false,
  weatherRadar: false, diseaseOutbreaks: false,
};

// ============================================
// UNIFIED PANEL REGISTRY
// ============================================

/** All panels from all variants — union with FULL taking precedence for duplicate keys. */
export const ALL_PANELS: Record<string, PanelConfig> = {
  ...HAPPY_PANELS,
  ...COMMODITY_PANELS,
  ...TECH_PANELS,
  ...FINANCE_PANELS,
  ...FULL_PANELS,
};

/** Per-variant canonical panel order (keys = which panels are enabled by default). */
export const VARIANT_DEFAULTS: Record<string, string[]> = {
  full:      Object.keys(FULL_PANELS),
  tech:      Object.keys(TECH_PANELS),
  finance:   Object.keys(FINANCE_PANELS),
  commodity: Object.keys(COMMODITY_PANELS),
  happy:     Object.keys(HAPPY_PANELS),
};

/**
 * Variant-specific label overrides for panels shared across variants.
 * Applied at render time, not just at seed time.
 */
export const VARIANT_PANEL_OVERRIDES: Partial<Record<string, Partial<Record<string, Partial<PanelConfig>>>>> = {
  full: {
    'live-news':    { name: 'Climate News Live' },
    'live-webcams': { name: 'Earth Live Cams' },
  },
  finance: {
    map:         { name: 'Global Markets Map' },
    'live-news': { name: 'Market Headlines' },
    insights:    { name: 'AI Market Insights' },
  },
  tech: {
    map:         { name: 'Global Tech Map' },
    'live-news': { name: 'Tech Headlines' },
    insights:    { name: 'AI Insights' },
  },
  commodity: {
    map:         { name: 'Commodity Map' },
    'live-news': { name: 'Commodity Headlines' },
    insights:    { name: 'AI Commodity Insights' },
  },
  happy: {
    map:         { name: 'World Map' },
  },
};

/**
 * Returns the effective panel config for a given key and variant,
 * applying variant-specific display overrides (name, premium, etc.).
 */
export function getEffectivePanelConfig(key: string, variant: string): PanelConfig {
  const base = ALL_PANELS[key];
  if (!base) return { name: key, enabled: false, priority: 2 };
  const override = VARIANT_PANEL_OVERRIDES[variant]?.[key] ?? {};
  return { ...base, ...override };
}

export const FREE_MAX_PANELS = 40;
export const FREE_MAX_SOURCES = 80;

/**
 * Returns true if the current user is entitled to enable/view this panel.
 * Mirrors the entitlement checks in panel-layout.ts (single source of truth).
 */
export function isPanelEntitled(key: string, config: PanelConfig, isPro = false): boolean {
  if (!config.premium) return true;
  const apiKeyPanels = ['stock-analysis', 'stock-backtest', 'daily-market-brief', 'market-implications', 'deduction', 'chat-analyst'];
  if (apiKeyPanels.includes(key)) {
    return getSecretState('WORLDMONITOR_API_KEY').present || isPro;
  }
  if (config.premium === 'locked') {
    return isDesktopRuntime();
  }
  return true;
}

// ============================================
// VARIANT-AWARE EXPORTS
// ============================================
export const DEFAULT_PANELS: Record<string, PanelConfig> = Object.fromEntries(
  (VARIANT_DEFAULTS[SITE_VARIANT] ?? VARIANT_DEFAULTS['full'] ?? []).map(key =>
    [key, getEffectivePanelConfig(key, SITE_VARIANT)]
  )
);

export const DEFAULT_MAP_LAYERS = SITE_VARIANT === 'happy' 
  ? HAPPY_MAP_LAYERS 
  : SITE_VARIANT === 'tech' 
    ? TECH_MAP_LAYERS 
    : SITE_VARIANT === 'finance' 
      ? FINANCE_MAP_LAYERS 
      : SITE_VARIANT === 'commodity'
        ? COMMODITY_MAP_LAYERS
        : FULL_MAP_LAYERS;

export const MOBILE_DEFAULT_MAP_LAYERS = SITE_VARIANT === 'happy' 
  ? HAPPY_MOBILE_MAP_LAYERS 
  : SITE_VARIANT === 'tech' 
    ? TECH_MOBILE_MAP_LAYERS 
    : SITE_VARIANT === 'finance' 
      ? FINANCE_MOBILE_MAP_LAYERS 
      : SITE_VARIANT === 'commodity'
        ? COMMODITY_MOBILE_MAP_LAYERS
        : FULL_MOBILE_MAP_LAYERS;

/** Maps map-layer toggle keys to their data-freshness source IDs (single source of truth). */
export const LAYER_TO_SOURCE: Partial<Record<keyof MapLayers, DataSourceId[]>> = {
  military: ['opensky', 'wingbits'],
  ais: ['ais'],
  natural: ['usgs'],
  weather: ['weather'],
  outages: ['outages'],
  cyberThreats: ['cyber_threats'],
  protests: ['acled', 'gdelt_doc'],
  ucdpEvents: ['ucdp_events'],
  displacement: ['unhcr'],
  climate: ['climate'],
  sanctions: ['sanctions_pressure'],
  radiationWatch: ['radiation'],
};

// ============================================
// PANEL CATEGORY MAP
// ============================================
// Maps category keys to panel keys. Only categories with at least one
// matching panel in the user's active panel settings are shown.
export const PANEL_CATEGORY_MAP: Record<string, { labelKey: string; panelKeys: string[]; variants?: string[] }> = {
  // All variants — essential panels
  core: {
    labelKey: 'header.panelCatCore',
    panelKeys: ['map', 'live-news', 'live-webcams', 'windy-webcams', 'insights', 'strategic-posture'],
  },

  // Full (geopolitical) variant
  intelligence: {
    labelKey: 'header.panelCatIntelligence',
    panelKeys: ['cii', 'strategic-risk', 'intel', 'gdelt-intel', 'cascade', 'telegram-intel', 'forecast'],
  },
  correlation: {
    labelKey: 'header.panelCatCorrelation',
    panelKeys: ['military-correlation', 'escalation-correlation', 'economic-correlation', 'disaster-correlation'],
  },
  regionalNews: {
    labelKey: 'header.panelCatRegionalNews',
    panelKeys: ['politics', 'us', 'europe', 'middleeast', 'africa', 'latam', 'asia'],
  },
  marketsFinance: {
    labelKey: 'header.panelCatMarketsFinance',
    panelKeys: ['commodities', 'energy-complex', 'markets', 'economic', 'trade-policy', 'sanctions-pressure', 'supply-chain', 'finance', 'polymarket', 'macro-signals', 'gulf-economies', 'etf-flows', 'stablecoins', 'crypto', 'heatmap'],
  },
  topical: {
    labelKey: 'header.panelCatTopical',
    panelKeys: ['energy', 'gov', 'thinktanks', 'tech', 'ai', 'layoffs'],
  },
  dataTracking: {
    labelKey: 'header.panelCatDataTracking',
    panelKeys: ['monitors', 'satellite-fires', 'ucdp-events', 'displacement', 'climate', 'population-exposure', 'security-advisories', 'radiation-watch', 'oref-sirens', 'world-clock', 'tech-readiness'],
  },

  // Tech variant
  techAi: {
    labelKey: 'header.panelCatTechAi',
    panelKeys: ['ai', 'tech', 'hardware', 'cloud', 'dev', 'github', 'producthunt', 'events', 'service-status', 'tech-readiness'],
  },
  startupsVc: {
    labelKey: 'header.panelCatStartupsVc',
    panelKeys: ['startups', 'vcblogs', 'regionalStartups', 'unicorns', 'accelerators', 'funding', 'ipo'],
  },
  securityPolicy: {
    labelKey: 'header.panelCatSecurityPolicy',
    panelKeys: ['security', 'policy', 'regulation'],
  },
  techMarkets: {
    labelKey: 'header.panelCatMarkets',
    panelKeys: ['markets', 'finance', 'crypto', 'economic', 'sanctions-pressure', 'polymarket', 'macro-signals', 'etf-flows', 'stablecoins', 'layoffs', 'monitors', 'world-clock'],
  },

  // Finance variant
  finMarkets: {
    labelKey: 'header.panelCatMarkets',
    panelKeys: ['markets', 'stock-analysis', 'stock-backtest', 'daily-market-brief', 'markets-news', 'heatmap', 'macro-signals', 'analysis', 'polymarket'],
  },
  fixedIncomeFx: {
    labelKey: 'header.panelCatFixedIncomeFx',
    panelKeys: ['forex', 'bonds'],
  },
  finCommodities: {
    labelKey: 'header.panelCatCommodities',
    panelKeys: ['commodities', 'energy-complex', 'commodities-news'],
  },
  cryptoDigital: {
    labelKey: 'header.panelCatCryptoDigital',
    panelKeys: ['crypto', 'crypto-heatmap', 'defi-tokens', 'ai-tokens', 'other-tokens', 'crypto-news', 'etf-flows', 'stablecoins', 'fintech'],
  },
  centralBanksEcon: {
    labelKey: 'header.panelCatCentralBanks',
    panelKeys: ['centralbanks', 'economic', 'energy-complex', 'trade-policy', 'sanctions-pressure', 'supply-chain', 'economic-news'],
  },
  dealsInstitutional: {
    labelKey: 'header.panelCatDeals',
    panelKeys: ['ipo', 'derivatives', 'institutional', 'regulation'],
  },
  gulfMena: {
    labelKey: 'header.panelCatGulfMena',
    panelKeys: ['gulf-economies', 'gcc-investments', 'gccNews', 'consumer-prices', 'monitors', 'world-clock'],
    variants: ['finance'],
  },

  // Commodity variant
  commodityPrices: {
    labelKey: 'header.panelCatCommodityPrices',
    panelKeys: ['commodities', 'energy-complex', 'gold-silver', 'energy', 'base-metals', 'critical-minerals', 'markets', 'heatmap', 'macro-signals'],
  },
  miningIndustry: {
    labelKey: 'header.panelCatMining',
    panelKeys: ['commodity-news', 'mining-news', 'mining-companies', 'supply-chain', 'commodity-regulation'],
  },
  commodityEcon: {
    labelKey: 'header.panelCatCommodityEcon',
    panelKeys: ['trade-policy', 'sanctions-pressure', 'economic', 'gulf-economies', 'gcc-investments', 'consumer-prices', 'finance', 'polymarket', 'airline-intel', 'world-clock', 'monitors'],
    variants: ['commodity'],
  },

  // Happy variant
  happyNews: {
    labelKey: 'header.panelCatHappyNews',
    panelKeys: ['positive-feed', 'progress', 'counters', 'spotlight', 'breakthroughs', 'digest'],
  },
  happyPlanet: {
    labelKey: 'header.panelCatHappyPlanet',
    panelKeys: ['species', 'renewable', 'giving'],
  },
};

// Monitor palette — fixed category colors persisted to localStorage (not theme-dependent)
export const MONITOR_COLORS = [
  '#44ff88',
  '#ff8844',
  '#4488ff',
  '#ff44ff',
  '#ffff44',
  '#ff4444',
  '#44ffff',
  '#88ff44',
  '#ff88ff',
  '#88ffff',
];

export const STORAGE_KEYS = {
  panels: 'argus-panels',
  monitors: 'argus-monitors',
  mapLayers: 'argus-layers',
  disabledFeeds: 'argus-disabled-feeds',
} as const;
