// ============================================================
// useCityData — Unified hook for Phase 4 Data Fusion polling
// Periodically fetches aggregated Signals and City Stress
// ============================================================

import { useState, useEffect, useRef } from 'react';
import type { CityId, Signal, StressScore } from '@sentinel/shared';

export interface CityDataState {
  signals: Signal[];
  stress: StressScore | null;
  isLoading: boolean;
  lastUpdated: number;
}

const POLLING_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export function useCityData(cityId: CityId): CityDataState {
  const [data, setData] = useState<CityDataState>({
    signals: [],
    stress: null,
    isLoading: true,
    lastUpdated: 0,
  });

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchAll() {
      if (!mounted) return;
      
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      setData(d => ({ ...d, isLoading: true }));

      try {
        // Fetch in parallel
        const [signalsRes, stressRes] = await Promise.all([
          fetch(`/api/signals?city=${cityId}`, { signal }).then(r => r.json() as Promise<{ signals: Signal[] }>).catch(() => null),
          fetch(`/api/stress?city=${cityId}`, { signal }).then(r => r.json() as Promise<StressScore>).catch(() => null),
        ]);

        if (mounted && !signal.aborted) {
          setData({
            signals: signalsRes?.signals || [],
            stress: stressRes || null,
            isLoading: false,
            lastUpdated: Date.now()
          });
        }
      } catch (err: any) {
        if (err.name !== 'AbortError' && mounted) {
          console.error('[CityData] Polling failed:', err);
          setData(d => ({ ...d, isLoading: false }));
        }
      }
    }

    // Immediate initial fetch
    fetchAll();

    // Set polling interval
    const intervalId = setInterval(fetchAll, POLLING_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [cityId]);

  return data;
}
