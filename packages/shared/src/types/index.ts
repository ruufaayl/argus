// ============================================================
// Pakistan Sentinel — Shared Type Definitions
// ============================================================

/** The 4 target cities */
export type CityId = 'karachi' | 'lahore' | 'islamabad' | 'rawalpindi';

/** Altitude zone — drives what layers/UI are visible */
export type AltitudeZone =
  | 'SPACE'
  | 'APPROACH'
  | 'COUNTRY'
  | 'CITY'
  | 'DISTRICT'
  | 'STREET'
  | 'GROUND';

/** Application mode */
export type AppMode = 'PUBLIC' | 'CLASSIFIED';

/** Signal severity levels */
export type SignalSeverity = 'info' | 'warning' | 'critical';

/** Signal source types */
export type SignalSource = 'aqi' | 'traffic' | 'power' | 'water' | 'news' | 'weather';

/** Geographic coordinates */
export interface Coordinates {
  lng: number;
  lat: number;
}

/** Camera view parameters */
export interface CameraView {
  zoom: number;
  pitch: number;
  bearing: number;
  altitude: number;
}

/** City entity AI personality */
export interface EntityPersonality {
  tone: string;
  openingLine: string;
  voiceLines: string[];
}

/** Base metric values for a city */
export interface CityMetrics {
  aqiBaseValue: number;
  tempBase: number;
  gridStressBase: number;
  stressScoreBase: number;
}

/** Full city configuration */
export interface CityConfig {
  id: CityId;
  name: string;
  shortCode: string;
  division: string;
  population: string;
  coordinates: Coordinates;
  defaultView: CameraView;
  entityPersonality: EntityPersonality;
  liveMetrics: CityMetrics;
}

/** A single signal from the intelligence feed */
export interface Signal {
  id: string;
  cityId: CityId;
  timestamp: number;
  source: SignalSource;
  severity: SignalSeverity;
  title: string;
  detail: string;
  coordinates?: [number, number];
  district?: string;
  metadata: Record<string, unknown>;
}

/** Live flight data */
export interface Flight {
  icao24: string;
  callsign: string;
  longitude: number;
  latitude: number;
  altitude: number;
  velocity: number;
  heading: number;
  verticalRate: number;
  onGround: boolean;
}

/** City stress score breakdown */
export interface StressBreakdown {
  aqi: number;
  heat: number;
  grid: number;
  signals: number;
}

/** Complete stress score response */
export interface StressScore {
  score: number;
  breakdown: StressBreakdown;
}

/** API health check response */
export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  environment: string;
}
