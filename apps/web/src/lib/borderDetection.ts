// ============================================================
// ARGUS — Border Crossing Detection Engine
// Real-time point-in-polygon test for Pakistan's actual border.
// Uses ray-casting algorithm on GeoJSON polygon coordinates.
// ============================================================

// ── Types ───────────────────────────────────────────────────

export interface BorderGeometry {
  rings:  [number, number][][];  // GeoJSON [lon, lat] rings
  bbox: {
    minLat: number; maxLat: number;
    minLon: number; maxLon: number;
  };
}

export interface BorderSector {
  name:        string;
  direction:   string;
  sensitivity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'INFO';
  description: string;
}

export interface CrossingEvent {
  id:            string;
  type:          'ENTRY' | 'EXIT';
  icao24:        string;
  callsign:      string;
  lat:           number;
  lon:           number;
  altitudeFt:    number;
  speedKts:      number;
  headingDeg:    number;
  aircraftType:  string;
  sector:        BorderSector;
  timestamp:     Date;
  flightOrigin?: string;
  airline?:      string;
  isCommercial:  boolean;
  isMilitary:    boolean;
  isUnidentified: boolean;
  threatLevel:   'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'INFO';
}

// ── Pakistan bbox — fast check before expensive polygon test ──

export function isNearPakistan(lat: number, lon: number): boolean {
  return lat >= 22.0 && lat <= 38.5 && lon >= 59.0 && lon <= 79.0;
}

// ── Ray-casting point-in-polygon ─────────────────────────────

function pointInPolygon(
  lat: number,
  lon: number,
  ring: [number, number][]
): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i]; // xi=lon, yi=lat
    const [xj, yj] = ring[j];
    if (
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function isInsidePakistan(
  lat: number,
  lon: number,
  geometry: BorderGeometry
): boolean {
  if (!isNearPakistan(lat, lon)) return false;
  return geometry.rings.some(ring => pointInPolygon(lat, lon, ring));
}

// ── Border sector classification ─────────────────────────────

export function getBorderSector(
  lat: number,
  lon: number
): BorderSector {
  // LOC — Kashmir
  if (lat > 33.5 && lon > 73.0 && lon < 76.0) return {
    name: 'LINE OF CONTROL — KASHMIR',
    direction: 'NORTHEAST',
    sensitivity: 'CRITICAL',
    description: 'LOC crossing — Kashmir disputed territory',
  };

  // Indian border (East)
  if (lon > 73.5 && lat < 35.0) {
    if (lat > 32.0) return {
      name: 'INDIA — PUNJAB SECTOR',
      direction: 'EAST',
      sensitivity: 'CRITICAL',
      description: 'Indian border crossing — Punjab region',
    };
    return {
      name: 'INDIA — SINDH/RAJASTHAN SECTOR',
      direction: 'EAST',
      sensitivity: 'HIGH',
      description: 'Indian border crossing — Sindh/Rajasthan',
    };
  }

  // Afghan border (NW)
  if (lon < 70.0 && lat > 32.0) {
    if (lat > 36.0) return {
      name: 'AFGHANISTAN — CHITRAL SECTOR',
      direction: 'NORTHWEST',
      sensitivity: 'HIGH',
      description: 'Afghan border — northern mountain passes',
    };
    return {
      name: 'AFGHANISTAN — DURAND LINE',
      direction: 'NORTHWEST',
      sensitivity: 'HIGH',
      description: 'Durand Line crossing — FATA region',
    };
  }

  // Iranian border (West)
  if (lon < 63.0) return {
    name: 'IRAN — BALOCHISTAN SECTOR',
    direction: 'WEST',
    sensitivity: 'MODERATE',
    description: 'Iranian border crossing — Balochistan',
  };

  // Arabian Sea / Coast
  if (lat < 25.5) return {
    name: 'ARABIAN SEA — COASTAL FIR',
    direction: 'SOUTH',
    sensitivity: 'MODERATE',
    description: 'Entering Pakistan coastal airspace',
  };

  // China border (far north)
  if (lat > 36.5) return {
    name: 'CHINA — KARAKORAM SECTOR',
    direction: 'NORTH',
    sensitivity: 'LOW',
    description: 'Chinese border — Karakoram region',
  };

  return {
    name: 'PAKISTAN FIR',
    direction: 'UNKNOWN',
    sensitivity: 'INFO',
    description: 'Pakistan Flight Information Region',
  };
}

// ── Airline derivation from ICAO callsign prefix ─────────────

const ICAO_AIRLINES: Record<string, string> = {
  'PIA': 'Pakistan International Airlines',
  'THY': 'Turkish Airlines',
  'UAE': 'Emirates',
  'AFR': 'Air France',
  'BAW': 'British Airways',
  'DLH': 'Lufthansa',
  'SVA': 'Saudi Arabian Airlines',
  'ETH': 'Ethiopian Airlines',
  'QTR': 'Qatar Airways',
  'GFA': 'Gulf Air',
  'FDB': 'flydubai',
  'AXB': 'Air Arabia',
  'ABY': 'Air Arabia',
  'IGO': 'IndiGo',
  'AIC': 'Air India',
  'SEJ': 'SpiceJet',
  'THA': 'Thai Airways',
  'CPA': 'Cathay Pacific',
  'SIA': 'Singapore Airlines',
  'MAS': 'Malaysia Airlines',
  'CCA': 'Air China',
  'CSN': 'China Southern',
  'CES': 'China Eastern',
  'AFL': 'Aeroflot',
};

export function deriveAirlineFromCallsign(
  callsign: string
): string | undefined {
  if (!callsign) return undefined;
  const prefix = callsign.trim().slice(0, 3).toUpperCase();
  return ICAO_AIRLINES[prefix];
}

// ── Threat level assessment ──────────────────────────────────

export function assessThreatLevel(
  event: Omit<CrossingEvent, 'threatLevel'>
): CrossingEvent['threatLevel'] {
  if (event.isUnidentified && event.sector.sensitivity === 'CRITICAL')
    return 'CRITICAL';
  if (event.isMilitary && event.sector.sensitivity === 'CRITICAL')
    return 'CRITICAL';
  if (event.isUnidentified)
    return 'HIGH';
  if (event.isMilitary)
    return 'HIGH';
  if (event.sector.sensitivity === 'CRITICAL' && event.isCommercial)
    return 'MODERATE';
  if (event.altitudeFt < 5000 && event.type === 'ENTRY')
    return 'HIGH';
  return 'INFO';
}

// ── Commercial corridor check ────────────────────────────────

export function isOnEstablishedCorridor(
  lat: number,
  lon: number,
  altitudeFt: number
): boolean {
  if (altitudeFt < 20000) return false;
  // Gulf corridor (SW entry)
  if (lon >= 61 && lon <= 65 && lat >= 24 && lat <= 27 && altitudeFt >= 30000) return true;
  // European corridor (W entry via Iran)
  if (lon >= 60 && lon <= 63 && lat >= 27 && lat <= 32 && altitudeFt >= 30000) return true;
  // Indian corridor (E entry)
  if (lon >= 73 && lon <= 76 && lat >= 28 && lat <= 33 && altitudeFt >= 28000) return true;
  return false;
}
