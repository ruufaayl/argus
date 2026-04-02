// File: apps/web/src/lib/satelliteEngine.ts
// ARGUS v5.0 — Shared types and constants for satellite system

export interface TLERecord {
  name: string;
  source: string;
  line1: string;
  line2: string;
}

export const PK_BOUNDS = {
  minLat: 23.5,
  maxLat: 37.5,
  minLon: 60.8,
  maxLon: 77.8,
};
