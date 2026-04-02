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
  seismic:    'seismic',
  incidents:  'incidents',
  border:     'border',
  cctv:       'cctv',
  sigint:     'sigint',
  // OSM landmark category keys — wired via LandmarkLayer CATEGORY_TO_LAYER mapping
  military:    'military',
  transport:   'transport',
  education:   'education',
  healthcare:  'healthcare',
  religious:   'religious',
  industrial:  'industrial',
} as const;

export type LayerKey = typeof LAYER_KEYS[keyof typeof LAYER_KEYS];
