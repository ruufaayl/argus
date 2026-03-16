// ============================================================
// Altitude Manager — The Brain of the Experience
// Everything triggers on altitude. This is the core architectural decision.
// ============================================================

import type { AltitudeZone } from '@sentinel/shared';

export const ALTITUDE_THRESHOLDS = {
  SPACE:         500_000,   // meters — Earth from orbit
  APPROACH:      100_000,   // Pakistan visible
  COUNTRY:        50_000,   // Full country
  CITY:            5_000,   // City grid loads
  DISTRICT:          500,   // Neighbourhood detail
  STREET:            100,   // Street level — MapLibre takeover
  GROUND:             20,   // Walking level
} as const;

/** What layers should be visible at each altitude zone */
export const ZONE_LAYERS: Record<AltitudeZone, string[]> = {
  SPACE:    ['night-lights', 'atmosphere'],
  APPROACH: ['night-lights', 'atmosphere', 'flights'],
  COUNTRY:  ['terrain', 'flights', 'city-markers'],
  CITY:     ['buildings-3d', 'population-hex', 'aqi-overlay',
              'power-outages', 'heat-island', 'traffic'],
  DISTRICT: ['buildings-detail', 'street-level-data',
              'flood-memory', 'water-stress', 'signals'],
  STREET:   ['maplibre-takeover', 'mapillary-photos',
              'pedestrian-density', 'poi-markers'],
  GROUND:   ['immersive-view'],
};

/** Convert raw camera altitude in meters to an altitude zone */
export function altitudeToZone(altitude: number): AltitudeZone {
  if (altitude > ALTITUDE_THRESHOLDS.SPACE)    return 'SPACE';
  if (altitude > ALTITUDE_THRESHOLDS.APPROACH) return 'APPROACH';
  if (altitude > ALTITUDE_THRESHOLDS.COUNTRY)  return 'COUNTRY';
  if (altitude > ALTITUDE_THRESHOLDS.CITY)     return 'CITY';
  if (altitude > ALTITUDE_THRESHOLDS.DISTRICT) return 'DISTRICT';
  if (altitude > ALTITUDE_THRESHOLDS.STREET)   return 'STREET';
  return 'GROUND';
}

/** Get the layers that should be active for a given altitude */
export function getActiveLayersForAltitude(altitude: number): string[] {
  const zone = altitudeToZone(altitude);
  return ZONE_LAYERS[zone];
}

/** Format altitude for display */
export function formatAltitude(meters: number): string {
  if (meters >= 1_000_000) {
    return `${(meters / 1_000_000).toFixed(1)}M m`;
  }
  if (meters >= 1_000) {
    return `${(meters / 1_000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}
