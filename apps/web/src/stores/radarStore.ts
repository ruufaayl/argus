// ============================================================
// ARGUS — Radar Store (Zustand)
// Tracks aircraft inside/outside Pakistan border.
// Stores crossing events (ENTRY/EXIT) for last 50 events.
// ============================================================

import { create } from 'zustand';
import type { CrossingEvent, BorderGeometry } from '../lib/borderDetection';

interface AircraftState {
  icao24:   string;
  inside:   boolean;
  lat:      number;
  lon:      number;
  lastSeen: number;
}

interface RadarStore {
  aircraftStates:   Map<string, AircraftState>;
  crossingEvents:   CrossingEvent[];
  unreadCount:      number;
  borderGeometry:   BorderGeometry | null;

  setBorderGeometry:   (g: BorderGeometry) => void;
  updateAircraftState: (icao24: string, state: AircraftState) => void;
  addCrossingEvent:    (event: CrossingEvent) => void;
  markAllRead:         () => void;
  clearEvents:         () => void;
}

export const useRadarStore = create<RadarStore>((set, get) => ({
  aircraftStates:  new Map(),
  crossingEvents:  [],
  unreadCount:     0,
  borderGeometry:  null,

  setBorderGeometry: (geometry) => set({ borderGeometry: geometry }),

  updateAircraftState: (icao24, state) => {
    const map = new Map(get().aircraftStates);
    map.set(icao24, state);
    set({ aircraftStates: map });
  },

  addCrossingEvent: (event) =>
    set((s) => ({
      crossingEvents: [event, ...s.crossingEvents].slice(0, 50),
      unreadCount: s.unreadCount + 1,
    })),

  markAllRead: () => set({ unreadCount: 0 }),

  clearEvents: () => set({ crossingEvents: [], unreadCount: 0 }),
}));
