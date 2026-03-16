// ============================================================
// useWeather.ts — Weather radar data from RainViewer
// Free API, no key required. Updates every 10 min.
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json';
const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export interface WeatherFrame {
  path: string;
  time: number;
}

export function useWeather() {
  const [radarPath, setRadarPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRadar = useCallback(async () => {
    try {
      const res = await fetch(RAINVIEWER_API, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`RainViewer: ${res.status}`);
      const data = await res.json();

      const frames = data?.radar?.past;
      if (frames && frames.length > 0) {
        const latest = frames[frames.length - 1];
        setRadarPath(latest.path);
        console.log('[WEATHER] Radar frame loaded:', latest.path);
      }
      setLoading(false);
    } catch (err) {
      console.error('[WEATHER] Fetch error:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRadar();
    const interval = setInterval(fetchRadar, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchRadar]);

  return { radarPath, loading };
}
