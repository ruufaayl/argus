// ============================================================
// PopulationLayer — Lightweight population density visualization
// Uses a small set of colored ellipses, NOT hundreds of entities.
// ============================================================

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import type { CityId, AltitudeZone } from '@sentinel/shared';
import { CITIES } from '../../lib/cities';

interface PopulationLayerProps {
  viewerRef: React.RefObject<Cesium.Viewer | null>;
  visible: boolean;
  currentZone: AltitudeZone;
  cityId: CityId;
}

const VISIBLE_ZONES: AltitudeZone[] = ['CITY', 'DISTRICT', 'APPROACH'];

// Density ring structure — lightweight, only ~15 entities per city
interface DensityRing {
  offsetLng: number;
  offsetLat: number;
  density: number; // 0-1
  radius: number;
}

function getCityDensityRings(): DensityRing[] {
  return [
    // Core (highest density)
    { offsetLng: 0, offsetLat: 0, density: 1.0, radius: 1500 },
    { offsetLng: 0.01, offsetLat: 0.005, density: 0.9, radius: 1200 },
    { offsetLng: -0.008, offsetLat: 0.01, density: 0.85, radius: 1300 },
    // Inner ring
    { offsetLng: 0.025, offsetLat: 0.02, density: 0.7, radius: 1800 },
    { offsetLng: -0.02, offsetLat: 0.025, density: 0.65, radius: 1600 },
    { offsetLng: 0.03, offsetLat: -0.015, density: 0.6, radius: 1400 },
    { offsetLng: -0.025, offsetLat: -0.02, density: 0.55, radius: 1700 },
    // Middle ring
    { offsetLng: 0.05, offsetLat: 0.04, density: 0.4, radius: 2200 },
    { offsetLng: -0.04, offsetLat: 0.05, density: 0.35, radius: 2000 },
    { offsetLng: 0.06, offsetLat: -0.03, density: 0.3, radius: 2100 },
    { offsetLng: -0.05, offsetLat: -0.04, density: 0.25, radius: 1900 },
    // Outer ring (sparse)
    { offsetLng: 0.08, offsetLat: 0.06, density: 0.15, radius: 2800 },
    { offsetLng: -0.07, offsetLat: 0.07, density: 0.12, radius: 2500 },
    { offsetLng: 0.09, offsetLat: -0.05, density: 0.1, radius: 2600 },
    { offsetLng: -0.08, offsetLat: -0.06, density: 0.08, radius: 2400 },
  ];
}

function densityToColor(d: number): Cesium.Color {
  if (d > 0.75) return Cesium.Color.fromCssColorString('rgba(255, 60, 40, 0.45)');
  if (d > 0.5) return Cesium.Color.fromCssColorString('rgba(255, 180, 40, 0.4)');
  if (d > 0.25) return Cesium.Color.fromCssColorString('rgba(0, 200, 255, 0.35)');
  return Cesium.Color.fromCssColorString('rgba(10, 40, 80, 0.3)');
}

export function PopulationLayer({ viewerRef, visible, currentZone, cityId }: PopulationLayerProps) {
  const entitiesRef = useRef<Cesium.Entity[]>([]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // Clean previous
    entitiesRef.current.forEach((e) => {
      if (!viewer.isDestroyed()) viewer.entities.remove(e);
    });
    entitiesRef.current = [];

    const city = CITIES[cityId];
    if (!city) return;

    const rings = getCityDensityRings();
    const entities: Cesium.Entity[] = [];

    rings.forEach((ring) => {
      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(
          city.coordinates.lng + ring.offsetLng,
          city.coordinates.lat + ring.offsetLat,
          5
        ),
        ellipse: {
          semiMajorAxis: ring.radius,
          semiMinorAxis: ring.radius * 0.85,
          material: densityToColor(ring.density),
          outline: true,
          outlineColor: Cesium.Color.CYAN.withAlpha(0.08),
          outlineWidth: 1,
          height: 5,
          extrudedHeight: 5 + ring.density * 150,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        },
        show: false,
      });
      entities.push(entity);
    });

    entitiesRef.current = entities;
    console.log(`[ARGUS] Population layer: ${entities.length} zones for ${cityId}`);

    return () => {
      if (!viewer.isDestroyed()) {
        entities.forEach((e) => viewer.entities.remove(e));
      }
      entitiesRef.current = [];
    };
  }, [viewerRef, cityId]);

  useEffect(() => {
    const isVisible = visible && VISIBLE_ZONES.includes(currentZone);
    entitiesRef.current.forEach((entity) => {
      entity.show = isVisible;
    });
  }, [visible, currentZone]);

  return null;
}
