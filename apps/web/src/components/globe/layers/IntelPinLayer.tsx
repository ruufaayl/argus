// ============================================================
// IntelPinLayer — Globe pins for intel signal locations (P2)
// Renders pulsing markers at lat/lng of intel feed items
// from the CommandCenter's Groq intelligence feed
// ============================================================

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../../stores/commandStore';

interface Props {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

const PRIORITY_COLORS: Record<string, Cesium.Color> = {
  critical: Cesium.Color.fromCssColorString('#F43F5E'),
  high: Cesium.Color.fromCssColorString('#FFB800'),
  normal: Cesium.Color.fromCssColorString('#00C8FF'),
  info: Cesium.Color.fromCssColorString('#34D399'),
};

const PRIORITY_SIZE: Record<string, number> = {
  critical: 12,
  high: 10,
  normal: 8,
  info: 6,
};

export function IntelPinLayer({ viewerRef }: Props) {
  const pointCollRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const labelCollRef = useRef<Cesium.LabelCollection | null>(null);
  const globeReady = useCommandStore((s) => s.globeReady);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const lastHashRef = useRef('');

  useEffect(() => {
    if (!globeReady) return;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const pc = new Cesium.PointPrimitiveCollection();
    const lc = new Cesium.LabelCollection();
    viewer.scene.primitives.add(pc);
    viewer.scene.primitives.add(lc);
    pointCollRef.current = pc;
    labelCollRef.current = lc;

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

    const fetchAndRender = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/intel/signals`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return;
        const items = await res.json();
        if (!Array.isArray(items)) return;

        // Hash check — skip if same data
        const hash = items.map((i: any) => `${i.lat}${i.lng}${i.priority}`).join('');
        if (hash === lastHashRef.current) return;
        lastHashRef.current = hash;

        pc.removeAll();
        lc.removeAll();

        for (const item of items) {
          if (!item.lat || !item.lng) continue;

          const color = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.info;
          const size = PRIORITY_SIZE[item.priority] || 8;

          pc.add({
            position: Cesium.Cartesian3.fromDegrees(item.lng, item.lat, 100),
            color: color.withAlpha(0.85),
            pixelSize: size,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(1000, 2.0, 1500000, 0.6),
            translucencyByDistance: new Cesium.NearFarScalar(500, 1.0, 2000000, 0.3),
            id: { type: 'intel-pin', data: item },
          });

          // Label only for critical/high
          if (item.priority === 'critical' || item.priority === 'high') {
            lc.add({
              position: Cesium.Cartesian3.fromDegrees(item.lng, item.lat, 100),
              text: (item.location || item.title || '').substring(0, 20),
              font: '9px "Share Tech Mono", monospace',
              fillColor: color,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -16),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              translucencyByDistance: new Cesium.NearFarScalar(1000, 1.0, 800000, 0.0),
            });
          }
        }
      } catch {
        // Silently ignore — intel pins are non-critical
      }
    };

    fetchAndRender();
    intervalRef.current = setInterval(fetchAndRender, 120000); // 2 min refresh

    return () => {
      clearInterval(intervalRef.current);
      if (!viewer.isDestroyed()) {
        if (pointCollRef.current) viewer.scene.primitives.remove(pointCollRef.current);
        if (labelCollRef.current) viewer.scene.primitives.remove(labelCollRef.current);
      }
      pointCollRef.current = null;
      labelCollRef.current = null;
    };
  }, [globeReady]);

  return null;
}
