// ============================================================
// ARGUS Command Store — Unified Zustand State (V2)
// ============================================================

import { create } from 'zustand';

// ── Types ──

export type ViewMode = 'NORMAL' | 'NVG' | 'FLIR' | 'MONO' | 'CRT';

export type LayerCategory =
  | 'government'
  | 'military'
  | 'transport'
  | 'commercial'
  | 'education'
  | 'healthcare'
  | 'religious'
  | 'tourism'
  | 'industrial'
  | 'residential'
  | 'media'
  | 'flights'
  | 'cctv'
  | 'traffic'
  | 'sigint'
  | 'vessels'
  | 'weather'
  | 'population'
  | 'satellites'
  | 'landmarks'
  | 'border'
  | 'seismic'
  | 'incidents';

export interface FlightEntity {
  id: string;
  callsign: string;
  icao24: string;
  lat: number;
  lon: number;
  altitude: number;
  velocity: number;
  heading: number;
  verticalRate: number;
  onGround: boolean;
  source: 'opensky' | 'adsb' | 'both';
  isMilitary: boolean;
  squawk: string;
}

export interface LandmarkEntity {
  name: string;
  category: string;
  city: string;
  province: string;
  tier: string;
  lat: number;
  lng: number;
}

export interface CCTVEntity {
  id: string;
  location: string;
  lat: number;
  lng: number;
  status: 'ACTIVE' | 'OFFLINE' | 'SWEEP';
}

export interface VesselEntity {
  mmsi: number;
  name: string;
  type: number;
  typeName: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  course: number;
  destination?: string;
  timestamp: string;
}

export interface SatelliteEntity {
  name: string;
  noradId: string;
  category: string;
  altKm: number;
  velocityKms: number;
  isOverPakistan: boolean;
  lat: number;
  lon: number;
}

export type SelectedEntity =
  | { type: 'flight'; data: FlightEntity }
  | { type: 'landmark'; data: LandmarkEntity }
  | { type: 'cctv'; data: CCTVEntity }
  | { type: 'satellite'; data: SatelliteEntity }
  | { type: 'vessel'; data: VesselEntity }
  | null;

// ── Optics ──

export interface OpticsState {
  // Hollywood Camera Sliders (0-100)
  bloom: number;
  sharpen: number;
  contrast: number;
  brightness: number;
  saturation: number;
  gamma: number;
  vignette: number;
  aberration: number;
  grain: number;
  distortion: number;
  // UI & Filters
  tiers: number[]; // e.g. [1, 2, 3] indicating Tier 1, 2, 3
  hud: boolean;
  cleanUI: boolean;
}

// ── Store ──

interface CommandState {
  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Layer visibility
  layers: Record<LayerCategory, boolean>;
  toggleLayer: (layer: LayerCategory) => void;
  setLayerVisible: (layer: LayerCategory, visible: boolean) => void;

  // Entity selection
  selectedEntity: SelectedEntity;
  selectEntity: (entity: SelectedEntity) => void;
  clearSelection: () => void;

  // Camera state
  cameraAlt: number;
  mouseCoords: { lat: number; lng: number } | null;
  setCameraAlt: (alt: number) => void;
  setMouseCoords: (coords: { lat: number; lng: number } | null) => void;

  // System
  globeReady: boolean;
  setGlobeReady: (ready: boolean) => void;

  // Flight counts
  flightCount: number;
  militaryFlightCount: number;
  setFlightCounts: (total: number, military: number) => void;

  // Optics (V2)
  optics: OpticsState;
  setOptics: (patch: Partial<OpticsState>) => void;

  // Active category for locations bar (V2)
  activeCategory: LayerCategory | null;
  setActiveCategory: (cat: LayerCategory | null) => void;

  // Fly-to target (V2)
  flyToTarget: { lat: number; lng: number; name: string } | null;
  setFlyToTarget: (target: { lat: number; lng: number; name: string } | null) => void;

  // Browser Location
  browserLocation: { lat: number; lng: number } | null;
  setBrowserLocation: (loc: { lat: number; lng: number } | null) => void;

  // Command Palette Toggle
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;

  // Global UI Lock (Authentication)
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;

  // Real-time Tactical Alerts (from ADSB, etc.)
  tacticalAlerts: any[];
  addTacticalAlert: (alert: any) => void;

  // Cinematic Sequence Trigger
  triggerCinematicZoom: number;
  incrementCinematicZoom: () => void;

  // Layer counts (from data layer components)
  layerCounts: Record<string, number>;
  setLayerCount: (key: string, count: number) => void;

  // Entity selection aliases
  setSelectedEntity: (entity: SelectedEntity) => void;
}

export const DEFAULT_LAYERS: Record<LayerCategory, boolean> = {
  military: true,
  government: true,
  transport: true,
  commercial: true,
  healthcare: true,
  education: true,
  religious: true,
  tourism: true,
  industrial: true,
  residential: true,
  media: true,
  flights: true,
  cctv: false,
  traffic: false,
  sigint: false,
  vessels: true,
  weather: false,
  population: false,
  satellites: false,
  landmarks: true,
  border: true,
  seismic: false,
  incidents: false,
};

export const DEFAULT_OPTICS: OpticsState = {
  bloom: 10,
  sharpen: 19,
  contrast: 44,
  brightness: 39,
  saturation: 57,
  gamma: 51,
  vignette: 69,
  aberration: 0,
  grain: 46,
  distortion: 0,
  tiers: [1, 2, 3],
  hud: true,
  cleanUI: false,
};


export const useCommandStore = create<CommandState>((set) => ({
  viewMode: 'NORMAL',
  setViewMode: (mode) => set({ viewMode: mode }),

  layers: { ...DEFAULT_LAYERS },
  toggleLayer: (layer) =>
    set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
  setLayerVisible: (layer, visible) =>
    set((s) => ({ layers: { ...s.layers, [layer]: visible } })),

  selectedEntity: null,
  selectEntity: (entity) => set({ selectedEntity: entity }),
  clearSelection: () => set({ selectedEntity: null }),

  cameraAlt: 800_000,
  mouseCoords: null,
  setCameraAlt: (alt) => set({ cameraAlt: alt }),
  setMouseCoords: (coords) => set({ mouseCoords: coords }),

  globeReady: false,
  setGlobeReady: (ready) => set({ globeReady: ready }),

  flightCount: 0,
  militaryFlightCount: 0,
  setFlightCounts: (total, military) =>
    set({ flightCount: total, militaryFlightCount: military }),

  optics: { ...DEFAULT_OPTICS },
  setOptics: (patch) =>
    set((s) => ({ optics: { ...s.optics, ...patch } })),

  // V2: Active category
  activeCategory: null,
  setActiveCategory: (cat) => set({ activeCategory: cat }),

  // V2: Fly-to target
  flyToTarget: null,
  setFlyToTarget: (target) => set({ flyToTarget: target }),

  browserLocation: null,
  setBrowserLocation: (loc) => set({ browserLocation: loc }),

  paletteOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),

  isLocked: true, // starts locked until CommanderAuth finishes
  setIsLocked: (locked) => set({ isLocked: locked }),

  triggerCinematicZoom: 0,
  incrementCinematicZoom: () => set((state) => ({ triggerCinematicZoom: state.triggerCinematicZoom + 1 })),

  tacticalAlerts: [],
  addTacticalAlert: (alert) => set((s) => ({ tacticalAlerts: [alert, ...s.tacticalAlerts] })),

  layerCounts: {},
  setLayerCount: (key, count) =>
    set((s) => ({ layerCounts: { ...s.layerCounts, [key]: count } })),

  setSelectedEntity: (entity) => set({ selectedEntity: entity }),
}));
