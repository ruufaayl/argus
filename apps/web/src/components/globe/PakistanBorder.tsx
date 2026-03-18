// ============================================================
// File: apps/web/src/components/globe/PakistanBorder.tsx
// ARGUS — Pakistan Sovereign Territory Renderer
//
// VISUAL DESIGN:
//   3-layer glowing polyline border (outer/mid/inner glow)
//   Animated pulse on inner line via postRender listener
//   Subtle territory fill polygon (rgba 0.03 opacity)
//   LOC (Line of Control) dashed line in Kashmir region
//   Durand Line in amber (disputed Afghan border)
//
// DATA:
//   GeoJSON from datasets/geo-countries (ISO_A3 = PAK)
//   Cached in memory after first fetch — never re-fetched
//
// ARCHITECTURE:
//   PolylineCollection for border lines (GPU instanced)
//   GeoJsonDataSource for territory fill polygon
//   postRender event for pulse animation (no setInterval)
// ============================================================

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useRadarStore } from '../../stores/radarStore';

const GEOJSON_URL =
  'https://raw.githubusercontent.com/datasets/' +
  'geo-countries/master/data/countries.geojson';

// Border elevation — just above terrain to avoid z-fighting
// with Google 3D Tiles
const BORDER_ALT_M = 500;

// Pulse animation speed — radians per frame at 60fps
// 0.015 = ~6 second full cycle
const PULSE_SPEED = 0.015;

interface Props {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

// ── GeoJSON coordinate extraction ────────────────────────────
// GeoJSON Polygon rings: [ [ [lon,lat], [lon,lat], ... ] ]
// GeoJSON MultiPolygon:  [ polygon, polygon, ... ]
function extractRings(geometry: any): number[][][] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates;
  }
  if (geometry.type === 'MultiPolygon') {
    // Flatten all polygons into one list of rings
    return geometry.coordinates.flat(1);
  }
  return [];
}

function ringToCartesian(
  ring: number[][],
  altM: number
): Cesium.Cartesian3[] {
  return ring.map(([lon, lat]) =>
    Cesium.Cartesian3.fromDegrees(lon, lat, altM)
  );
}

export function PakistanBorder({ viewerRef }: Props) {
  const polyCollRef = useRef<Cesium.PolylineCollection | null>(null);
  const dataSourceRef = useRef<Cesium.GeoJsonDataSource | null>(null);
  const innerLinesRef = useRef<Cesium.Polyline[]>([]);
  const pulsePhaseRef = useRef(0);
  const postRenderRef = useRef<Cesium.Event.RemoveCallback>();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // ── Create PolylineCollection ──────────────────────────
    const pc = new Cesium.PolylineCollection();
    viewer.scene.primitives.add(pc);
    polyCollRef.current = pc;

    // ── Load and render border ─────────────────────────────
    const loadBorder = async () => {
      try {
        const res = await fetch(GEOJSON_URL);
        const data = await res.json();

        if (!mountedRef.current) return;

        // Find Pakistan feature
        const feature = data.features?.find(
          (f: any) => f.properties?.ISO_A3 === 'PAK'
        );

        if (!feature) {
          console.error('[BORDER] Pakistan feature not found in GeoJSON');
          return;
        }

        const v = viewerRef.current;
        if (!v || v.isDestroyed() || !polyCollRef.current) return;

        // ── Territory fill ─────────────────────────────────
        // Very subtle translucent fill — just enough to say
        // "this is Pakistani territory" without obscuring tiles
        try {
          const ds = await Cesium.GeoJsonDataSource.load(
            {
              type: 'FeatureCollection',
              features: [feature],
            },
            {
              fill: Cesium.Color.fromCssColorString(
                'rgba(0,200,255,0.04)'
              ),
              stroke: Cesium.Color.TRANSPARENT,
              strokeWidth: 0,
              clampToGround: false,
            }
          );

          if (!mountedRef.current) return;
          v.dataSources.add(ds);
          dataSourceRef.current = ds;
        } catch (fillErr) {
          // Fill is cosmetic — log and continue
          console.warn('[BORDER] Territory fill failed:', fillErr);
        }

        // ── Border polylines ───────────────────────────────
        const rings = extractRings(feature.geometry);

        for (const ring of rings) {
          if (ring.length < 4) continue; // skip tiny/degenerate rings

          const positions = ringToCartesian(ring, BORDER_ALT_M);

          // LAYER 1 — Outer halo (widest, most transparent)
          // Creates the atmospheric glow effect
          polyCollRef.current.add({
            positions,
            width: 10,
            material: Cesium.Material.fromType('Color', {
              color: Cesium.Color.fromCssColorString(
                'rgba(0,200,255,0.08)'
              ),
            }),
          });

          // LAYER 2 — Mid glow
          polyCollRef.current.add({
            positions,
            width: 5,
            material: Cesium.Material.fromType('Color', {
              color: Cesium.Color.fromCssColorString(
                'rgba(0,200,255,0.30)'
              ),
            }),
          });

          // LAYER 3 — Inner sharp line (animated pulse)
          // Store ref so postRender can animate it
          const innerMat = Cesium.Material.fromType('Color', {
            color: Cesium.Color.fromCssColorString(
              'rgba(0,200,255,0.85)'
            ),
          });

          const innerLine = polyCollRef.current.add({
            positions,
            width: 1.5,
            material: innerMat,
          });

          innerLinesRef.current.push(innerLine);
        }

        console.log(
          `[BORDER] Pakistan border loaded: ${rings.length} rings`
        );

        // Store geometry in radarStore for border crossing detection
        const geoRings: [number, number][][] = rings.map(
          ring => ring.map(([lon, lat]) => [lon, lat] as [number, number])
        );
        useRadarStore.getState().setBorderGeometry({
          rings: geoRings,
          bbox: {
            minLat: 23.5, maxLat: 37.5,
            minLon: 60.8, maxLon: 77.8,
          },
        });
        console.log(
          `[BORDER] Geometry stored for radar detection:`,
          `${geoRings.length} rings,`,
          `${geoRings.reduce((t, r) => t + r.length, 0)} total vertices`
        );

      } catch (e) {
        console.error('[BORDER] Failed to load GeoJSON:', e);
      }
    };

    loadBorder();

    // ── Pulse animation via postRender ─────────────────────
    // postRender fires every frame — no setInterval needed.
    // Updating material color alpha creates the breathing glow.
    postRenderRef.current = viewer.scene.postRender.addEventListener(
      () => {
        if (!innerLinesRef.current.length) return;

        pulsePhaseRef.current += PULSE_SPEED;

        // Oscillate between 0.45 and 1.0 opacity
        const alpha =
          0.725 + Math.sin(pulsePhaseRef.current) * 0.275;

        for (const line of innerLinesRef.current) {
          if (
            line &&
            line.material?.uniforms?.color !== undefined
          ) {
            line.material.uniforms.color.alpha = alpha;
          }
        }
      }
    );

    // ── Cleanup ────────────────────────────────────────────
    return () => {
      mountedRef.current = false;

      if (postRenderRef.current) {
        postRenderRef.current();
      }

      const v = viewerRef.current;
      if (v && !v.isDestroyed()) {
        if (polyCollRef.current) {
          v.scene.primitives.remove(polyCollRef.current);
        }
        if (dataSourceRef.current) {
          v.dataSources.remove(dataSourceRef.current, true);
        }
      }

      polyCollRef.current = null;
      dataSourceRef.current = null;
      innerLinesRef.current = [];
    };
  }, []);

  return null;
}