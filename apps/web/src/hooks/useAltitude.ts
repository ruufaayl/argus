// ============================================================
// useAltitude — Camera altitude tracking hook
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import { altitudeToZone } from '../lib/altitudeManager';
import { useCityStore } from '../stores/cityStore';

export function useAltitude(
  viewerRef: React.RefObject<Cesium.Viewer | null>
) {
  const updateCamera = useCityStore((s) => s.updateCamera);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCameraChange = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return;

      const altitude = viewer.camera.positionCartographic.height;
      const zone = altitudeToZone(altitude);
      updateCamera(altitude, zone);
    }, 100);
  }, [viewerRef, updateCamera]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const removeChanged = viewer.camera.changed.addEventListener(handleCameraChange);
    const removeMoveEnd = viewer.camera.moveEnd.addEventListener(handleCameraChange);

    handleCameraChange();

    return () => {
      removeChanged();
      removeMoveEnd();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [viewerRef, handleCameraChange]);
}
