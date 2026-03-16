export interface Flight {
  id: string;
  icao24: string;
  callsign: string;
  // Raw/Mock base
  longitude: number;
  latitude: number;
  altitude: number;
  velocity: number;
  heading: number;
  verticalRate: number;
  onGround: boolean;
  
  // Required for UI logic
  originCountry: string;
  icaoType: string;
  lastSeen: number;

  // Optional/Computed
  isMilitary?: boolean;
  lat?: number;
  lon?: number;
  squawk?: string;
}

export interface FlightDetail extends Flight {
  altitudeFt: number;
  velocityKnots: number;
  verticalStatus: string;
  trailPositions: [number, number, number][];
  source?: string;
}


