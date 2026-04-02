// ============================================================
// usePlayback — Side-effect hook that drives timeline playback
// Subscribes to timelineStore and advances currentTime via rAF
// ============================================================

import { useEffect, useRef } from 'react';
import { useTimelineStore } from '../stores/timelineStore';

export function usePlayback(): void {
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const playbackSpeed = useTimelineStore((s) => s.playbackSpeed);
  const lastFrameRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) return;

    lastFrameRef.current = performance.now();

    const tick = (now: number) => {
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;

      const state = useTimelineStore.getState();

      // Don't advance in live mode
      if (state.currentTime === null) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const newTime = state.currentTime + dt * state.playbackSpeed;

      if (newTime >= state.rangeEnd) {
        state.setCurrentTime(state.rangeEnd);
        state.pause();
        return;
      }

      state.setCurrentTime(newTime);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, playbackSpeed]);
}
