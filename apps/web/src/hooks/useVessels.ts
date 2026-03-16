// ============================================================
// useVessels.ts — Marine vessel tracking
// Polls /api/vessels every 30s
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const POLL_INTERVAL = 30_000;

export interface VesselData {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  speedKnots: number;
  headingDeg: number;
  courseOverGround: number;
  navStatus: string;
  vesselType: number;
  destination: string;
  lastUpdate: number;
}

export function useVessels() {
  const [vessels, setVessels] = useState<VesselData[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchVessels = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/vessels`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const v: VesselData[] = data.vessels || [];
      setVessels(v);
      setCount(v.length);
      setLoading(false);
      console.log(`[VESSELS] ${v.length} ships tracked`);
    } catch (err) {
      console.error('[VESSELS] Fetch error:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVessels();
    const interval = setInterval(fetchVessels, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchVessels]);

  return { vessels, count, loading };
}
