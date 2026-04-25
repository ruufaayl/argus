/**
 * VERITAS Live Environmental Webcam Streams
 * ──────────────────────────────────────────
 * Source: VERITAS_Environmental_Feeds.docx (Phase 2A reference document).
 * 12+ public 24/7 streams sorted by continent, with an environmental tag,
 * primary embed URL, fallback page URL, and globe pin coordinates.
 *
 * Embed reliability tiers (per docx):
 *   HIGH   — explore.org, USGS YouTube, AfriCam (rarely down)
 *   MEDIUM — SkylineWebcams (occasional restarts), JCU Reef (solar/daylight)
 *   LOW    — searched/aggregated cams (Sundarbans, Kilimanjaro)
 *
 * When a stream is offline, the dashboard falls back to a NASA Worldview
 * static satellite image: https://worldview.earthdata.nasa.gov
 */

export type VeritasWebcamTag =
  | 'GLACIER'
  | 'EMISSIONS'
  | 'DEFORESTATION'
  | 'OCEAN'
  | 'ECOSYSTEM'
  | 'AIR_QUALITY'
  | 'BLUE_CARBON'
  | 'ARCTIC';

export type VeritasWebcamContinent =
  | 'North America'
  | 'South America'
  | 'Europe'
  | 'Africa'
  | 'Asia'
  | 'Oceania';

export interface VeritasWebcam {
  /** Stable id used in storage / panel routing. */
  id: string;
  /** Display name. */
  name: string;
  /** Free-form location string. */
  location: string;
  /** Continent grouping for the region filter. */
  continent: VeritasWebcamContinent;
  /** Environmental tag — used for filtering + chip color. */
  tag: VeritasWebcamTag;
  /** Use this for `<iframe src=>` directly. YouTube embeds preferred. */
  embedUrl: string;
  /** Fallback — open in new tab when iframe blocked. */
  pageUrl: string;
  /** [lat, lng] for globe/map pin. */
  coords: readonly [number, number];
  /** One-line description of environmental relevance. */
  description: string;
}

export const VERITAS_WEBCAMS: readonly VeritasWebcam[] = [
  // ─── NORTH AMERICA ──────────────────────────────────────────────────
  {
    id: 'kilauea',
    name: 'Kilauea Volcano',
    location: 'Hawaii, USA',
    continent: 'North America',
    tag: 'EMISSIONS',
    embedUrl: 'https://www.youtube.com/embed/kMRKYNFYOAI?autoplay=1&mute=1',
    pageUrl: 'https://www.usgs.gov/volcanoes/kilauea/webcams',
    coords: [19.421, -155.287],
    description: 'Active lava + volcanic gas (CO2/SO2). USGS official 24/7 stream.',
  },
  {
    id: 'brooks-falls',
    name: 'Brooks Falls Bears',
    location: 'Katmai NP, Alaska',
    continent: 'North America',
    tag: 'ECOSYSTEM',
    embedUrl: 'https://www.youtube.com/embed/TVx9Pt0H6jE?autoplay=1&mute=1',
    pageUrl: 'https://explore.org/livecams/three-bears/brown-bear-salmon-cam-brooks-falls',
    coords: [58.625, -155.062],
    description: 'Intact boreal carbon sink. Brown bears + Pacific salmon run.',
  },
  {
    id: 'polar-bear',
    name: 'Polar Bear Cam',
    location: 'Wapusk NP, Canada',
    continent: 'North America',
    tag: 'ARCTIC',
    embedUrl: 'https://www.youtube.com/embed/IfHMPxRwFxc?autoplay=1&mute=1',
    pageUrl: 'https://explore.org/livecams/polar-bears/polar-bear-cam',
    coords: [58.73, -93.65],
    description: 'Arctic sea-ice loss impact, Churchill Manitoba. Seasonal Oct–Nov.',
  },

  // ─── SOUTH AMERICA ──────────────────────────────────────────────────
  {
    id: 'amazon-junglekeepers',
    name: 'Amazon Reserve Cam',
    location: 'Madre de Dios, Peru',
    continent: 'South America',
    tag: 'DEFORESTATION',
    embedUrl: 'https://www.junglekeepers.org/cameras/remote-lake',
    pageUrl: 'https://www.earthcam.com/world/peru/madrededios/',
    coords: [-11.8, -71.2],
    description: 'Protected REDD+ reserve. Oxbow lake. 24/7 Amazon rainforest cam.',
  },
  {
    id: 'galapagos',
    name: 'Galápagos Islands',
    location: 'Ecuador',
    continent: 'South America',
    tag: 'OCEAN',
    embedUrl: 'https://explore.org/livecams/galapagos',
    pageUrl: 'https://explore.org/livecams/galapagos',
    coords: [-0.68, -90.54],
    description: 'UNESCO site. Ocean acidification impact on unique biodiversity.',
  },

  // ─── EUROPE ─────────────────────────────────────────────────────────
  {
    id: 'jokulsarlon',
    name: 'Jökulsárlón Glacier Lagoon',
    location: 'Iceland',
    continent: 'Europe',
    tag: 'GLACIER',
    embedUrl: 'https://www.skylinewebcams.com/en/webcam/iceland/austurland/hofn/jokulsarlon.html',
    pageUrl: 'https://worldcam.eu/webcams/europe/iceland/18204-jokulsarlon-glacier-lagoon',
    coords: [64.05, -16.18],
    description: 'Vatnajökull glacier retreat. Icebergs calving live.',
  },
  {
    id: 'etna',
    name: 'Etna Volcano',
    location: 'Sicily, Italy',
    continent: 'Europe',
    tag: 'EMISSIONS',
    embedUrl: 'https://www.skylinewebcams.com/en/webcam/italia/sicilia/catania/etna.html',
    pageUrl: 'https://www.ct.ingv.it/index.php/monitoraggio-e-sorveglianza/prodotti-del-monitoraggio/webcam',
    coords: [37.75, 15.0],
    description: 'Europe’s largest active volcano. CO2/SO2 emissions monitoring.',
  },

  // ─── AFRICA ─────────────────────────────────────────────────────────
  {
    id: 'tembe',
    name: 'Tembe Elephant Park',
    location: 'South Africa',
    continent: 'Africa',
    tag: 'ECOSYSTEM',
    embedUrl: 'https://www.africam.com/wildlife/tembe_elephant_park',
    pageUrl: 'https://explore.org/livecams/africam/tembe-elephant-park',
    coords: [-27.02, 32.45],
    description: 'Savanna carbon sink. 24/7 watering hole. Largest African elephants.',
  },
  {
    id: 'gorilla-drc',
    name: 'Gorilla Forest Corridor',
    location: 'Eastern DRC',
    continent: 'Africa',
    tag: 'DEFORESTATION',
    embedUrl: 'https://explore.org/livecams/african-wildlife/gorilla-forest-corridor',
    pageUrl: 'https://explore.org/livecams/african-wildlife/gorilla-forest-corridor',
    coords: [-1.4, 29.2],
    description: 'Congo Basin forest — 2nd-largest carbon sink. REDD+ critical area.',
  },

  // ─── ASIA ───────────────────────────────────────────────────────────
  {
    id: 'panda-chengdu',
    name: 'Giant Panda Centre',
    location: 'Chengdu, China',
    continent: 'Asia',
    tag: 'ECOSYSTEM',
    embedUrl: 'https://explore.org/livecams/three-bears/happiness-village-baby-panda-park',
    pageUrl: 'https://explore.org/livecams/three-bears/happiness-village-baby-panda-park',
    coords: [30.67, 103.87],
    description: 'Sichuan bamboo forest ecosystem health. Biodiversity conservation.',
  },

  // ─── OCEANIA / POLAR ────────────────────────────────────────────────
  {
    id: 'reef-cam-australia',
    name: 'Great Southern Reef Cam',
    location: 'Port Phillip Bay, Australia',
    continent: 'Oceania',
    tag: 'OCEAN',
    embedUrl: 'https://www.natureaustralia.org.au/what-we-do/our-priorities/oceans/ocean-stories/reef-cam/',
    pageUrl: 'https://soel.org.au/reef-cam',
    coords: [-38.27, 144.7],
    description: 'Live underwater reef cam. Coral bleaching monitoring. Solar-powered.',
  },
  {
    id: 'jcu-orpheus',
    name: 'Great Barrier Reef Cam',
    location: 'Orpheus Island, Australia',
    continent: 'Oceania',
    tag: 'OCEAN',
    embedUrl: 'https://www.jcu.edu.au/classroom-on-the-reef/livecams',
    pageUrl: 'https://www.jcu.edu.au/classroom-on-the-reef/livecams',
    coords: [-18.6, 146.5],
    description: 'JCU scientific underwater cam. Active 6am–6pm AEST.',
  },
];

/** Default fallback when a stream embed fails. NASA Worldview is public-domain and CORS-friendly. */
export const VERITAS_FALLBACK_IMAGERY_URL = 'https://worldview.earthdata.nasa.gov';

/** Continent groupings for region filter UI. */
export const VERITAS_WEBCAM_CONTINENTS: readonly VeritasWebcamContinent[] = [
  'North America',
  'South America',
  'Europe',
  'Africa',
  'Asia',
  'Oceania',
];

/** Tag → display color (matches VERITAS theme palette). */
export const VERITAS_WEBCAM_TAG_COLORS: Record<VeritasWebcamTag, string> = {
  GLACIER:       '#6ee7b7',
  EMISSIONS:     '#f5b541',
  DEFORESTATION: '#fb923c',
  OCEAN:         '#3DBBA8',
  ECOSYSTEM:     '#4ade80',
  AIR_QUALITY:   '#94a3b8',
  BLUE_CARBON:   '#00D4AA',
  ARCTIC:        '#94d6f5',
};
