// ============================================================
// useEntityFeed — SSE connection manager + mock fallback
// Hourly cycles. Appends monologues with timestamp dividers.
// Max 8 cycles in memory. Auto-scroll management.
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import type { CityId } from '@sentinel/shared';
import { getRandomMonologue } from '../lib/entityMonologues';
import { CITIES } from '../lib/cities';

export interface MonologueCycle {
  id: string;
  timestamp: number;
  text: string;
  isStreaming: boolean;
  aqi: number;
  temp: number;
}

interface UseEntityFeedReturn {
  cycles: MonologueCycle[];
  isStreaming: boolean;
  nextUpdateAt: number;
  secondsUntilNext: number;
  isLive: boolean;
}

const CYCLE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const CHAR_DELAY = 25;                      // ms per char for typewriter
const MAX_CYCLES = 8;

function makeId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function useEntityFeed(cityId: CityId): UseEntityFeedReturn {
  const [cycles, setCycles] = useState<MonologueCycle[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [nextUpdateAt, setNextUpdateAt] = useState(0);
  const [secondsUntilNext, setSecondsUntilNext] = useState(0);
  const [isLive, setIsLive] = useState(false);

  const abortRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // Stream text character-by-character (mock fallback)
  const streamMockCycle = useCallback((cityId: CityId) => {
    if (abortRef.current) return;

    const city = CITIES[cityId];
    const text = getRandomMonologue(cityId);
    const cycleId = makeId();

    const cycle: MonologueCycle = {
      id: cycleId,
      timestamp: Date.now(),
      text: '',
      isStreaming: true,
      aqi: city?.liveMetrics.aqiBaseValue ?? 150,
      temp: city?.liveMetrics.tempBase ?? 38,
    };

    setCycles((prev) => [...prev.slice(-(MAX_CYCLES - 1)), cycle]);
    setIsStreaming(true);
    setIsLive(false);

    let i = 0;
    const tick = () => {
      if (abortRef.current || i >= text.length) {
        setCycles((prev) =>
          prev.map((c) => (c.id === cycleId ? { ...c, text, isStreaming: false } : c))
        );
        setIsStreaming(false);
        setNextUpdateAt(Date.now() + CYCLE_INTERVAL_MS);
        return;
      }
      i++;
      setCycles((prev) =>
        prev.map((c) =>
          c.id === cycleId ? { ...c, text: text.substring(0, i) } : c
        )
      );
      timersRef.current.push(setTimeout(tick, CHAR_DELAY));
    };
    tick();
  }, []);

  // Try live SSE, fallback to mock
  const startNewCycle = useCallback(async (cityId: CityId) => {
    if (abortRef.current) return;

    // Try live API
    try {
      const resp = await fetch(`/api/entity/stream?city=${cityId}`, {
        signal: AbortSignal.timeout(3000),
      });

      if (resp.ok && resp.body) {
        const cycleId = makeId();
        const city = CITIES[cityId];
        const cycle: MonologueCycle = {
          id: cycleId,
          timestamp: Date.now(),
          text: '',
          isStreaming: true,
          aqi: city?.liveMetrics.aqiBaseValue ?? 150,
          temp: city?.liveMetrics.tempBase ?? 38,
        };
        setCycles((prev) => [...prev.slice(-(MAX_CYCLES - 1)), cycle]);
        setIsStreaming(true);
        setIsLive(true);

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done || abortRef.current) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  accumulated += data.text;
                  setCycles((prev) =>
                    prev.map((c) => (c.id === cycleId ? { ...c, text: accumulated } : c))
                  );
                }
                if (data.done) {
                  if (data.aqi) {
                    setCycles((prev) =>
                      prev.map((c) =>
                        c.id === cycleId
                          ? { ...c, isStreaming: false, aqi: data.aqi, temp: data.temp }
                          : c
                      )
                    );
                  } else {
                    setCycles((prev) =>
                      prev.map((c) => (c.id === cycleId ? { ...c, isStreaming: false } : c))
                    );
                  }
                  setIsStreaming(false);
                  setNextUpdateAt(Date.now() + CYCLE_INTERVAL_MS);
                  return;
                }
                if (data.error) {
                  accumulated += '\n[Feed interrupted. Will retry next cycle.]';
                  setCycles((prev) =>
                    prev.map((c) =>
                      c.id === cycleId ? { ...c, text: accumulated, isStreaming: false } : c
                    )
                  );
                  setIsStreaming(false);
                  setNextUpdateAt(Date.now() + CYCLE_INTERVAL_MS);
                  return;
                }
              } catch { /* ignore parse errors */ }
            }
          }
        }

        // If we got here, stream ended without done event
        setCycles((prev) =>
          prev.map((c) => (c.id === cycleId ? { ...c, isStreaming: false } : c))
        );
        setIsStreaming(false);
        setNextUpdateAt(Date.now() + CYCLE_INTERVAL_MS);
        return;
      }
    } catch {
      // API not available — use mock fallback
    }

    streamMockCycle(cityId);
  }, [streamMockCycle]);

  // Start cycle on mount and city change
  useEffect(() => {
    abortRef.current = false;
    clearTimers();
    setCycles([]);
    setIsStreaming(false);

    // Small delay to let component mount
    const t = setTimeout(() => startNewCycle(cityId), 300);
    timersRef.current.push(t);

    return () => {
      abortRef.current = true;
      clearTimers();
    };
  }, [cityId, startNewCycle, clearTimers]);

  // Schedule next cycle when timer elapses
  useEffect(() => {
    if (nextUpdateAt === 0 || isStreaming) return;

    const delay = nextUpdateAt - Date.now();
    if (delay <= 0) return;

    const t = setTimeout(() => {
      if (!abortRef.current) startNewCycle(cityId);
    }, delay);
    timersRef.current.push(t);

    return () => clearTimeout(t);
  }, [nextUpdateAt, isStreaming, cityId, startNewCycle]);

  // Countdown timer
  useEffect(() => {
    const iv = setInterval(() => {
      if (nextUpdateAt > 0) {
        const secs = Math.max(0, Math.ceil((nextUpdateAt - Date.now()) / 1000));
        setSecondsUntilNext(secs);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [nextUpdateAt]);

  return { cycles, isStreaming, nextUpdateAt, secondsUntilNext, isLive };
}
