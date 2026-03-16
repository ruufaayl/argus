// ============================================================
// Color Ramps — Data Visualization Color Scales
// ============================================================

/** AQI color scale (US EPA standard) */
export const AQI_COLORS = {
  good:                [0, 228, 0],       // 0-50
  moderate:            [255, 255, 0],     // 51-100
  unhealthySensitive:  [255, 126, 0],     // 101-150
  unhealthy:           [255, 0, 0],       // 151-200
  veryUnhealthy:       [143, 63, 151],    // 201-300
  hazardous:           [126, 0, 35],      // 301-500
} as const;

/** Get AQI color as [r, g, b] for a given AQI value */
export function getAqiColor(aqi: number): [number, number, number] {
  if (aqi <= 50) return [0, 228, 0];
  if (aqi <= 100) return [255, 255, 0];
  if (aqi <= 150) return [255, 126, 0];
  if (aqi <= 200) return [255, 0, 0];
  if (aqi <= 300) return [143, 63, 151];
  return [126, 0, 35];
}

/** Get AQI category label */
export function getAqiCategory(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

/** Temperature color scale (20°C → 50°C) */
export function getTempColor(tempC: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, (tempC - 20) / 30));
  // Blue → Yellow → Red gradient
  const r = Math.round(t < 0.5 ? t * 2 * 255 : 255);
  const g = Math.round(t < 0.5 ? 200 + t * 110 : 255 * (1 - (t - 0.5) * 2));
  const b = Math.round(t < 0.5 ? 255 * (1 - t * 2) : 0);
  return [r, g, b];
}

/** Population density color scale */
export function getPopulationColor(density: number, maxDensity: number): [number, number, number, number] {
  const t = Math.min(1, density / maxDensity);
  // Transparent cyan → opaque magenta
  return [
    Math.round(0 + t * 200),
    Math.round(212 * (1 - t * 0.6)),
    Math.round(255 * (1 - t * 0.3)),
    Math.round(40 + t * 180),
  ];
}

/** Stress score color (0-10) */
export function getStressColor(score: number): string {
  if (score < 3) return 'var(--color-accent-green)';
  if (score < 5) return 'var(--color-accent-cyan)';
  if (score < 7) return 'var(--color-accent-amber)';
  return 'var(--color-accent-red)';
}
