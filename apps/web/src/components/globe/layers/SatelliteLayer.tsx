// ============================================================
// File: apps/web/src/components/globe/layers/SatelliteLayer.tsx
// ARGUS — Satellite Constellation Renderer
//
// RENDERS: 10,000+ satellites as PointPrimitiveCollection with glowing sphere points
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
// White dots with subtle blue glow — categories only differ in opacity/size
function getCategoryColor(category: string, _opacity: number, altKm: number): Cesium.Color {
  // Orbit-aware coloring — bright glowing sphere colors
  const isGEO = altKm > 35000;
  const isMEO = altKm > 2000 && altKm <= 35000;

  switch (category) {
    case 'iss': return new Cesium.Color(1.0, 0.1, 0.2, 1.0);         // ISS bright red
    case 'gps': return new Cesium.Color(1.0, 0.85, 0.2, 1.0);        // GPS bright gold
    case 'military': return new Cesium.Color(1.0, 0.5, 0.1, 1.0);    // Military bright orange
    case 'starlink': return new Cesium.Color(0.2, 0.85, 1.0, 0.8);   // Starlink bright cyan
    case 'weather': return new Cesium.Color(0.1, 1.0, 0.4, 1.0);     // Weather bright green
    default:
      if (isGEO) return new Cesium.Color(1.0, 0.85, 0.5, 0.8);      // GEO gold
      if (isMEO) return new Cesium.Color(0.6, 0.8, 1.0, 0.7);       // MEO blue
      return new Cesium.Color(0.8, 0.9, 1.0, 0.6);                   // LEO white-blue
  }
}

// ── Point size by category (for PointPrimitiveCollection) ──
function getPointSize(category: string, altKm: number): number {
  if (category === 'iss') return 18;
  if (category === 'military') return 12;
  if (category === 'gps') return 11;
  if (category === 'weather') return 10;
  if (category === 'starlink') return 6;
  if (altKm > 35000) return 10; // GEO
  if (altKm > 2000) return 8;   // MEO
  return 7; // LEO
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
  const billboardCollRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const labelCollRef = useRef<Cesium.LabelCollection | null>(null);
  const orbitEntityRef = useRef<string | null>(null); // Track active orbit entity
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
    if (billboardCollRef.current) billboardCollRef.current.show = isEnabled;
    if (labelCollRef.current) labelCollRef.current.show = isEnabled;
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

    // ── Create BillboardCollection + LabelCollection ─────────
    const bc = new Cesium.PointPrimitiveCollection();
    const slc = new Cesium.LabelCollection();
    viewer.scene.primitives.add(bc);
    viewer.scene.primitives.add(slc);
    billboardCollRef.current = bc;
    labelCollRef.current = slc;

    // Start hidden if layer disabled
    const initShow = useCommandStore.getState().layers?.satellites ?? false;
    bc.show = initShow;
    slc.show = initShow;

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

        const bc = billboardCollRef.current;
        const slc = labelCollRef.current;
        const v = viewerRef.current;
        if (!bc || !slc || !v || v.isDestroyed()) return;

        // Depth test: when zoomed in close, hide satellites behind terrain
        const camHeight = v.camera.positionCartographic?.height ?? 10000000;
        const depthTestDist = camHeight < 500000 ? 500000 : Number.POSITIVE_INFINITY;

        const curr = positions.length;
        const prev = bc.length;

        // Important satellite categories that get labels
        const LABELED_CATS = new Set(['iss', 'gps', 'military', 'weather']);

        if (curr === prev) {
          // Fast path: update existing billboards in place
          for (let i = 0; i < curr; i++) {
            const p = positions[i];
            const bb = bc.get(i);
            bb.position = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.altM);
            bb.pixelSize = getPointSize(p.category, p.altKm);
            bb.color = getCategoryColor(p.category, p.opacity, p.altKm);
            bb.disableDepthTestDistance = depthTestDist;
          }
        } else {
          // Rebuild: satellite count changed
          bc.removeAll();
          slc.removeAll();
          for (const p of positions) {
            bc.add({
              position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.altM),
              pixelSize: getPointSize(p.category, p.altKm),
              color: getCategoryColor(p.category, p.opacity, p.altKm),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              disableDepthTestDistance: depthTestDist,
              scaleByDistance: new Cesium.NearFarScalar(1000, 3.0, 25000000, 0.4),
              translucencyByDistance: new Cesium.NearFarScalar(1000, 1.0, 30000000, 0.2),
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

            if (LABELED_CATS.has(p.category)) {
              slc.add({
                position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.altM),
                text: p.name,
                font: '9px "Share Tech Mono", monospace',
                fillColor: getCategoryColor(p.category, 0.9, p.altKm),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -10),
                disableDepthTestDistance: depthTestDist,
                translucencyByDistance: new Cesium.NearFarScalar(100000, 1.0, 3000000, 0.0),
                scaleByDistance: new Cesium.NearFarScalar(100000, 0.8, 3000000, 0.4),
              });
            }
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

            // Remove previous orbit visualization
            if (orbitEntityRef.current && !viewer.isDestroyed()) {
              viewer.entities.removeById(orbitEntityRef.current);
            }

            // Draw orbit ring at satellite altitude
            const orbitId = `sat-orbit-${d.noradId}`;
            orbitEntityRef.current = orbitId;
            const altM = (d.altKm || 400) * 1000;

            // Create circular orbit approximation (great circle at altitude)
            const orbitPoints: Cesium.Cartesian3[] = [];
            for (let deg = 0; deg <= 360; deg += 3) {
              const rad = Cesium.Math.toRadians(deg);
              const oLat = d.lat + Math.sin(rad) * 40; // ~40° arc
              const oLon = d.lon + Math.cos(rad) * 40;
              orbitPoints.push(
                Cesium.Cartesian3.fromDegrees(oLon, oLat, altM)
              );
            }

            viewer.entities.add({
              id: orbitId,
              polyline: {
                positions: orbitPoints,
                width: 1.5,
                material: new Cesium.PolylineGlowMaterialProperty({
                  color: Cesium.Color.fromCssColorString('#4488FF').withAlpha(0.5),
                  glowPower: 0.3,
                }),
              },
              // Target crosshair at satellite position
              point: {
                pixelSize: 14,
                color: Cesium.Color.TRANSPARENT,
                outlineColor: Cesium.Color.fromCssColorString('#4488FF'),
                outlineWidth: 2,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
              },
              position: Cesium.Cartesian3.fromDegrees(d.lon, d.lat, altM),
              label: {
                text: d.name,
                font: '11px "JetBrains Mono", monospace',
                fillColor: Cesium.Color.fromCssColorString('#88BBFF'),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -20),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                showBackground: true,
                backgroundColor: Cesium.Color.fromCssColorString('rgba(10,15,30,0.8)'),
                backgroundPadding: new Cesium.Cartesian2(6, 4),
              },
            });

            // Auto-remove orbit after 15s
            setTimeout(() => {
              if (!viewer.isDestroyed()) {
                viewer.entities.removeById(orbitId);
                if (orbitEntityRef.current === orbitId) {
                  orbitEntityRef.current = null;
                }
              }
            }, 15000);

            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(
                d.lon, d.lat, altM + 500000
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

    // ── Hover handler — satellite tooltip ─────────────────────
    const hoverHandler = new Cesium.ScreenSpaceEventHandler(
      viewer.scene.canvas
    );

    let tooltipEntity: string | null = null;

    hoverHandler.setInputAction(
      (move: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        try {
          const picked = viewer.scene.pick(move.endPosition);

          // Remove previous tooltip
          if (tooltipEntity) {
            viewer.entities.removeById(tooltipEntity);
            tooltipEntity = null;
          }

          if (
            Cesium.defined(picked) &&
            picked.id?.type === 'satellite'
          ) {
            const d = picked.id.data;
            const tipId = `sat-tooltip-${Date.now()}`;
            tooltipEntity = tipId;

            const orbitType = d.altKm > 35000 ? 'GEO' : d.altKm > 2000 ? 'MEO' : 'LEO';

            viewer.entities.add({
              id: tipId,
              position: Cesium.Cartesian3.fromDegrees(d.lon, d.lat, (d.altKm || 400) * 1000),
              label: {
                text: `${d.name}\n${orbitType} · ${Math.round(d.altKm)}km · ${d.velocityKms?.toFixed(1) || '?'}km/s`,
                font: '11px "JetBrains Mono", monospace',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 3,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(12, -8),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                showBackground: true,
                backgroundColor: Cesium.Color.fromCssColorString('rgba(8,14,26,0.92)'),
                backgroundPadding: new Cesium.Cartesian2(10, 6),
              },
            });

            // Change cursor
            viewer.scene.canvas.style.cursor = 'pointer';
          } else {
            viewer.scene.canvas.style.cursor = 'default';
          }
        } catch {
          // Ignore hover pick errors
        }
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE
    );

    // ── Cleanup ───────────────────────────────────────────────
    return () => {
      mountedRef.current = false;
      clearInterval(reloadRef.current);
      worker.postMessage({ type: 'STOP' });
      worker.terminate();
      workerRef.current = null;
      clickHandler.destroy();
      hoverHandler.destroy();

      if (tooltipEntity) {
        viewer.entities.removeById(tooltipEntity);
      }

      const v = viewerRef.current;
      if (v && !v.isDestroyed()) {
        if (billboardCollRef.current) v.scene.primitives.remove(billboardCollRef.current);
        if (labelCollRef.current) v.scene.primitives.remove(labelCollRef.current);
      }
      billboardCollRef.current = null;
      labelCollRef.current = null;
    };
  }, [globeReady]);

  return null;
}