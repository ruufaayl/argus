// ============================================================
// Timeline Store — Playback state for multi-track scrubber (P3)
// ============================================================

import { create } from 'zustand';

export interface TimelineState {
  // Current playback time (ms since epoch, or null for live)
  currentTime: number | null;
  // Playback range
  rangeStart: number;
  rangeEnd: number;
  // Playback state
  isPlaying: boolean;
  playbackSpeed: number; // 1x, 2x, 4x, 8x
  // Track visibility
  tracks: Record<string, boolean>;
  // Whether timeline panel is expanded
  isExpanded: boolean;

  // Actions
  setCurrentTime: (time: number | null) => void;
  setRange: (start: number, end: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  goLive: () => void;
  toggleTrack: (track: string) => void;
  setExpanded: (expanded: boolean) => void;
}

const now = Date.now();
const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

export const useTimelineStore = create<TimelineState>((set) => ({
  currentTime: null, // null = live mode
  rangeStart: twentyFourHoursAgo,
  rangeEnd: now,
  isPlaying: false,
  playbackSpeed: 1,
  tracks: {
    flights: true,
    vessels: true,
    intel: true,
    incidents: true,
  },
  isExpanded: false,

  setCurrentTime: (time) => set({ currentTime: time }),
  setRange: (start, end) => set({ rangeStart: start, rangeEnd: end }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setSpeed: (speed) => set({ playbackSpeed: speed }),
  goLive: () => set({ currentTime: null, isPlaying: false }),
  toggleTrack: (track) =>
    set((s) => ({ tracks: { ...s.tracks, [track]: !s.tracks[track] } })),
  setExpanded: (expanded) => set({ isExpanded: expanded }),
}));
