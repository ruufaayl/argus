// ============================================================
// cityStore — City + map mode state
// ============================================================

import { create } from 'zustand';
import type { CityId, AltitudeZone } from '@argus/shared';

interface CityState {
  currentCity: CityId;
  isClassifiedMode: boolean;
  cameraAltitude: number;
  currentZone: AltitudeZone;
  isNightMode: boolean;
  mapMode: '3d' | '2d';

  setCity: (city: CityId) => void;
  toggleMode: () => void;
  updateCamera: (altitude: number, zone: AltitudeZone) => void;
  toggleNightMode: () => void;
  setMapMode: (mode: '3d' | '2d') => void;
}

export const useCityStore = create<CityState>((set) => ({
  currentCity: 'karachi',
  isClassifiedMode: false,
  cameraAltitude: 2_500_000,
  currentZone: 'SPACE',
  isNightMode: false,
  mapMode: '3d',

  setCity: (city) => set({ currentCity: city }),
  toggleMode: () => set((s) => ({ isClassifiedMode: !s.isClassifiedMode })),
  updateCamera: (altitude, zone) => set({ cameraAltitude: altitude, currentZone: zone }),
  toggleNightMode: () => set((s) => ({ isNightMode: !s.isNightMode })),
  setMapMode: (mode) => set({ mapMode: mode }),
}));
