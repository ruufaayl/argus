// ============================================================
// ARGUS — Geographic Constants
// Single source of truth for Pakistan center coordinates
// and default camera positions.
// ============================================================

/** Pakistan geographic center (approximate) */
export const PK_CENTER = {
  lon: 69.3451,
  lat: 30.3753,
} as const;

/** Default camera altitude when viewing all of Pakistan */
export const PK_DEFAULT_ALT = 4_500_000; // 4,500 km

/** Home view — used by keyboard shortcut (Home/0) and idle reset */
export const PK_HOME_VIEW = {
  lon: PK_CENTER.lon,
  lat: PK_CENTER.lat,
  alt: PK_DEFAULT_ALT,
  heading: 0,
  pitch: -55,
} as const;

/** Pakistan bounding box for point-in-bounds checks */
export const PK_BOUNDS = {
  minLat: 23.5,
  maxLat: 37.5,
  minLon: 60.8,
  maxLon: 77.8,
} as const;
