// ============================================================
// CameraPlaceholder — Classified Mode Map Overlays
// Hardcoded strategic locations (Transport/Gov/Intersections)
// ============================================================

import { useEffect } from 'react';
import * as Cesium from 'cesium';
import { useCesium } from 'resium';
import { useCityStore } from '../../stores/cityStore';

// Mock Tier-1 locations for each city
const CAMERA_SITES: Record<string, { lat: number; lng: number; name: string; tier: 'T1' }[]> = {
  karachi: [
    { lat: 24.8615, lng: 67.0099, name: 'SADDAR INTERSECTION', tier: 'T1' },
    { lat: 24.9050, lng: 67.1380, name: 'JINNAH INTL AIRPORT', tier: 'T1' },
    { lat: 24.8138, lng: 66.9946, name: 'KPT PORT HEADQUARTERS', tier: 'T1' },
    { lat: 24.8710, lng: 67.0423, name: 'SHAHRAH-E-FAISAL HUB', tier: 'T1' },
  ],
  lahore: [
    { lat: 31.5497, lng: 74.3436, name: 'MALL ROAD GOV ZONE', tier: 'T1' },
    { lat: 31.5204, lng: 74.4025, name: 'ALLAMA IQBAL INTL', tier: 'T1' },
    { lat: 31.5830, lng: 74.3039, name: 'AZADI CHOWK', tier: 'T1' },
  ],
  islamabad: [
    { lat: 33.7294, lng: 73.0931, name: 'RED ZONE PMM', tier: 'T1' },
    { lat: 33.6844, lng: 73.0479, name: 'ZERO POINT INT', tier: 'T1' },
    { lat: 33.5651, lng: 72.8461, name: 'ISLAMABAD INTL', tier: 'T1' },
  ],
  rawalpindi: [
    { lat: 33.5973, lng: 73.0405, name: 'GHQ APPROACH', tier: 'T1' },
    { lat: 33.6190, lng: 73.0560, name: 'FAIZABAD INTERCHANGE', tier: 'T1' },
  ]
};

// Simple Cyan CCTV SVG data URI
const CCTV_ICON = `data:image/svg+xml;base64,${btoa(`
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M15 13L19 10V14L15 11V13Z" fill="#00DCFF"/>
  <rect x="5" y="8" width="10" height="8" rx="2" stroke="#00DCFF" stroke-width="2"/>
  <circle cx="10" cy="12" r="2" fill="#00DCFF"/>
</svg>
`)}`;

export function CameraPlaceholder() {
  const { viewer } = useCesium();
  const currentCity = useCityStore((s) => s.currentCity);
  const isClassifiedMode = useCityStore((s) => s.isClassifiedMode);

  useEffect(() => {
    if (!viewer || !isClassifiedMode) return;

    const sites = CAMERA_SITES[currentCity] || [];
    const entities: Cesium.Entity[] = [];

    sites.forEach((site) => {
      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(site.lng, site.lat, 50),
        billboard: {
          image: CCTV_ICON,
          width: 24,
          height: 24,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY, // Always render on top
        },
        label: {
          text: `FEED: ${site.name}\nINTEGRATION PENDING`,
          font: '10px monospace',
          fillColor: Cesium.Color.CYAN,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 2,
          outlineColor: Cesium.Color.BLACK,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, 10),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          showBackground: true,
          backgroundColor: new Cesium.Color(0, 0, 0, 0.7),
        }
      });
      entities.push(entity);
    });

    return () => {
      entities.forEach((e) => viewer.entities.remove(e));
    };
  }, [viewer, currentCity, isClassifiedMode]);

  return null;
}
