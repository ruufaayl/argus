// ============================================================
// ARGUS — Vision Gear Store (Zustand)
// Controls all CSS-based visual adjustments to the globe.
// Each slider maps to a CSS filter property applied to
// the #cesiumContainer div. No GLSL shaders are used.
// ============================================================

import { create } from 'zustand';

export interface VisionState {
  lightBleed:     number;  // 0-100, default 10  → bloom.contrast
  opticClarity:   number;  // 0-100, default 50  → not a CSS filter (visual only)
  signalContrast: number;  // 0-100, default 50  → CSS contrast()
  exposure:       number;  // 0-100, default 50  → CSS brightness()
  spectrum:       number;  // 0-100, default 50  → CSS saturate()
  sensorGamma:    number;  // 0-100, default 50  → pseudo-gamma via brightness curve
  lensShadow:     number;  // 0-100, default 35  → vignette overlay opacity
  staticNoise:    number;  // 0-100, default 0   → noise overlay opacity
  lensDrift:      number;  // 0-100, default 0   → chromatic shift (CSS only)
  opticWarp:      number;  // 0-100, default 0   → reserved
}

export interface VisionActions {
  setSetting: (key: keyof VisionState, value: number) => void;
  resetAll: () => void;
}

export const VISION_DEFAULTS: VisionState = {
  lightBleed:     10,
  opticClarity:   50,
  signalContrast: 50,
  exposure:       50,
  spectrum:       50,
  sensorGamma:    50,
  lensShadow:     35,
  staticNoise:    0,
  lensDrift:      0,
  opticWarp:      0,
};

export const useVisionStore = create<VisionState & VisionActions>((set) => ({
  ...VISION_DEFAULTS,

  setSetting: (key, value) => set({ [key]: value }),

  resetAll: () => set({ ...VISION_DEFAULTS }),
}));
