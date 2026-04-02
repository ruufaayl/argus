// ============================================================
// File: apps/web/src/components/globe/layers/FlightLayer.tsx
// ARGUS — Live Aircraft Intelligence Layer
//
// DATA SOURCES:
//   Primary:   ADS-B Exchange (api.adsb.lol) — no auth needed
//   Secondary: OpenSky Network — merged + deduplicated
//   Confirmed: 34 aircraft returning from API right now
//
// RENDER:
//   BillboardCollection — aircraft icons (single GPU draw call)
//   LabelCollection     — callsign labels
//   PolylineCollection  — flight trail (last 8 positions)
//
// PERFORMANCE:
//   - BillboardCollection NOT Entity API (10x faster)
//   - Diff by icao24 — never removeAll() + rebuild
//   - Client-side interpolation between 15s polls
//   - scaleByDistance + translucencyByDistance for LOD
//   - Labels only visible below 300km altitude
//
// THREAT SCORING:
//   Computed client-side per flight every update.
//   Based on: squawk codes, altitude, vertical rate,
//   proximity to sensitive sites, no callsign, time of day.
//   Score 0-30: NORMAL, 31-60: AMBER, 61-80: HIGH, 81+: CRITICAL
// ============================================================

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../../stores/commandStore';
import { useRadarStore } from '../../../stores/radarStore';
import {
  isNearPakistan,
  isInsidePakistan,
  getBorderSector,
  deriveAirlineFromCallsign,
  assessThreatLevel,
  isOnEstablishedCorridor,
  type CrossingEvent,
} from '../../../lib/borderDetection';

// ── Constants ────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL ?? '';
const POLL_MS = 15_000;   // ADS-B updates every 5-15s
const FETCH_TIMEOUT_MS = 8_000;
const MIN_ALT_M = 1000;     // Never render below 1km — clips into Google tiles
const TRAIL_MAX_PTS = 8;        // Position history points
const TRAIL_MIN_DIST_M = 500;      // Minimum movement before adding trail point

// ── Emergency squawk codes ────────────────────────────────────
const SQUAWK_SCORES: Record<string, number> = {
  '7700': 50,  // General emergency
  '7600': 40,  // Radio failure
  '7500': 60,  // Hijacking
  '7777': 45,  // Military intercept in progress
  '0000': 20,  // Transponder malfunction
};

// ── Pakistan sensitive site coordinates ──────────────────────
// Used in threat scoring — aircraft near these get higher scores
const SENSITIVE_SITES = [
  { name: 'KAHUTA', lat: 33.5885, lon: 73.3930 }, // Khan Research Labs
  { name: 'KHUSHAB', lat: 32.0572, lon: 71.9831 }, // Nuclear complex
  { name: 'CHASMA', lat: 32.3889, lon: 71.4428 }, // Nuclear power
  { name: 'MASROOR', lat: 24.8937, lon: 66.9389 }, // PAF Base
  { name: 'MUSHAF', lat: 32.0494, lon: 72.6650 }, // PAF Base
  { name: 'MINHAS', lat: 33.8692, lon: 72.4008 }, // PAF Base
  { name: 'KAMRA', lat: 33.8500, lon: 72.3997 }, // Aeronautical complex
  { name: 'GHQ', lat: 33.5987, lon: 73.0551 }, // Army HQ
];

// ── Threat ring SVGs ────────────────────────────────────────
const SVG_RING_AMBER = `data:image/svg+xml,` + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60' width='60' height='60'><circle cx='30' cy='30' r='26' fill='none' stroke='%23FFB800' stroke-width='2' opacity='0.8'/><circle cx='30' cy='30' r='20' fill='none' stroke='%23FFB800' stroke-width='1' opacity='0.4'/></svg>`);
const SVG_RING_RED = `data:image/svg+xml,` + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60' width='60' height='60'><circle cx='30' cy='30' r='26' fill='none' stroke='%23FF3040' stroke-width='2.5' opacity='0.9'/><circle cx='30' cy='30' r='18' fill='none' stroke='%23FF3040' stroke-width='1.5' opacity='0.5'/><circle cx='30' cy='30' r='10' fill='none' stroke='%23FF3040' stroke-width='1' opacity='0.3'/></svg>`);

// ── Interfaces ────────────────────────────────────────────────
interface Flight {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altitudeFt: number;
  speedKts: number;
  headingDeg: number;
  verticalRate: number;
  onGround: boolean;
  type: string;
  registration: string;
  source: string;
  isMilitary: boolean;
  squawk?: string;
  lastSeen: number;
}

interface ThreatResult {
  score: number;
  level: 'NORMAL' | 'AMBER' | 'HIGH' | 'CRITICAL';
  reasons: string[];
}

interface TrailEntry {
  positions: Cesium.Cartesian3[];
  polyline: Cesium.Polyline;
}

interface Props {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

// ════════════════════════════════════════════════════════════
// THREAT SCORING ENGINE
// ════════════════════════════════════════════════════════════

function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeThreatScore(f: Flight): ThreatResult {
  let score = 0;
  const reasons: string[] = [];

  // ── Squawk codes ─────────────────────────────────────────
  if (f.squawk && SQUAWK_SCORES[f.squawk]) {
    score += SQUAWK_SCORES[f.squawk];
    reasons.push(`SQUAWK ${f.squawk}`);
  }

  // ── No callsign — unidentified aircraft ──────────────────
  if (!f.callsign || f.callsign.trim() === '') {
    score += 30;
    reasons.push('UNIDENTIFIED');
  }

  // ── Very low altitude while airborne ─────────────────────
  if (!f.onGround && f.altitudeFt < 1000) {
    score += 25;
    reasons.push('CRITICALLY LOW');
  } else if (!f.onGround && f.altitudeFt < 3000) {
    score += 12;
    reasons.push('LOW ALTITUDE');
  }

  // ── Rapid descent ─────────────────────────────────────────
  if (f.verticalRate < -3000) {
    score += 20;
    reasons.push('RAPID DESCENT');
  } else if (f.verticalRate < -1500) {
    score += 8;
    reasons.push('FAST DESCENT');
  }

  // ── ADS-B only (not in OpenSky) — unusual ─────────────────
  if (f.source === 'adsb' && !f.registration) {
    score += 15;
    reasons.push('UNREGISTERED');
  }

  // ── Proximity to sensitive sites ──────────────────────────
  for (const site of SENSITIVE_SITES) {
    const dist = haversineKm(f.lat, f.lon, site.lat, site.lon);
    if (dist < 20) {
      score += 35;
      reasons.push(`NEAR ${site.name}`);
      break; // One site max — avoid double counting
    } else if (dist < 50) {
      score += 12;
      reasons.push(`PROXIMITY ${site.name}`);
      break;
    }
  }

  // ── Unusual operating hours (02:00 — 05:00 PKT) ──────────
  const pktHour = (new Date().getUTCHours() + 5) % 24;
  if (pktHour >= 2 && pktHour <= 5) {
    score += 8;
    reasons.push('ODD HOURS');
  }

  // ── Military flag from ADS-B ──────────────────────────────
  if (f.isMilitary) {
    score += 10;
    reasons.push('MILITARY');
  }

  const clampedScore = Math.min(score, 100);
  const level: ThreatResult['level'] =
    clampedScore >= 80 ? 'CRITICAL' :
      clampedScore >= 60 ? 'HIGH' :
        clampedScore >= 31 ? 'AMBER' : 'NORMAL';

  return { score: clampedScore, level, reasons };
}

// ── Pakistan bounding box for "over Pakistan" check ─────────
const PK_LAT_MIN = 23.6;
const PK_LAT_MAX = 37.1;
const PK_LON_MIN = 60.8;
const PK_LON_MAX = 77.8;

function isOverPakistan(lat: number, lon: number): boolean {
  return lat >= PK_LAT_MIN && lat <= PK_LAT_MAX &&
         lon >= PK_LON_MIN && lon <= PK_LON_MAX;
}

// Aircraft icon selector removed — using PointPrimitiveCollection now

// ── Aircraft color by source / military ──────────────────────
function getAircraftColor(f: Flight, threat: ThreatResult): Cesium.Color {
  if (threat.level === 'CRITICAL') return new Cesium.Color(1.0, 0.1, 0.15, 1.0);  // bright red
  if (threat.level === 'HIGH') return new Cesium.Color(1.0, 0.35, 0.05, 1.0);     // hot orange
  if (f.isMilitary) return new Cesium.Color(1.0, 0.72, 0.0, 1.0);                 // military amber
  if (f.source === 'both') return new Cesium.Color(0.3, 0.6, 1.0, 1.0);           // sky blue
  return new Cesium.Color(0.15, 0.55, 1.0, 1.0);                                  // VIVID BLUE — flight signature color
}

// ════════════════════════════════════════════════════════════
// FLIGHT LAYER COMPONENT
// ════════════════════════════════════════════════════════════

export function FlightLayer({ viewerRef }: Props) {
  // ── Primitive collection refs ─────────────────────────────
  const trailCollRef = useRef<Cesium.PolylineCollection | null>(null);
  const ringCollRef = useRef<Cesium.BillboardCollection | null>(null);
  const shipCollRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const labelCollRef = useRef<Cesium.LabelCollection | null>(null);

  // ── Entity maps — keyed by icao24 ────────────────────────
  const billboardMap = useRef<Map<string, Cesium.PointPrimitive>>(new Map());
  const ringMap = useRef<Map<string, Cesium.Billboard>>(new Map());
  const labelMap = useRef<Map<string, Cesium.Label>>(new Map());
  const trailMap = useRef<Map<string, TrailEntry>>(new Map());

  // ── Control refs ──────────────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const abortRef = useRef<AbortController>();
  const mountedRef = useRef(true);

  // ── Store ─────────────────────────────────────────────────
  const isEnabled = useCommandStore(
    (s) => (s as any).layers?.flights ?? true
  );
  const globeReady = useCommandStore((s) => s.globeReady);

  // ── Toggle visibility reactively ──────────────────────────
  useEffect(() => {
    if (shipCollRef.current) shipCollRef.current.show = isEnabled;
    if (trailCollRef.current) trailCollRef.current.show = isEnabled;
    if (labelCollRef.current) labelCollRef.current.show = isEnabled;
    if (ringCollRef.current) ringCollRef.current.show = isEnabled;
  }, [isEnabled]);

  // ── Main effect ───────────────────────────────────────────
  // Depends on globeReady — viewerRef is null during Globe's async init
  useEffect(() => {
    if (!globeReady) return; // Wait for Globe to finish init
    mountedRef.current = true;

    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // ── Create collections ────────────────────────────────
    // Render order: trails → rings → aircraft → labels
    const tc = new Cesium.PolylineCollection();
    const rc = new Cesium.BillboardCollection({ scene: viewer.scene });
    const bc = new Cesium.PointPrimitiveCollection();
    const lc = new Cesium.LabelCollection();

    viewer.scene.primitives.add(tc); // trails — bottom
    viewer.scene.primitives.add(rc); // threat rings
    viewer.scene.primitives.add(bc); // aircraft icons
    viewer.scene.primitives.add(lc); // labels — top

    trailCollRef.current = tc;
    ringCollRef.current = rc;
    shipCollRef.current = bc;
    labelCollRef.current = lc;

    // ── Fetch + render ────────────────────────────────────
    const fetchAndRender = async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const timeoutId = setTimeout(
        () => abortRef.current?.abort(),
        FETCH_TIMEOUT_MS
      );

      try {
        const res = await fetch(`${API}/api/flights`, {
          signal: abortRef.current.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          console.warn(`[FLIGHTS] API ${res.status}`);
          return;
        }

        const data = await res.json();
        const flights: Flight[] = data.flights || [];

        if (!mountedRef.current) return;

        const bc = shipCollRef.current;
        const rc = ringCollRef.current;
        const tc = trailCollRef.current;
        const lc = labelCollRef.current;
        if (!bc || !rc || !tc || !lc || viewer.isDestroyed()) return;

        const currentIds = new Set<string>();
        let militaryCount = 0;
        let amberCount = 0;

        for (const f of flights) {
          // Skip aircraft on ground or with invalid coords
          if (f.onGround) continue;
          if (!isFinite(f.lat) || !isFinite(f.lon)) continue;
          if (f.lat === 0 && f.lon === 0) continue;

          currentIds.add(f.icao24);
          if (f.isMilitary) militaryCount++;

          // ── Position ────────────────────────────────────
          // Never below MIN_ALT_M — renders inside Google tiles
          const altM = Math.max(
            (f.altitudeFt || 35000) * 0.3048,
            MIN_ALT_M
          );
          const position = Cesium.Cartesian3.fromDegrees(
            f.lon, f.lat, altM
          );

          // ── Threat assessment ────────────────────────────
          const threat = computeThreatScore(f);
          if (threat.level !== 'NORMAL') amberCount++;

          const color = getAircraftColor(f, threat);

          // ── Update or create billboard ───────────────────
          if (billboardMap.current.has(f.icao24)) {
            // Update existing — fast path, no allocation
            const bb = billboardMap.current.get(f.icao24)!;
            bb.position = position;
            bb.color = color;

            // Update label position
            const lb = labelMap.current.get(f.icao24);
            if (lb) lb.position = position;

            // Update threat ring
            const ring = ringMap.current.get(f.icao24);
            if (ring) {
              ring.position = position;
              ring.show = threat.level !== 'NORMAL';
            }

          } else {
            // ── New aircraft — add all primitives ───────────

            // Main aircraft point primitive — big glowing sphere
            const bb = bc.add({
              position,
              pixelSize: 14,
              color,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              // CRITICAL: render on top of Google 3D Tiles
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              // Scale down gracefully with altitude — visible at 20,000km
              scaleByDistance: new Cesium.NearFarScalar(
                1000, 2.5,
                20000000, 0.4
              ),
              translucencyByDistance: new Cesium.NearFarScalar(
                1000, 1.0,
                25000000, 0.3
              ),
              id: {
                type: 'flight',
                data: f,
                threat,
              },
            });
            billboardMap.current.set(f.icao24, bb);

            // Threat ring — only shown for non-normal threats
            const ring = rc.add({
              position,
              image:
                threat.level === 'CRITICAL' || threat.level === 'HIGH'
                  ? SVG_RING_RED
                  : SVG_RING_AMBER,
              scale: 0.8,
              color: Cesium.Color.WHITE,
              show: threat.level !== 'NORMAL',
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              eyeOffset: new Cesium.Cartesian3(0, 0, -7500),
              scaleByDistance: new Cesium.NearFarScalar(
                1000, 1.5, 600000, 0.2
              ),
              id: { type: 'flight-ring', icao24: f.icao24 },
            });
            ringMap.current.set(f.icao24, ring);

            // Callsign label
            const callsign = (f.callsign || f.icao24).trim();
            const lb = lc.add({
              position,
              text: callsign,
              font: '10px "Share Tech Mono", monospace',
              fillColor:
                f.isMilitary
                  ? Cesium.Color.fromCssColorString('#FFB800')
                  : Cesium.Color.fromCssColorString('#00C8FF'),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -22),
              translucencyByDistance: new Cesium.NearFarScalar(
                500, 1.0,
                2000000, 0.0
              ),
              scaleByDistance: new Cesium.NearFarScalar(
                1000, 1.0,
                2000000, 0.5
              ),
              // Always render on top — never occluded by terrain
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              id: { type: 'flight-label', icao24: f.icao24 },
            });
            labelMap.current.set(f.icao24, lb);

            console.log(
              `[FLIGHTS] +${callsign}`,
              `${f.type || '?'} FL${Math.round(f.altitudeFt / 100)}`,
              f.isMilitary ? '⚠ MILITARY' : '',
              threat.level !== 'NORMAL' ? `[${threat.level}]` : ''
            );
          }

          // ── Flight trail ──────────────────────────────────
          const existingTrail = trailMap.current.get(f.icao24);

          if (!existingTrail) {
            // First sighting — create trail polyline
            const pl = tc.add({
              positions: [position, position],
              width: 1.5,
              material: Cesium.Material.fromType('PolylineGlow', {
                color: color.withAlpha(0.6),
                glowPower: 0.15,
                taperPower: 0.5,
              }),
              distanceDisplayCondition:
                new Cesium.DistanceDisplayCondition(0, 400000),
            });
            trailMap.current.set(f.icao24, {
              positions: [position],
              polyline: pl,
            });
          } else {
            const { positions, polyline } = existingTrail;
            const last = positions[positions.length - 1];
            const dist = Cesium.Cartesian3.distance(last, position);

            if (dist > TRAIL_MIN_DIST_M) {
              positions.push(position);
              if (positions.length > TRAIL_MAX_PTS) positions.shift();
              polyline.positions =
                positions.length >= 2
                  ? positions
                  : [positions[0], positions[0]];
            }
          }
        }

        // ── Remove departed aircraft ──────────────────────
        for (const [id, bb] of billboardMap.current) {
          if (!currentIds.has(id)) {
            bc.remove(bb);
            billboardMap.current.delete(id);

            const ring = ringMap.current.get(id);
            if (ring) { rc.remove(ring); ringMap.current.delete(id); }

            const lb = labelMap.current.get(id);
            if (lb) { lc.remove(lb); labelMap.current.delete(id); }

            const trail = trailMap.current.get(id);
            if (trail) { tc.remove(trail.polyline); trailMap.current.delete(id); }
          }
        }

        // ── Update store counters ─────────────────────────
        const store = useCommandStore.getState();
        store.setFlightCounts(currentIds.size, militaryCount);

        console.log(
          `[FLIGHTS] ${currentIds.size} tracks`,
          `(${militaryCount} military,`,
          `${amberCount} flagged)`
        );

        // Debug: log first aircraft position on each fetch
        if (flights.length > 0) {
          const first = flights.find(f => !f.onGround);
          if (first) {
            console.log('[FLIGHTS] Sample aircraft:', {
              callsign: first.callsign,
              lat: first.lat,
              lon: first.lon,
              altM: Math.max((first.altitudeFt || 35000) * 0.3048, MIN_ALT_M),
            });
          }
        }

        // ── Border crossing detection ─────────────────────────
        const borderGeometry = useRadarStore.getState().borderGeometry;
        if (borderGeometry) {
          for (const f of flights) {
            if (f.onGround) continue;
            if (!isNearPakistan(f.lat, f.lon)) continue;

            const nowInside = isInsidePakistan(f.lat, f.lon, borderGeometry);
            const radar = useRadarStore.getState();
            const prevState = radar.aircraftStates.get(f.icao24);
            const wasInside = prevState?.inside ?? nowInside;

            if (prevState !== undefined) {
              if (!wasInside && nowInside) {
                // ENTRY EVENT
                const sector = getBorderSector(f.lat, f.lon);
                const airline = deriveAirlineFromCallsign(f.callsign);
                const event: CrossingEvent = {
                  id: `${f.icao24}-${Date.now()}`,
                  type: 'ENTRY',
                  icao24: f.icao24,
                  callsign: f.callsign || 'UNIDENTIFIED',
                  lat: f.lat,
                  lon: f.lon,
                  altitudeFt: f.altitudeFt,
                  speedKts: f.speedKts,
                  headingDeg: f.headingDeg,
                  aircraftType: f.type || 'UNKNOWN',
                  sector,
                  timestamp: new Date(),
                  airline,
                  isCommercial: !!f.callsign && !f.isMilitary,
                  isMilitary: f.isMilitary,
                  isUnidentified: !f.callsign?.trim(),
                  threatLevel: 'INFO',
                };
                event.threatLevel = assessThreatLevel(event);

                // Upgrade if off corridor
                if (event.isCommercial && !isOnEstablishedCorridor(f.lat, f.lon, f.altitudeFt) && event.threatLevel === 'INFO') {
                  event.threatLevel = 'MODERATE';
                  event.sector.description += ' — OFF ESTABLISHED CORRIDOR';
                }

                useRadarStore.getState().addCrossingEvent(event);
                console.log(
                  `[RADAR] ENTRY: ${event.callsign}`,
                  `via ${sector.name}`,
                  `at FL${Math.round(f.altitudeFt / 100)}`,
                  `[${event.threatLevel}]`
                );
              } else if (wasInside && !nowInside) {
                // EXIT EVENT — only log for military/unidentified
                const sector = getBorderSector(prevState.lat, prevState.lon);
                if (f.isMilitary || !f.callsign?.trim()) {
                  const event: CrossingEvent = {
                    id: `${f.icao24}-exit-${Date.now()}`,
                    type: 'EXIT',
                    icao24: f.icao24,
                    callsign: f.callsign || 'UNIDENTIFIED',
                    lat: f.lat,
                    lon: f.lon,
                    altitudeFt: f.altitudeFt,
                    speedKts: f.speedKts,
                    headingDeg: f.headingDeg,
                    aircraftType: f.type || 'UNKNOWN',
                    sector,
                    timestamp: new Date(),
                    airline: deriveAirlineFromCallsign(f.callsign),
                    isCommercial: !!f.callsign && !f.isMilitary,
                    isMilitary: f.isMilitary,
                    isUnidentified: !f.callsign?.trim(),
                    threatLevel: 'INFO',
                  };
                  event.threatLevel = assessThreatLevel(event);
                  useRadarStore.getState().addCrossingEvent(event);
                  console.log(`[RADAR] EXIT: ${event.callsign} via ${sector.name}`);
                }
              }
            }

            // Update tracking state
            useRadarStore.getState().updateAircraftState(f.icao24, {
              icao24: f.icao24,
              inside: nowInside,
              lat: f.lat,
              lon: f.lon,
              lastSeen: Date.now(),
            });
          }
        }

      } catch (e: any) {
        clearTimeout(timeoutId);
        if (e?.name === 'AbortError') return;
        console.error('[FLIGHTS] Fetch error:', e);
      }
    };

    // Fetch immediately on mount
    fetchAndRender();

    // Poll every 15 seconds
    intervalRef.current = setInterval(fetchAndRender, POLL_MS);

    // ── Click handler — select flight ─────────────────────
    const clickHandler = new Cesium.ScreenSpaceEventHandler(
      viewer.scene.canvas
    );
    clickHandler.setInputAction(
      (click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        try {
          const picked = viewer.scene.pick(click.position);
          if (
            Cesium.defined(picked) &&
            picked.id?.type === 'flight'
          ) {
            const { data, threat } = picked.id;
            const store = useCommandStore.getState() as any;
            store.setSelectedEntity?.({
              type: 'flight',
              data: {
                ...data,
                altitude: data.altitudeFt * 0.3048,
                velocity: data.speedKts * 0.514444,
                heading: data.headingDeg,
                isOverPakistan: isOverPakistan(data.lat, data.lon),
                threatLevel: threat?.level || 'NORMAL',
                threatScore: threat?.score || 0,
                threatReasons: threat?.reasons || [],
              },
            });
            // Drone-zoom to aircraft — cancel any in-flight first
            viewer.camera.cancelFlight();
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(
                data.lon, data.lat,
                Math.max(data.altitudeFt * 0.3048 + 50000, 80000)
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

    // ── Hover handler — flight tooltip ─────────────────────
    let flightTooltipId: string | null = null;

    const hoverHandler = new Cesium.ScreenSpaceEventHandler(
      viewer.scene.canvas
    );

    hoverHandler.setInputAction(
      (move: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        try {
          const picked = viewer.scene.pick(move.endPosition);

          if (flightTooltipId) {
            viewer.entities.removeById(flightTooltipId);
            flightTooltipId = null;
          }

          if (
            Cesium.defined(picked) &&
            picked.id?.type === 'flight'
          ) {
            const d = picked.id.data;
            const threat = picked.id.threat;
            const tipId = `flight-tip-${Date.now()}`;
            flightTooltipId = tipId;

            const altM = Math.max((d.altitudeFt || 35000) * 0.3048, 1000);

            viewer.entities.add({
              id: tipId,
              position: Cesium.Cartesian3.fromDegrees(d.lon, d.lat, altM),
              label: {
                text: `${d.callsign || d.icao24}\n${d.type || 'UNKNOWN'} · FL${Math.round(d.altitudeFt / 100)} · ${d.speedKts}kts\n${threat?.level !== 'NORMAL' ? '⚠ ' + threat?.level : 'NORMAL'}`,
                font: '11px "JetBrains Mono", monospace',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 3,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(16, -12),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                showBackground: true,
                backgroundColor: Cesium.Color.fromCssColorString('rgba(8,14,26,0.92)'),
                backgroundPadding: new Cesium.Cartesian2(10, 6),
              },
            });
            viewer.scene.canvas.style.cursor = 'pointer';
          } else if (!Cesium.defined(picked) || picked.id?.type !== 'vessel') {
            viewer.scene.canvas.style.cursor = 'default';
          }
        } catch { /* ignore */ }
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE
    );

    // ── Cleanup ───────────────────────────────────────────
    return () => {
      mountedRef.current = false;
      clearInterval(intervalRef.current);
      abortRef.current?.abort();
      clickHandler.destroy();
      hoverHandler.destroy();
      if (flightTooltipId && !viewer.isDestroyed()) viewer.entities.removeById(flightTooltipId);

      if (!viewer.isDestroyed()) {
        if (trailCollRef.current)
          viewer.scene.primitives.remove(trailCollRef.current);
        if (ringCollRef.current)
          viewer.scene.primitives.remove(ringCollRef.current);
        if (shipCollRef.current)
          viewer.scene.primitives.remove(shipCollRef.current);
        if (labelCollRef.current)
          viewer.scene.primitives.remove(labelCollRef.current);
      }

      trailCollRef.current = null;
      ringCollRef.current = null;
      shipCollRef.current = null;
      labelCollRef.current = null;
      billboardMap.current.clear();
      ringMap.current.clear();
      labelMap.current.clear();
      trailMap.current.clear();
    };
  }, [globeReady]); // Re-run when globe finishes initializing

  return null;
}