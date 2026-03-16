// ============================================================
// ARGUS — Unified Layer Key Constants
// Single source of truth for all layer toggle keys.
// Used by: commandStore, DataLayersMenu, all layer components
// ============================================================

export const LAYER_KEYS = {
  flights:    'flights',
  vessels:    'vessels',
  weather:    'weather',
  satellites: 'satellites',
  landmarks:  'landmarks',
  traffic:    'traffic',
  seismic:    'seismic',
  incidents:  'incidents',
  population: 'population',
  border:     'border',
  cctv:       'cctv',
  sigint:     'sigint',
  // Legacy OSM category keys — mapped into landmarks 
  military:    'military',
  government:  'government',
  transport:   'transport',
  commercial:  'commercial',
  education:   'education',
  healthcare:  'healthcare',
  religious:   'religious',
  tourism:     'tourism',
  industrial:  'industrial',
  residential: 'residential',
  media:       'media',
} as const;

export type LayerKey = typeof LAYER_KEYS[keyof typeof LAYER_KEYS];
