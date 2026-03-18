// ============================================================
// ProjectedRouteLayer — Projected flight paths & vessel routes (P3)
// Renders dashed polylines showing future position projection
// based on current heading, speed, and vertical rate.
// ============================================================

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../../stores/commandStore';
import type { SelectedEntity } from '../../../stores/commandStore';

// ── Config ──
const FLIGHT_PROJ_MINUTES = 15;       // Project 15 minutes ahead
const VESSEL_PROJ_MINUTES = 60;       // Project 60 minutes ahead (slower)
const FLIGHT_SEGMENTS = 30;           // Smoothness of projected curve
const VESSEL_SEGMENTS = 20;
const EARTH_R = 6371000;              // Earth radius in meters

// ── Colors ──
const FLIGHT_COLOR = Cesium.Color.fromCssColorString('#00C8FF').withAlpha(0.5);
const MILITARY_COLOR = Cesium.Color.fromCssColorString('#FFB800').withAlpha(0.5);
const VESSEL_COLOR = Cesium.Color.fromCssColorString('#34D399').withAlpha(0.5);
const ENDPOINT_COLOR = Cesium.Color.fromCssColorString('#F43F5E').withAlpha(0.7);

interface Props {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

// ── Great-circle forward projection ──
// Given lat/lon (radians), bearing (radians), and distance (meters),
// returns the destination lat/lon in degrees.
function projectPoint(
  latRad: number, lonRad: number,
  bearingRad: number, distMeters: number,
): { lat: number; lon: number } {
  const angDist = distMeters / EARTH_R;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinAng = Math.sin(angDist);
  const cosAng = Math.cos(angDist);

  const lat2 = Math.asin(
    sinLat * cosAng + cosLat * sinAng * Math.cos(bearingRad)
  );
  const lon2 = lonRad + Math.atan2(
    Math.sin(bearingRad) * sinAng * cosLat,
    cosAng - sinLat * Math.sin(lat2)
  );

  return {
    lat: Cesium.Math.toDegrees(lat2),
    lon: Cesium.Math.toDegrees(lon2),
  };
}

export function ProjectedRouteLayer({ viewerRef }: Props) {
  const selectedEntity = useCommandStore((s) => s.selectedEntity);
  const polylineRef = useRef<Cesium.PolylineCollection | null>(null);
  const pointRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const labelRef = useRef<Cesium.LabelCollection | null>(null);
  const prevKeyRef = useRef('');

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // Lazy-init primitive collections
    if (!polylineRef.current) {
      polylineRef.current = viewer.scene.primitives.add(
        new Cesium.PolylineCollection()
      );
    }
    if (!pointRef.current) {
      pointRef.current = viewer.scene.primitives.add(
        new Cesium.PointPrimitiveCollection()
      );
    }
    if (!labelRef.current) {
      labelRef.current = viewer.scene.primitives.add(
        new Cesium.LabelCollection()
      );
    }

    const pc = polylineRef.current!;
    const pts = pointRef.current!;
    const lc = labelRef.current!;

    // Clear previous projections
    pc.removeAll();
    pts.removeAll();
    lc.removeAll();

    if (!selectedEntity) {
      prevKeyRef.current = '';
      return;
    }

    const key = entityKey(selectedEntity);
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    if (selectedEntity.type === 'flight') {
      renderFlightProjection(selectedEntity.data, pc, pts, lc);
    } else if (selectedEntity.type === 'vessel') {
      renderVesselProjection(selectedEntity.data, pc, pts, lc);
    }

    return () => {
      // Don't destroy — just clear on next render
    };
  }, [selectedEntity, viewerRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return;
      if (polylineRef.current) {
        viewer.scene.primitives.remove(polylineRef.current);
        polylineRef.current = null;
      }
      if (pointRef.current) {
        viewer.scene.primitives.remove(pointRef.current);
        pointRef.current = null;
      }
      if (labelRef.current) {
        viewer.scene.primitives.remove(labelRef.current);
        labelRef.current = null;
      }
    };
  }, [viewerRef]);

  return null;
}

function entityKey(e: SelectedEntity): string {
  if (!e) return '';
  if (e.type === 'flight') return `f-${e.data.icao24}-${e.data.lat}-${e.data.lon}`;
  if (e.type === 'vessel') return `v-${e.data.mmsi}-${e.data.lat}-${e.data.lng}`;
  return '';
}

// ── Flight path projection ──
function renderFlightProjection(
  data: { lat: number; lon: number; altitude: number; velocity: number; heading: number; verticalRate: number; onGround: boolean; isMilitary: boolean; callsign: string },
  pc: Cesium.PolylineCollection,
  pts: Cesium.PointPrimitiveCollection,
  lc: Cesium.LabelCollection,
) {
  if (data.onGround || data.velocity < 10) return; // No projection for grounded/slow

  const latRad = Cesium.Math.toRadians(data.lat);
  const lonRad = Cesium.Math.toRadians(data.lon);
  const bearingRad = Cesium.Math.toRadians(data.heading);
  const speedMps = data.velocity; // already m/s from store
  const totalSeconds = FLIGHT_PROJ_MINUTES * 60;
  const color = data.isMilitary ? MILITARY_COLOR : FLIGHT_COLOR;

  const positions: Cesium.Cartesian3[] = [];
  let altM = data.altitude; // meters

  // Start point
  positions.push(Cesium.Cartesian3.fromDegrees(data.lon, data.lat, Math.max(altM, 1000)));

  for (let i = 1; i <= FLIGHT_SEGMENTS; i++) {
    const t = (i / FLIGHT_SEGMENTS) * totalSeconds;
    const dist = speedMps * t;
    const projected = projectPoint(latRad, lonRad, bearingRad, dist);

    // Vertical rate projection (clamp to ground)
    altM = data.altitude + data.verticalRate * t;
    if (altM < 100) altM = 100; // Don't go underground

    positions.push(Cesium.Cartesian3.fromDegrees(
      projected.lon, projected.lat, Math.max(altM, 1000)
    ));
  }

  // Dashed projected path
  pc.add({
    positions,
    width: 2.0,
    material: Cesium.Material.fromType('PolylineDash', {
      color,
      dashLength: 16.0,
      dashPattern: parseInt('1111000011110000', 2),
    }),
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500000),
  });

  // Endpoint marker
  const endPos = positions[positions.length - 1];
  pts.add({
    position: endPos,
    pixelSize: 8,
    color: ENDPOINT_COLOR,
    outlineColor: Cesium.Color.BLACK,
    outlineWidth: 1,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 400000),
  });

  // Time label at endpoint
  lc.add({
    position: endPos,
    text: `+${FLIGHT_PROJ_MINUTES}min`,
    font: '10px monospace',
    fillColor: color,
    outlineColor: Cesium.Color.BLACK,
    outlineWidth: 2,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    pixelOffset: new Cesium.Cartesian2(0, -14),
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 400000),
    scale: 1.0,
  });

  // Midpoint time marker
  const midIdx = Math.floor(positions.length / 2);
  const midPos = positions[midIdx];
  const midMin = Math.round(FLIGHT_PROJ_MINUTES / 2);
  lc.add({
    position: midPos,
    text: `+${midMin}min`,
    font: '9px monospace',
    fillColor: color.withAlpha(0.6),
    outlineColor: Cesium.Color.BLACK,
    outlineWidth: 1,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    pixelOffset: new Cesium.Cartesian2(0, -10),
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 300000),
    scale: 0.9,
  });
}

// ── Vessel route projection ──
function renderVesselProjection(
  data: { lat: number; lng: number; speed: number; heading: number; course: number; mmsi: number; name: string },
  pc: Cesium.PolylineCollection,
  pts: Cesium.PointPrimitiveCollection,
  lc: Cesium.LabelCollection,
) {
  if (data.speed < 0.5) return; // No projection for stationary vessels

  const latRad = Cesium.Math.toRadians(data.lat);
  const lonRad = Cesium.Math.toRadians(data.lng);
  // Use heading if valid, otherwise course
  const hdg = (data.heading !== 511 && data.heading >= 0 && data.heading <= 360)
    ? data.heading : data.course;
  const bearingRad = Cesium.Math.toRadians(hdg);
  const speedMps = data.speed * 0.514444; // knots to m/s
  const totalSeconds = VESSEL_PROJ_MINUTES * 60;

  const positions: Cesium.Cartesian3[] = [];
  const SEA_ALT = 5;

  // Start point
  positions.push(Cesium.Cartesian3.fromDegrees(data.lng, data.lat, SEA_ALT));

  for (let i = 1; i <= VESSEL_SEGMENTS; i++) {
    const t = (i / VESSEL_SEGMENTS) * totalSeconds;
    const dist = speedMps * t;
    const projected = projectPoint(latRad, lonRad, bearingRad, dist);
    positions.push(Cesium.Cartesian3.fromDegrees(projected.lon, projected.lat, SEA_ALT));
  }

  // Dashed projected route
  pc.add({
    positions,
    width: 2.5,
    material: Cesium.Material.fromType('PolylineDash', {
      color: VESSEL_COLOR,
      dashLength: 12.0,
      dashPattern: parseInt('1111000011110000', 2),
    }),
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500000),
  });

  // Endpoint marker
  const endPos = positions[positions.length - 1];
  pts.add({
    position: endPos,
    pixelSize: 8,
    color: ENDPOINT_COLOR,
    outlineColor: Cesium.Color.BLACK,
    outlineWidth: 1,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 400000),
  });

  // Time label at endpoint
  lc.add({
    position: endPos,
    text: `+${VESSEL_PROJ_MINUTES}min`,
    font: '10px monospace',
    fillColor: VESSEL_COLOR,
    outlineColor: Cesium.Color.BLACK,
    outlineWidth: 2,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    pixelOffset: new Cesium.Cartesian2(0, -14),
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 400000),
    scale: 1.0,
  });

  // Midpoint marker
  const midIdx = Math.floor(positions.length / 2);
  lc.add({
    position: positions[midIdx],
    text: `+${Math.round(VESSEL_PROJ_MINUTES / 2)}min`,
    font: '9px monospace',
    fillColor: VESSEL_COLOR.withAlpha(0.6),
    outlineColor: Cesium.Color.BLACK,
    outlineWidth: 1,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    pixelOffset: new Cesium.Cartesian2(0, -10),
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 300000),
    scale: 0.9,
  });
}
