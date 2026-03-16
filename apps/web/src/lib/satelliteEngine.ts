// File: apps/web/src/lib/satelliteEngine.ts
// ARGUS v5.0 — Shared types and constants for satellite system

export interface TLERecord {
  name: string;
  source: string;
  line1: string;
  line2: string;
}

// Float32Array layout per satellite:
// [lat_deg, lon_deg, alt_km, velocity_km_s, isOverPakistan, sourceId]
export const SAT_DATA_STRIDE = 6;

export const SAT_SOURCE_MAP: Record<string, number> = {
  active: 0,
  starlink: 1,
  gps: 2,
  stations: 3,
};

export const PK_BOUNDS = {
  minLat: 23.5,
  maxLat: 37.5,
  minLon: 60.8,
  maxLon: 77.8,
};
