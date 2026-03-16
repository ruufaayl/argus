// ============================================================
// SigintLayer — Simulated expanding radio-wave ellipses
// ============================================================

import { useEffect, useRef, type MutableRefObject } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../../stores/commandStore';

// SIGINT emission centers (urban areas with heavy electronic traffic)
const SIGINT_NODES = [
  { name: 'Islamabad Signals Hub', lat: 33.7200, lng: 73.0780 },
  { name: 'Karachi Port Intercept', lat: 24.8418, lng: 66.9904 },
  { name: 'Lahore Urban Dense', lat: 31.5527, lng: 74.3199 },
  { name: 'Peshawar Border Activity', lat: 34.0104, lng: 71.5844 },
  { name: 'Quetta Western Corridor', lat: 30.1946, lng: 67.0084 },
  { name: 'Gwadar Port Zone', lat: 25.1210, lng: 62.3226 },
];

interface Props {
  viewerRef: MutableRefObject<Cesium.Viewer | null>;
}

export function SigintLayer({ viewerRef }: Props) {
  const isVisible = useCommandStore((s) => s.layers.sigint);
  const entitiesRef = useRef<Cesium.Entity[]>([]);
  const startTimesRef = useRef<number[]>([]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const entities: Cesium.Entity[] = [];
    const startTimes: number[] = [];

    SIGINT_NODES.forEach((node, idx) => {
      const startTime = Date.now() - idx * 2000; // Stagger start times
      startTimes.push(startTime);

      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(node.lng, node.lat, 10),
        ellipse: {
          semiMajorAxis: new Cesium.CallbackProperty(() => {
            const elapsed = (Date.now() - startTime) % 6000; // 6s cycle
            const t = elapsed / 6000;
            return 500 + t * 30000; // 500m → 30km
          }, false) as any,
          semiMinorAxis: new Cesium.CallbackProperty(() => {
            const elapsed = (Date.now() - startTime) % 6000;
            const t = elapsed / 6000;
            return 500 + t * 30000;
          }, false) as any,
          material: new Cesium.ColorMaterialProperty(
            new Cesium.CallbackProperty(() => {
              const elapsed = (Date.now() - startTime) % 6000;
              const t = elapsed / 6000;
              const alpha = 0.3 * (1 - t); // Fade out as it expands
              return Cesium.Color.fromCssColorString('#FF3040').withAlpha(alpha);
            }, false) as any
          ),
          outline: true,
          outlineColor: new Cesium.CallbackProperty(() => {
            const elapsed = (Date.now() - startTime) % 6000;
            const t = elapsed / 6000;
            return Cesium.Color.fromCssColorString('#FF3040').withAlpha(0.5 * (1 - t));
          }, false) as any,
          outlineWidth: 1,
          height: 10,
        },
      });
      entities.push(entity);
    });

    entitiesRef.current = entities;
    startTimesRef.current = startTimes;

    return () => {
      entities.forEach((e) => {
        if (!viewer.isDestroyed()) viewer.entities.remove(e);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle visibility
  useEffect(() => {
    entitiesRef.current.forEach((e) => {
      e.show = isVisible;
    });
  }, [isVisible]);

  return null;
}
