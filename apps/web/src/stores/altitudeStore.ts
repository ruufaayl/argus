import { create } from 'zustand';

interface AltitudeStore {
  altitudeKm: number;
  setAltitude: (altKm: number) => void;
}

export const altitudeStore = create<AltitudeStore>((set) => ({
  altitudeKm: 35000, // Starts at 35,000km from space
  setAltitude: (altKm) => set({ altitudeKm: altKm }),
}));
