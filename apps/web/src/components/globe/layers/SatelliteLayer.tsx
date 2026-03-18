// ============================================================
// File: apps/web/src/components/globe/layers/SatelliteLayer.tsx
// ARGUS — Satellite Constellation Renderer
//
// RENDERS: 10,000+ satellites as PointPrimitiveCollection
// COLOR FIX: Uses Cesium.Color directly — NOT fromCssColorString
//   which silently returns black in some Cesium versions.
//
// ARCHITECTURE:
//   1. Spawns satellite.worker.ts Web Worker on mount
//   2. Worker fetches TLE data and runs SGP4 every 200ms
//   3. Worker posts POSITIONS array with category strings
//   4. Main thread maps category → Cesium.Color directly
// ============================================================

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../../stores/commandStore';

// ── Category → Cesium.Color mapping ──────────────────────────
// Direct Cesium.Color objects — never goes through CSS parsing
function getCategoryColor(category: string, opacity: number): Cesium.Color {
  switch (category) {
    case 'starlink': return new Cesium.Color(0.0, 0.78, 1.0, opacity);
    case 'gps': return new Cesium.Color(1.0, 0.72, 0.0, opacity);
    case 'iss': return new Cesium.Color(1.0, 0.19, 0.25, opacity);
    case 'weather': return new Cesium.Color(0.0, 1.0, 0.53, opacity);
    case 'military': return new Cesium.Color(1.0, 0.53, 0.0, opacity);
    default: return new Cesium.Color(1.0, 1.0, 1.0, Math.min(opacity, 0.3));
  }
}

interface SatPosition {
  lat: number;
  lon: number;
  altM: number;
  altKm: number;
  velocityKms: number;
  name: string;
  noradId: string;
  category: string;
  isOverPakistan: boolean;
  pixelSize: number;
  opacity: number;
}

interface Props {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

export function SatelliteLayer({ viewerRef }: Props) {
  const pointCollRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const reloadRef = useRef<ReturnType<typeof setInterval>>();
  const mountedRef = useRef(true);
  const positionsRef = useRef<SatPosition[]>([]);

  const isEnabled = useCommandStore(
    (s) => s.layers?.satellites ?? false
  );
  const globeReady = useCommandStore((s) => s.globeReady);
  const setSelectedEntity = useCommandStore(
    (s) => (s as any).setSelectedEntity
  );

  // ── Toggle visibility ──────────────────────────────────────
  useEffect(() => {
    if (pointCollRef.current) {
      pointCollRef.current.show = isEnabled;
    }
  }, [isEnabled]);

  // ── Zoom to constellation when enabled ─────────────────────
  useEffect(() => {
    if (!isEnabled) return;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        69.1912, 31.2836, 10000000
      ),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
      duration: 2.5,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, [isEnabled]);

  // ── Main effect ─────────────────────────────────────────────
  useEffect(() => {
    if (!globeReady) return;
    mountedRef.current = true;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // ── Create PointPrimitiveCollection ─────────────────────
    const pc = new Cesium.PointPrimitiveCollection();
    viewer.scene.primitives.add(pc);
    pointCollRef.current = pc;

    // Start hidden if layer disabled
    pc.show = useCommandStore.getState().layers?.satellites ?? false;

    // ── Spawn Web Worker ─────────────────────────────────────
    const worker = new Worker(
      new URL('../../../workers/satellite.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    // ── Handle worker messages ───────────────────────────────
    worker.onmessage = (e: MessageEvent) => {
      if (!mountedRef.current) return;
      const { type } = e.data;

      if (type === 'LOADING') {
        console.log('[SATELLITES] Loading TLE data...');
      }

      if (type === 'LOADED') {
        console.log(`[SATELLITES] ${e.data.count} satellites loaded`);
      }

      if (type === 'POSITIONS') {
        const positions: SatPosition[] = e.data.positions;
        positionsRef.current = positions;

        const pc = pointCollRef.current;
        const v = viewerRef.current;
        if (!pc || !v || v.isDestroyed()) return;

        const curr = positions.length;
        const prev = pc.length;

        if (curr === prev) {
          // Fast path: update existing points in place
          for (let i = 0; i < curr; i++) {
            const p = positions[i];
            const pt = pc.get(i);
            pt.position = Cesium.Cartesian3.fromDegrees(
              p.lon, p.lat, p.altM
            );
            pt.color = getCategoryColor(p.category, p.opacity);
            pt.pixelSize = p.pixelSize;
          }
        } else {
          // Rebuild: satellite count changed
          pc.removeAll();
          for (const p of positions) {
            pc.add({
              position: Cesium.Cartesian3.fromDegrees(
                p.lon, p.lat, p.altM
              ),
              color: getCategoryColor(p.category, p.opacity),
              pixelSize: p.pixelSize,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              scaleByDistance: new Cesium.NearFarScalar(
                1000, 3.0,
                2000000, 0.5
              ),
              id: {
                type: 'satellite',
                data: {
                  name: p.name,
                  noradId: p.noradId,
                  category: p.category,
                  altKm: p.altKm,
                  velocityKms: p.velocityKms,
                  isOverPakistan: p.isOverPakistan,
                  lat: p.lat,
                  lon: p.lon,
                },
              },
            });
          }
        }

        // Update store counters
        const store = useCommandStore.getState() as any;
        store.setLayerCount?.('satellites', curr);
        store.setLayerCount?.(
          'satellitesOverPK',
          positions.filter(p => p.isOverPakistan).length
        );
      }

      if (type === 'ERROR') {
        console.error('[SATELLITES] Worker error:', e.data.message);
      }
    };

    worker.onerror = (e) => {
      console.error('[SATELLITES] Worker crashed:', e);
    };

    // ── Start worker ─────────────────────────────────────────
    worker.postMessage({ type: 'START' });

    // ── Reload TLE data every 6 hours ────────────────────────
    reloadRef.current = setInterval(() => {
      if (workerRef.current) {
        console.log('[SATELLITES] Reloading TLE data (6h refresh)');
        workerRef.current.postMessage({ type: 'RELOAD' });
      }
    }, 6 * 60 * 60 * 1000);

    // ── Click handler — select satellite ────────────────────
    const clickHandler = new Cesium.ScreenSpaceEventHandler(
      viewer.scene.canvas
    );

    clickHandler.setInputAction(
      (click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        try {
          const picked = viewer.scene.pick(click.position);
          if (
            Cesium.defined(picked) &&
            picked.id?.type === 'satellite'
          ) {
            setSelectedEntity?.({
              type: 'satellite',
              data: picked.id.data,
            });

            const d = picked.id.data;
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(
                d.lon, d.lat, (d.altKm || 400) * 1000 + 500000
              ),
              duration: 2.0,
              easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
            });
          }
        } catch {
          // Ignore pick errors on tile boundaries
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    // ── Cleanup ───────────────────────────────────────────────
    return () => {
      mountedRef.current = false;
      clearInterval(reloadRef.current);
      worker.postMessage({ type: 'STOP' });
      worker.terminate();
      workerRef.current = null;
      clickHandler.destroy();

      const v = viewerRef.current;
      if (v && !v.isDestroyed()) {
        if (pointCollRef.current) {
          v.scene.primitives.remove(pointCollRef.current);
        }
      }
      pointCollRef.current = null;
    };
  }, [globeReady]);

  return null;
}