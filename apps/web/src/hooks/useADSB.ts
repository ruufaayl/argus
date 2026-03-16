// ============================================================
// useADSB.ts — Real-time ADS-B flight tracking
// Routes through /api/flights backend proxy (CORS bypass)
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCommandStore, FlightEntity } from '../stores/commandStore';
import { audioService } from '../services/audioService';

export interface ADSBPlane {
  hex: string;
  flight: string;
  alt_baro?: number | 'ground';
  lat: number;
  lon: number;
  track?: number;
  speed?: number;
  category?: string;
  type?: string;
  military?: boolean;
  squawk?: string;
}

const POLL_INTERVAL = 8000; // 8-second polling

function mapToFlightEntity(p: ADSBPlane): FlightEntity {
  const isMil = !!p.military || (p.category && p.category.includes('military')) || false;
  return {
    id: p.hex,
    icao24: p.hex,
    callsign: p.flight ? p.flight.trim() : p.hex.toUpperCase(),
    lat: typeof p.lat === 'number' ? p.lat : 0,
    lon: typeof p.lon === 'number' ? p.lon : 0,
    altitude: typeof p.alt_baro === 'number' ? p.alt_baro * 0.3048 : 0, // ft → m
    velocity: p.speed ? p.speed * 0.514444 : 0, // knots → m/s
    heading: p.track || 0,
    verticalRate: 0,
    onGround: p.alt_baro === 'ground',
    source: 'adsb',
    isMilitary: isMil,
    squawk: p.squawk || '',
  } as FlightEntity;
}

export function useADSB() {
  const [flights, setFlights] = useState<FlightEntity[]>([]);
  const prevPlanes = useRef<Set<string>>(new Set());
  const layers = useCommandStore((s) => s.layers);
  const isLocked = useCommandStore((s) => s.isLocked);
  const setFlightCounts = useCommandStore((s) => s.setFlightCounts);

  const fetchFlights = useCallback(async () => {
    if (!layers.flights) return;
    
    try {
      // Primary: backend proxy (bypasses CORS)
      const res = await fetch('/api/flights', {
        signal: AbortSignal.timeout(10000),
      });
      
      if (!res.ok) throw new Error(`Flight proxy: ${res.status}`);
      
      const data = await res.json();
      const rawPlanes: ADSBPlane[] = data.ac || [];
      
      const mapped = rawPlanes
        .map(mapToFlightEntity)
        .filter(f => f.lat !== 0 && f.lon !== 0 && !f.onGround);

      // Prioritize military, keep top 120
      mapped.sort((a, b) => {
        if (a.isMilitary && !b.isMilitary) return -1;
        if (!a.isMilitary && b.isMilitary) return 1;
        return 0;
      });
      
      const limited = mapped.slice(0, 120);
      const milCount = limited.filter(f => f.isMilitary).length;

      // New aircraft detection → tactical alert
      const currentHexes = new Set(limited.map(f => f.icao24));
      if (prevPlanes.current.size > 0) {
        let newCount = 0;
        let topCallsign = '';
        limited.forEach(f => {
          if (!prevPlanes.current.has(f.icao24)) {
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
            detail: `${newCount} new transponder${newCount > 1 ? 's' : ''} entering monitored airspace. ${milCount > 0 ? `${milCount} military signature detected.` : 'Classification pending.'}`,
            time: 'Just now',
            location: 'Pakistan Airspace',
            lat: 30.37,
            lng: 69.34,
          });
        }
      }

      prevPlanes.current = currentHexes;
      setFlights(limited);
      setFlightCounts(limited.length, milCount);
      console.log(`[ADSB] ${limited.length} flights loaded (${milCount} military)`);

    } catch (err) {
      console.error('[ADSB] Fetch error:', err);
    }
  }, [layers.flights, setFlightCounts]);

  useEffect(() => {
    if (!layers.flights) {
      setFlights([]);
      return;
    }

    // Start fetching when unlocked
    if (!isLocked) {
      fetchFlights();
      const interval = setInterval(fetchFlights, POLL_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [fetchFlights, layers.flights, isLocked]);

  return flights;
}
