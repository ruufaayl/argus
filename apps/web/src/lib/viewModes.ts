// ============================================================
// viewModes.ts — CSS-Only View Mode Engine (V3)
// NO GLSL shaders. Globe.tsx applies filters to #cesiumContainer.
// This module is kept for backwards compatibility but is now
// a pure CSS filter function. Globe.tsx handles it internally.
// ============================================================

export type ViewMode = 'NORMAL' | 'NVG' | 'FLIR' | 'MONO' | 'CRT';

const CSS_FILTERS: Record<ViewMode, string> = {
  NORMAL: 'none',
  NVG:    'brightness(1.4) contrast(1.3) hue-rotate(85deg) saturate(3) sepia(0.8)',
  FLIR:   'brightness(1.2) contrast(1.8) saturate(0) sepia(1) hue-rotate(10deg)',
  MONO:   'grayscale(1) contrast(1.4) brightness(0.9)',
  CRT:    'contrast(1.1) brightness(0.9) saturate(0.85)',
};

/**
 * Apply a view mode CSS filter to a container element.
 * No GLSL shaders are used — pure CSS only.
 * The optional viewer parameter is accepted for API compatibility.
 */
export function applyViewMode(
  container: HTMLElement | null,
  mode: ViewMode,
  _viewer?: any
): void {
  if (!container) return;
  container.style.filter = CSS_FILTERS[mode] ?? 'none';
}
