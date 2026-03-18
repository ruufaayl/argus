// ============================================================
// File: apps/web/src/components/globe/layers/VesselLayer.tsx
// ARGUS — Maritime Intelligence Layer
//
// DATA SOURCE: AISStream.io WebSocket → Worker → /api/vessels
// RENDER: BillboardCollection (ships) + PolylineCollection (wakes)
// UPDATE: 60s poll with position interpolation between fetches
//
// AIS VESSEL TYPE CLASSIFICATION:
// 0-19:   Reserved/Unknown
// 20-29:  WIG (Wing In Ground)
// 30:     Fishing
// 31-32:  Towing
// 33-34:  Dredging/Underwater ops
// 35:     Military
// 36:     Sailing
// 37:     Pleasure craft
// 40-49:  High speed craft
// 50:     Pilot vessel
// 51:     SAR vessel
// 52:     Tug
// 60-69:  Passenger
// 70-79:  Cargo ← most CPEC vessels
// 80-89:  Tanker ← Arabian Sea corridor
// 90-99:  Other
// ============================================================

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../../stores/commandStore';

// ── Constants ────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const POLL_INTERVAL_MS = 60_000;   // AIS updates slowly — 60s is correct
const WAKE_MAX_POINTS = 12;       // Position history for wake trail
const WAKE_MIN_DIST_M = 50;       // Minimum movement before adding wake point
const SEA_LEVEL_M = 5;        // Small offset prevents z-fighting with terrain
const FETCH_TIMEOUT_MS = 10_000;

// ── SVG Icons ────────────────────────────────────────────────
// All SVGs encoded using encodeURIComponent for correct WebGL loading

const SVG_CARGO = `data:image/svg+xml,` + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 48' width='24' height='48'><path fill='%2300FFCC' d='M12 2 L20 14 L20 46 L4 46 L4 14 Z'/><rect fill='%2300FFCC' opacity='0.6' x='8' y='18' width='8' height='4'/><rect fill='%2300FFCC' opacity='0.6' x='8' y='26' width='8' height='4'/></svg>`);
const SVG_MILITARY = `data:image/svg+xml,` + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 48' width='24' height='48'><polygon fill='%23FFB800' points='12,2 22,16 18,46 6,46 2,16'/><polygon fill='%23FFB800' opacity='0.4' points='12,8 18,18 6,18'/></svg>`);
const SVG_TANKER = `data:image/svg+xml,` + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 48' width='24' height='48'><path fill='%23FF8800' d='M12 2 L21 15 L21 46 L3 46 L3 15 Z'/><circle fill='%23FF8800' opacity='0.5' cx='12' cy='22' r='4'/><circle fill='%23FF8800' opacity='0.5' cx='12' cy='34' r='4'/></svg>`);
const SVG_PASSENGER = `data:image/svg+xml,` + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 48' width='32' height='48'><path fill='%2300AAFF' d='M16 2 L28 14 L28 46 L4 46 L4 14 Z'/><rect fill='white' opacity='0.3' x='6' y='18' width='20' height='20' rx='2'/></svg>`);
const SVG_DEFAULT = `data:image/svg+xml,` + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 40' width='20' height='40'><path fill='%2388DDCC' d='M10 2 L18 15 L18 38 L2 38 L2 15 Z'/></svg>`);

// ── Type helpers ──────────────────────────────────────────────
function getVesselIcon(type: number): string {
  if (type === 35) return SVG_MILITARY;
  if (type >= 80 && type <= 89) return SVG_TANKER;
  if (type >= 70 && type <= 79) return SVG_CARGO;
  if (type >= 60 && type <= 69) return SVG_PASSENGER;
  return SVG_DEFAULT;
}

function getVesselColor(type: number): Cesium.Color {
  if (type === 35) return Cesium.Color.fromCssColorString('#FFB800'); // military amber
  if (type >= 80 && type <= 89) return Cesium.Color.fromCssColorString('#FF8800'); // tanker orange
  if (type >= 70 && type <= 79) return Cesium.Color.fromCssColorString('#00FFCC'); // cargo teal
  if (type >= 60 && type <= 69) return Cesium.Color.fromCssColorString('#00AAFF'); // passenger blue
  return Cesium.Color.fromCssColorString('#88DDCC');
}

function getVesselTypeName(type: number): string {
  if (type === 35) return 'MILITARY';
  if (type >= 80 && type <= 89) return 'TANKER';
  if (type >= 70 && type <= 79) return 'CARGO';
  if (type >= 60 && type <= 69) return 'PASSENGER';
  if (type === 52) return 'TUG';
  if (type === 30) return 'FISHING';
  if (type === 36 || type === 37) return 'RECREATIONAL';
  return 'VESSEL';
}

// ── Interfaces ────────────────────────────────────────────────
interface Vessel {
  mmsi: number;
  name: string;
  type: number;
  lat: number;
  lng: number;
  speed: number;     // knots
  heading: number;   // 0-359, 511 = unknown
  course: number;    // course over ground
  destination?: string;
  timestamp: string;
}

interface WakeEntry {
  positions: Cesium.Cartesian3[];
  polyline: Cesium.Polyline;
}

interface Props {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

// ════════════════════════════════════════════════════════════
// VESSEL LAYER
// ════════════════════════════════════════════════════════════

export function VesselLayer({ viewerRef }: Props) {
  // ── Primitive collection refs ─────────────────────────────
  // Separate collections for ships and wakes:
  // Wakes render first (below ships visually)
  const wakeCollRef = useRef<Cesium.PolylineCollection | null>(null);
  const shipCollRef = useRef<Cesium.BillboardCollection | null>(null);
  const labelCollRef = useRef<Cesium.LabelCollection | null>(null);

  // ── Entity maps — keyed by MMSI ───────────────────────────
  const billboardMap = useRef<Map<number, Cesium.Billboard>>(new Map());
  const labelMap = useRef<Map<number, Cesium.Label>>(new Map());
  const wakeMap = useRef<Map<number, WakeEntry>>(new Map());

  // ── Control refs ──────────────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const abortRef = useRef<AbortController>();
  const mountedRef = useRef(true);

  // ── Store ─────────────────────────────────────────────────
  // Read layer toggle — reactive
  const isEnabled = useCommandStore((s) => (s as any).layers?.vessels ?? true);
  const globeReady = useCommandStore((s) => s.globeReady);

  // ── Show/hide all collections when toggle changes ─────────
  useEffect(() => {
    if (shipCollRef.current) shipCollRef.current.show = isEnabled;
    if (wakeCollRef.current) wakeCollRef.current.show = isEnabled;
    if (labelCollRef.current) labelCollRef.current.show = isEnabled;
  }, [isEnabled]);

  // ── Main effect — init + fetch loop ───────────────────────
  // Depends on globeReady — viewerRef is null during Globe's async init
  useEffect(() => {
    if (!globeReady) return;
    mountedRef.current = true;

    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // ── Create Cesium primitive collections ─────────────────
    // Add wake collection FIRST — renders underneath ships
    const wc = new Cesium.PolylineCollection();
    const bc = new Cesium.BillboardCollection({ scene: viewer.scene });
    const lc = new Cesium.LabelCollection();

    viewer.scene.primitives.add(wc);
    viewer.scene.primitives.add(bc);
    viewer.scene.primitives.add(lc);

    wakeCollRef.current = wc;
    shipCollRef.current = bc;
    labelCollRef.current = lc;

    // ── Fetch + render ───────────────────────────────────────
    const fetchAndRender = async () => {
      // Cancel in-flight request if fetch fires again
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const timeoutId = setTimeout(
        () => abortRef.current?.abort(),
        FETCH_TIMEOUT_MS
      );

      try {
        const res = await fetch(`${API}/api/vessels`, {
          signal: abortRef.current.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          console.warn(`[VESSELS] API returned ${res.status}`);
          return;
        }

        const data = await res.json();
        const vessels: Vessel[] = data.vessels || [];

        if (!mountedRef.current) return;

        const bc = shipCollRef.current;
        const wc = wakeCollRef.current;
        const lc = labelCollRef.current;
        if (!bc || !wc || !lc || viewer.isDestroyed()) return;

        const currentMMSIs = new Set<number>();

        for (const v of vessels) {
          // Skip invalid coordinates
          if (
            !isFinite(v.lat) || !isFinite(v.lng) ||
            v.lat === 0 || v.lng === 0
          ) continue;

          currentMMSIs.add(v.mmsi);

          // Position at sea level + small offset
          const position = Cesium.Cartesian3.fromDegrees(
            v.lng, v.lat, SEA_LEVEL_M
          );

          // Heading: AIS reports 511 when unknown
          // Fall back to course over ground, then 0
          const headingDeg =
            v.heading !== 511 && v.heading >= 0
              ? v.heading
              : (v.course || 0);

          // AIS heading 0 = North, rotation 0 = East
          // Subtract 90° to align icon North with AIS North
          const rotation = Cesium.Math.toRadians(headingDeg - 90);

          const color = getVesselColor(v.type);
          const icon = getVesselIcon(v.type);

          // ── Billboard update or create ───────────────────
          if (billboardMap.current.has(v.mmsi)) {
            const bb = billboardMap.current.get(v.mmsi)!;
            bb.position = position;
            bb.rotation = rotation;

            // Update label position
            const lb = labelMap.current.get(v.mmsi);
            if (lb) lb.position = position;
          } else {
            // New vessel — add billboard
            const bb = bc.add({
              position,
              image: icon,
              scale: 0.55,
              rotation,
              color,
              // CRITICAL: render on top of Google 3D Tiles
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              eyeOffset: new Cesium.Cartesian3(0, 0, -2000),
              // Scale down as camera zooms out — ships are small
              scaleByDistance: new Cesium.NearFarScalar(
                500, 1.6,   // very close: large
                600000, 0.2 // far: tiny dot
              ),
              // Fade out at extreme zoom
              translucencyByDistance: new Cesium.NearFarScalar(
                1000, 1.0,
                800000, 0.0
              ),
              id: {
                type: 'vessel',
                data: {
                  ...v,
                  typeName: getVesselTypeName(v.type),
                },
              },
            });
            billboardMap.current.set(v.mmsi, bb);

            // ── Label — vessel name ──────────────────────
            const vesselName = v.name?.trim() || `MMSI ${v.mmsi}`;
            const lb = lc.add({
              position,
              text: vesselName,
              font: '10px "Share Tech Mono", monospace',
              fillColor: color,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -28),
              // Only show label when zoomed fairly close
              translucencyByDistance: new Cesium.NearFarScalar(
                1000, 1.0,
                150000, 0.0
              ),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              id: { type: 'vessel-label', mmsi: v.mmsi },
            });
            labelMap.current.set(v.mmsi, lb);

            console.log(
              `[VESSELS] Added: ${vesselName} ` +
              `(${getVesselTypeName(v.type)}) ` +
              `@ ${v.lat.toFixed(3)}, ${v.lng.toFixed(3)}`
            );
          }

          // ── Wake trail ────────────────────────────────────
          // Build a fading polyline showing recent path.
          // Only add new point if vessel moved enough.
          const existingWake = wakeMap.current.get(v.mmsi);

          if (!existingWake) {
            // First sighting — create wake polyline
            // Start with just one point (no trail yet)
            const pl = wc.add({
              positions: [position, position],
              width: 2.5,
              material: Cesium.Material.fromType(
                'PolylineGlow', {
                color: color.withAlpha(0.7),
                glowPower: 0.15,
                taperPower: 0.5,
              }
              ),
              // Wake fades with distance
              distanceDisplayCondition:
                new Cesium.DistanceDisplayCondition(0, 500000),
            });
            wakeMap.current.set(v.mmsi, {
              positions: [position],
              polyline: pl,
            });
          } else {
            const { positions, polyline } = existingWake;
            const lastPos = positions[positions.length - 1];
            const dist = Cesium.Cartesian3.distance(lastPos, position);

            if (dist > WAKE_MIN_DIST_M) {
              positions.push(position);
              // Cap trail length
              if (positions.length > WAKE_MAX_POINTS) {
                positions.shift();
              }
              // Cesium requires at least 2 points for polyline
              polyline.positions =
                positions.length >= 2
                  ? positions
                  : [positions[0], positions[0]];
            }
          }
        }

        // ── Remove vessels no longer in data ────────────────
        for (const [mmsi, bb] of billboardMap.current) {
          if (!currentMMSIs.has(mmsi)) {
            bc.remove(bb);
            billboardMap.current.delete(mmsi);

            const lb = labelMap.current.get(mmsi);
            if (lb) { lc.remove(lb); labelMap.current.delete(mmsi); }

            const wk = wakeMap.current.get(mmsi);
            if (wk) { wc.remove(wk.polyline); wakeMap.current.delete(mmsi); }
          }
        }

        // ── Update left panel counter ────────────────────────
        const store = useCommandStore.getState() as any;
        store.setLayerCount?.('vessels', currentMMSIs.size);

        console.log(
          `[VESSELS] ${currentMMSIs.size} vessels tracked`,
          `(${vessels.filter(v => v.type === 35).length} military)`
        );

      } catch (e: any) {
        clearTimeout(timeoutId);
        if (e?.name === 'AbortError') return; // intentional cancel
        console.error('[VESSELS] Fetch error:', e);
      }
    };

    // ── Click handler — select vessel entity ──────────────────
    const clickHandler = new Cesium.ScreenSpaceEventHandler(
      viewer.scene.canvas
    );
    clickHandler.setInputAction(
      (click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        try {
          const picked = viewer.scene.pick(click.position);
          if (
            Cesium.defined(picked) &&
            picked.id?.type === 'vessel'
          ) {
            const d = picked.id.data;
            useCommandStore.getState().selectEntity({
              type: 'vessel',
              data: {
                mmsi: d.mmsi,
                name: d.name,
                type: d.type,
                typeName: d.typeName,
                lat: d.lat,
                lng: d.lng,
                speed: d.speed,
                heading: d.heading,
                course: d.course,
                destination: d.destination,
                timestamp: d.timestamp,
              },
            });

            // Drone-zoom to vessel — 800m alt, -45° pitch, 2.2s
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(
                d.lng, d.lat, 800
              ),
              orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-45),
                roll: 0,
              },
              duration: 2.2,
              easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
            });
          }
        } catch {
          // Ignore pick errors on tile boundaries
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    // Initial fetch immediately on mount
    fetchAndRender();

    // Poll every 60 seconds
    // AIS data itself only updates every 30-180s depending on vessel speed
    // so 60s polling is appropriate and doesn't hammer the API
    intervalRef.current = setInterval(fetchAndRender, POLL_INTERVAL_MS);

    // ── Cleanup ──────────────────────────────────────────────
    return () => {
      mountedRef.current = false;
      clearInterval(intervalRef.current);
      abortRef.current?.abort();
      clickHandler.destroy();

      if (!viewer.isDestroyed()) {
        if (shipCollRef.current)
          viewer.scene.primitives.remove(shipCollRef.current);
        if (wakeCollRef.current)
          viewer.scene.primitives.remove(wakeCollRef.current);
        if (labelCollRef.current)
          viewer.scene.primitives.remove(labelCollRef.current);
      }

      shipCollRef.current = null;
      wakeCollRef.current = null;
      labelCollRef.current = null;
      billboardMap.current.clear();
      labelMap.current.clear();
      wakeMap.current.clear();
    };
  }, [globeReady]); // Re-run when globe finishes initializing

  return null;
}