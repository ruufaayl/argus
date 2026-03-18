// ============================================================
// City Configurations — The 4 Target Cities
// ============================================================

import type { CityConfig } from '@argus/shared';

export const CITIES: Record<string, CityConfig> = {
  karachi: {
    id: 'karachi',
    name: 'KARACHI',
    shortCode: 'KHI',
    division: 'Karachi Division, Sindh',
    population: '14,910,352',
    coordinates: { lng: 67.0099, lat: 24.8615 },
    defaultView: { zoom: 11.5, pitch: 52, bearing: -15, altitude: 8500 },
    entityPersonality: {
      tone: 'Exhausted. Bitter. Still standing. Never asks for sympathy.',
      openingLine: 'I have been Pakistan\'s largest earner for sixty consecutive years.',
      voiceLines: [],
    },
    liveMetrics: {
      aqiBaseValue: 187,
      tempBase: 41,
      gridStressBase: 68,
      stressScoreBase: 7.4,
    },
  },
  lahore: {
    id: 'lahore',
    name: 'LAHORE',
    shortCode: 'LHE',
    division: 'Lahore Division, Punjab',
    population: '13,095,166',
    coordinates: { lng: 74.3436, lat: 31.5497 },
    defaultView: { zoom: 11.5, pitch: 48, bearing: 10, altitude: 9200 },
    entityPersonality: {
      tone: 'Proud. Suffocating. Cultural memory intact. Lungs are not.',
      openingLine: 'I was called the Paris of the East. My AQI is currently {AQI}.',
      voiceLines: [],
    },
    liveMetrics: {
      aqiBaseValue: 234,
      tempBase: 36,
      gridStressBase: 72,
      stressScoreBase: 8.1,
    },
  },
  islamabad: {
    id: 'islamabad',
    name: 'ISLAMABAD',
    shortCode: 'ISB',
    division: 'Islamabad Capital Territory',
    population: '1,095,064',
    coordinates: { lng: 72.8239, lat: 33.5533 },
    defaultView: { zoom: 11.5, pitch: 45, bearing: -5, altitude: 8800 },
    entityPersonality: {
      tone: 'Polished surface. Hollow underneath. Painfully self-aware of the irony.',
      openingLine: 'I was designed with answers for every question. The questions have changed.',
      voiceLines: [],
    },
    liveMetrics: {
      aqiBaseValue: 87,
      tempBase: 28,
      gridStressBase: 41,
      stressScoreBase: 4.2,
    },
  },
  rawalpindi: {
    id: 'rawalpindi',
    name: 'RAWALPINDI',
    shortCode: 'RWP',
    division: 'Rawalpindi Division, Punjab',
    population: '2,233,910',
    coordinates: { lng: 73.0651, lat: 33.5651 },
    defaultView: { zoom: 11.5, pitch: 50, bearing: 20, altitude: 9000 },
    entityPersonality: {
      tone: 'Forgotten. Older than Pakistan. Dry wit. Infinite patience.',
      openingLine: 'I existed before Pakistan did. I will exist after the current government.',
      voiceLines: [],
    },
    liveMetrics: {
      aqiBaseValue: 154,
      tempBase: 33,
      gridStressBase: 78,
      stressScoreBase: 6.9,
    },
  },
};

/** Get city config by ID — throws if invalid */
export function getCityConfig(cityId: string): CityConfig {
  const city = CITIES[cityId];
  if (!city) {
    throw new Error(`Unknown city ID: ${cityId}. Valid: ${Object.keys(CITIES).join(', ')}`);
  }
  return city;
}

/** Get all city IDs */
export function getCityIds(): string[] {
  return Object.keys(CITIES);
}
