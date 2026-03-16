// ============================================================
// CityFlyTo — Smooth camera flight to target city
// ============================================================

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import type { CityId } from '@sentinel/shared';

const CESIUM_CITY_VIEWS: Record<
  CityId,
  { lng: number; lat: number; height: number; heading: number; pitch: number }
> = {
  karachi:    { lng: 67.0099, lat: 24.8615, height: 8500,  heading: 345, pitch: -45 },
  lahore:     { lng: 74.3436, lat: 31.5497, height: 9200,  heading: 10,  pitch: -48 },
  islamabad:  { lng: 73.0479, lat: 33.6844, height: 8800,  heading: 355, pitch: -45 },
  rawalpindi: { lng: 73.0651, lat: 33.5651, height: 9000,  heading: 20,  pitch: -50 },
};

interface CityFlyToProps {
  viewerRef: React.RefObject<Cesium.Viewer | null>;
  cityId: CityId;
  onFlightStart?: () => void;
  onFlightComplete?: () => void;
}

export function CityFlyTo({ viewerRef, cityId, onFlightStart, onFlightComplete }: CityFlyToProps) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const view = CESIUM_CITY_VIEWS[cityId];
    if (!view) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    onFlightStart?.();

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(view.lng, view.lat, view.height),
      orientation: {
        heading: Cesium.Math.toRadians(view.heading),
        pitch: Cesium.Math.toRadians(view.pitch),
        roll: 0,
      },
      duration: 3.0,
      complete: () => onFlightComplete?.(),
      cancel: () => onFlightComplete?.(),
    });
  }, [cityId]);

  return null;
}
