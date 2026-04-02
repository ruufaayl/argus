// ============================================================
// useFlights.ts — Real-time ADS-B flight tracking
// Polls /api/flights every 15s, smoothly interpolates positions
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCommandStore } from '../stores/commandStore';
import type { FlightEntity } from '../stores/commandStore';
import { audioService } from '../services/audioService';

const API = import.meta.env.VITE_API_URL ?? '';
const POLL_INTERVAL = 15_000;

interface RawFlight {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altitudeFt: number;
  speedKts: number;
  headingDeg: number;
  verticalRate: number;
  onGround: boolean;
  type: string;
  registration: string;
  source: 'adsb' | 'opensky' | 'both';
  isMilitary: boolean;
  lastSeen: number;
}

interface InterpolatedFlight extends FlightEntity {
  targetLat: number;
  targetLon: number;
  baseLat: number;
  baseLon: number;
  rawSpeedKts: number;
  rawHeadingDeg: number;
}

function rawToEntity(f: RawFlight): InterpolatedFlight {
  return {
    id: f.icao24,
    icao24: f.icao24,
    callsign: f.callsign,
    lat: f.lat,
    lon: f.lon,
    altitude: f.altitudeFt * 0.3048, // ft → m
    velocity: f.speedKts * 0.514444, // kts → m/s
    heading: f.headingDeg,
    verticalRate: f.verticalRate,
    onGround: f.onGround,
    source: f.source,
    isMilitary: f.isMilitary,
    squawk: '',
    // Interpolation fields
    targetLat: f.lat,
    targetLon: f.lon,
    baseLat: f.lat,
    baseLon: f.lon,
    rawSpeedKts: f.speedKts,
    rawHeadingDeg: f.headingDeg,
  };
}

export function useFlights() {
  const [flights, setFlights] = useState<FlightEntity[]>([]);
  const [count, setCount] = useState(0);
  const [militaryCount, setMilitaryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const interpolatedRef = useRef<Map<string, InterpolatedFlight>>(new Map());
  const lastFetchTimeRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const prevHexesRef = useRef<Set<string>>(new Set());

  const layers = useCommandStore((s) => s.layers);
  const isLocked = useCommandStore((s) => s.isLocked);
  const browserLocation = useCommandStore((s) => s.browserLocation);
  const setFlightCounts = useCommandStore((s) => s.setFlightCounts);

  const fetchFlights = useCallback(async () => {
    if (!layers.flights) return;

    try {
      const params = new URLSearchParams();
      if (browserLocation) {
        params.set('lat', browserLocation.lat.toString());
        params.set('lon', browserLocation.lng.toString());
      }

      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API}/api/flights${query}`, {
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const rawFlights: RawFlight[] = data.flights || [];
      lastFetchTimeRef.current = Date.now();

      const map = interpolatedRef.current;
      const currentHexes = new Set<string>();

      rawFlights.forEach((rf) => {
        currentHexes.add(rf.icao24);
        const existing = map.get(rf.icao24);
        if (existing) {
          // Update targets for interpolation
          existing.baseLat = existing.lat;
          existing.baseLon = existing.lon;
          existing.targetLat = rf.lat;
          existing.targetLon = rf.lon;
          existing.altitude = rf.altitudeFt * 0.3048;
          existing.velocity = rf.speedKts * 0.514444;
          existing.heading = rf.headingDeg;
          existing.verticalRate = rf.verticalRate;
          existing.callsign = rf.callsign;
          existing.isMilitary = rf.isMilitary;
          existing.source = rf.source;
          existing.rawSpeedKts = rf.speedKts;
          existing.rawHeadingDeg = rf.headingDeg;
        } else {
          map.set(rf.icao24, rawToEntity(rf));
        }
      });

      // Remove gone flights
      for (const key of map.keys()) {
        if (!currentHexes.has(key)) map.delete(key);
      }

      const allFlights = Array.from(map.values());
      const milCount = allFlights.filter((f) => f.isMilitary).length;

      // New aircraft detection
      if (prevHexesRef.current.size > 0) {
        let newCount = 0;
        let topCallsign = '';
        allFlights.forEach((f) => {
          if (!prevHexesRef.current.has(f.icao24)) {
            newCount++;
            if (f.isMilitary) topCallsign = f.callsign || 'TAC-AIRCRAFT';
            else if (!topCallsign && f.callsign) topCallsign = f.callsign;
          }
        });
        if (newCount > 0 && topCallsign) {
          audioService.playRadarSweep();
          useCommandStore.getState().addTacticalAlert({
            priority: milCount > 0 ? 'critical' : 'high',
            title: `RADAR CONTACT: ${topCallsign}`,
            detail: `${newCount} new transponder${newCount > 1 ? 's' : ''} entering monitored airspace.`,
            time: 'Just now',
            location: 'Pakistan Airspace',
            lat: 30.37,
            lng: 69.34,
          });
        }
      }
      prevHexesRef.current = currentHexes;

      setFlights(allFlights);
      setCount(allFlights.length);
      setMilitaryCount(milCount);
      setFlightCounts(allFlights.length, milCount);
      setLoading(false);
      console.log(`[FLIGHTS] ${allFlights.length} tracks (${milCount} military)`);
    } catch (err) {
      console.error('[FLIGHTS] Fetch error:', err);
      setLoading(false);
    }
  }, [layers.flights, setFlightCounts, browserLocation]);

  // Interpolation loop — makes aircraft glide between updates
  useEffect(() => {
    let running = true;

    const animate = () => {
      if (!running) return;
      const elapsed = Date.now() - lastFetchTimeRef.current;
      const t = Math.min(elapsed / POLL_INTERVAL, 1);

      const map = interpolatedRef.current;
      let changed = false;
      map.forEach((f) => {
        const newLat = f.baseLat + (f.targetLat - f.baseLat) * t;
        const newLon = f.baseLon + (f.targetLon - f.baseLon) * t;
        if (Math.abs(newLat - f.lat) > 0.0001 || Math.abs(newLon - f.lon) > 0.0001) {
          f.lat = newLat;
          f.lon = newLon;
          changed = true;
        }
      });

      if (changed) {
        setFlights(Array.from(map.values()));
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Polling
  useEffect(() => {
    if (!layers.flights || isLocked) {
      setFlights([]);
      setCount(0);
      setMilitaryCount(0);
      return;
    }

    fetchFlights();
    const interval = setInterval(fetchFlights, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchFlights, layers.flights, isLocked]);

  return { flights, count, militaryCount, loading };
}
