// ============================================================
// mockFlights — Realistic mock flights with aircraft types
// ============================================================

import type { CityId } from '@sentinel/shared';
import type { Flight, FlightDetail } from '../types/flight';

const CITY_BOUNDS: Record<CityId, { lomin: number; lamin: number; lomax: number; lamax: number }> = {
  karachi:    { lomin: 66.8, lamin: 24.7, lomax: 67.3, lamax: 25.1 },
  lahore:     { lomin: 74.1, lamin: 31.3, lomax: 74.6, lamax: 31.7 },
  islamabad:  { lomin: 72.8, lamin: 33.5, lomax: 73.3, lamax: 33.9 },
  rawalpindi: { lomin: 72.9, lamin: 33.4, lomax: 73.2, lamax: 33.7 },
};

const FLIGHTS_TEMPLATE: Array<{ callsign: string; type: string; country: string }> = [
  { callsign: 'PK301', type: 'A320', country: 'Pakistan' },
  { callsign: 'PK205', type: 'B788', country: 'Pakistan' },
  { callsign: 'PK370', type: 'A319', country: 'Pakistan' },
  { callsign: 'SV720', type: 'A321', country: 'Saudi Arabia' },
  { callsign: 'EK612', type: 'A380', country: 'United Arab Emirates' },
  { callsign: 'QR628', type: 'B788', country: 'Qatar' },
  { callsign: 'TK714', type: 'A321', country: 'Turkey' },
  { callsign: 'PA402', type: 'AT75', country: 'Pakistan' },
  { callsign: 'GF770', type: 'A320', country: 'Bahrain' },
  { callsign: 'WY344', type: 'B788', country: 'Oman' },
  { callsign: 'PK852', type: 'B747', country: 'Pakistan' },
  { callsign: 'CX890', type: 'A318', country: 'Hong Kong' },
];

function randBetween(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function generateMockFlights(cityId: CityId): Flight[] {
  const b = CITY_BOUNDS[cityId];
  if (!b) return [];

  return FLIGHTS_TEMPLATE.map((tpl) => {
    const id = Math.random().toString(16).substring(2, 8);
    return {
      id: id,
      icao24: id,
      callsign: tpl.callsign,
      longitude: randBetween(b.lomin, b.lomax),
      latitude: randBetween(b.lamin, b.lamax),
      altitude: randBetween(2000, 12000),
      velocity: randBetween(80, 260),
      heading: randBetween(0, 360),
      verticalRate: randBetween(-3, 3),
      onGround: false,
      originCountry: tpl.country,
      icaoType: tpl.type,
      lastSeen: Date.now() / 1000,
    };
  });

}

export function toFlightDetail(f: Flight, trail: [number, number, number][]): FlightDetail {
  return {
    ...f,
    altitudeFt: Math.round(f.altitude * 3.28084),
    velocityKnots: Math.round(f.velocity * 1.94384),
    verticalStatus: f.verticalRate > 0.5 ? 'climbing' : f.verticalRate < -0.5 ? 'descending' : 'level',
    trailPositions: trail,
  };
}

export function interpolateFlights(flights: Flight[], dt: number): Flight[] {
  return flights.map((f) => {
    const hRad = (f.heading * Math.PI) / 180;
    const dDeg = (f.velocity * dt) / 111320;
    return {
      ...f,
      longitude: f.longitude + dDeg * Math.sin(hRad),
      latitude: f.latitude + dDeg * Math.cos(hRad),
      altitude: Math.max(200, f.altitude + f.verticalRate * dt),
      heading: f.heading + randBetween(-0.3, 0.3),
    };
  });
}
