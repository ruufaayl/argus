// ============================================================
// FlightLayer3D — 3D GLTF aircraft models with trails & hover
// Uses Cesium Entity API for model positioning and orientation.
// ============================================================

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import type { AltitudeZone } from '@argus/shared';
import type { FlightDetail } from '../../types/flight';

interface FlightLayer3DProps {
  viewerRef: React.RefObject<Cesium.Viewer | null>;
  flights: FlightDetail[];
  visible: boolean;
  currentZone: AltitudeZone;
  onSelectFlight: (f: FlightDetail | null) => void;
  selectedFlight: FlightDetail | null;
}

// ── Aircraft model map ──
const MODEL_MAP: Record<string, string> = {
  'A318': '/models/glTF2/A318.glb',
  'A319': '/models/glTF2/A319.glb',
  'A320': '/models/glTF2/A320.glb',
  'A321': '/models/glTF2/A321.glb',
  'A388': '/models/glTF2/A380.glb',
  'A380': '/models/glTF2/A380.glb',
  'AT75': '/models/glTF2/AT75.glb',
  'AT72': '/models/glTF2/AT75.glb',
  'B741': '/models/glTF2/B747.glb',
  'B742': '/models/glTF2/B747.glb',
  'B743': '/models/glTF2/B747.glb',
  'B744': '/models/glTF2/B747.glb',
  'B748': '/models/glTF2/B747.glb',
  'B747': '/models/glTF2/B747.glb',
  'B788': '/models/glTF2/B788.glb',
  'B789': '/models/glTF2/B788.glb',
  'B78X': '/models/glTF2/B788.glb',
  'default': '/models/glTF2/A320.glb',
};

function getModelUri(icaoType: string): string {
  return MODEL_MAP[icaoType?.toUpperCase()] ?? MODEL_MAP['default'];
}

const VISIBLE_ZONES: AltitudeZone[] = ['APPROACH', 'CITY', 'DISTRICT', 'STREET', 'GROUND'];

export function FlightLayer3D({
  viewerRef,
  flights,
  visible,
  currentZone,
  onSelectFlight,
  selectedFlight,
}: FlightLayer3DProps) {
  const entitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const trailEntitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const handlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Auto-select first flight for "Live Flight Lock"
  useEffect(() => {
    if (visible && VISIBLE_ZONES.includes(currentZone) && flights.length > 0 && !selectedFlight) {
       onSelectFlight(flights[0]);
    }
  }, [flights, visible, currentZone, selectedFlight, onSelectFlight]);

  // Create tooltip + event handlers once
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // Tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = 'flight-tooltip';
    tooltip.style.cssText = `
      position: absolute; pointer-events: none; display: none; z-index: 1000;
      background: rgba(2, 8, 18, 0.95); border: 1px solid rgba(0, 220, 255, 0.35);
      border-radius: 6px; padding: 8px 12px; font-family: 'Share Tech Mono', monospace;
      font-size: 11px; color: #c0ccd6; box-shadow: 0 4px 24px rgba(0,0,0,0.7);
    `;
    viewer.container.appendChild(tooltip);
    tooltipRef.current = tooltip;

    // Event handler
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    // Hover
    handler.setInputAction((mv: { endPosition: Cesium.Cartesian2 }) => {
      const picked = viewer.scene.pick(mv.endPosition);
      if (Cesium.defined(picked) && picked.id && picked.id._flightData) {
        const fd = picked.id._flightData as FlightDetail;
        tooltip.innerHTML = `
          <div style="color:#00dcff;font-weight:bold;margin-bottom:4px;">✈ ${fd.callsign}</div>
          <div style="color:#6d7a86;">${fd.icaoType} · ${fd.originCountry}</div>
          <div>${fd.altitudeFt.toLocaleString()} ft · ${fd.velocityKnots} kts</div>
        `;
        tooltip.style.display = 'block';
        tooltip.style.left = `${mv.endPosition.x + 16}px`;
        tooltip.style.top = `${mv.endPosition.y - 10}px`;
        (document.body.style.cursor as string) = 'pointer';

        // Highlight silhouette
        const entity = picked.id as Cesium.Entity;
        if (entity.model) {
          entity.model.silhouetteSize = new Cesium.ConstantProperty(2.0);
        }
      } else {
        tooltip.style.display = 'none';
        (document.body.style.cursor as string) = 'default';
        // Remove silhouettes
        entitiesRef.current.forEach((e) => {
          if (e.model) e.model.silhouetteSize = new Cesium.ConstantProperty(0);
        });
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // Click
    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id._flightData) {
        onSelectFlight(picked.id._flightData as FlightDetail);
      } else {
        onSelectFlight(null);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handlerRef.current = handler;

    return () => {
      handler.destroy();
      if (viewer.container.contains(tooltip)) viewer.container.removeChild(tooltip);
      handlerRef.current = null;
      tooltipRef.current = null;
    };
  }, [viewerRef, onSelectFlight]);

  // Update aircraft entities
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const isVisible = visible && VISIBLE_ZONES.includes(currentZone);

    // Hide all if not visible
    if (!isVisible) {
      entitiesRef.current.forEach((e) => { e.show = false; });
      trailEntitiesRef.current.forEach((e) => { e.show = false; });
      return;
    }

    const currentIds = new Set(flights.map((f) => f.icao24));

    // Remove stale entities
    entitiesRef.current.forEach((entity, id) => {
      if (!currentIds.has(id)) {
        viewer.entities.remove(entity);
        entitiesRef.current.delete(id);
      }
    });
    trailEntitiesRef.current.forEach((entity, id) => {
      if (!currentIds.has(id)) {
        viewer.entities.remove(entity);
        trailEntitiesRef.current.delete(id);
      }
    });

    flights.forEach((flight) => {
      const pos = Cesium.Cartesian3.fromDegrees(flight.longitude, flight.latitude, flight.altitude);
      const hpr = new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(flight.heading), 0, 0);
      const orientation = Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);

      const existing = entitiesRef.current.get(flight.icao24);
      const isSelected = selectedFlight?.icao24 === flight.icao24;

      if (existing) {
        // Update position
        existing.position = new Cesium.ConstantPositionProperty(pos);
        existing.orientation = new Cesium.ConstantProperty(orientation);
        existing.show = true;
        if (existing.model) {
          existing.model.silhouetteSize = new Cesium.ConstantProperty(isSelected ? 2.0 : 0);
        }
        // Store flight data for picking
        (existing as any)._flightData = flight;
      } else {
        // Create new entity
        const entity = viewer.entities.add({
          position: pos,
          orientation: orientation as any,
          model: {
            uri: getModelUri(flight.icaoType),
            minimumPixelSize: 24,
            maximumScale: 20000,
            silhouetteColor: Cesium.Color.CYAN,
            silhouetteSize: isSelected ? 2.0 : 0,
            color: Cesium.Color.WHITE.withAlpha(1.0),
            colorBlendMode: Cesium.ColorBlendMode.HIGHLIGHT,
            colorBlendAmount: 0.3,
          },
          label: {
            text: flight.callsign,
            font: 'bold 12px "Share Tech Mono"',
            fillColor: Cesium.Color.CYAN,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -30),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            show: true,
          },
        });
        (entity as any)._flightData = flight;
        entitiesRef.current.set(flight.icao24, entity);
      }

      // Trail polyline
      if (flight.trailPositions.length >= 2) {
        const trailCartesians = flight.trailPositions.map(
          ([lng, lat, alt]) => Cesium.Cartesian3.fromDegrees(lng, lat, alt)
        );

        const existingTrail = trailEntitiesRef.current.get(flight.icao24);
        if (existingTrail) {
          if (existingTrail.polyline) {
            existingTrail.polyline.positions = new Cesium.ConstantProperty(trailCartesians);
          }
          existingTrail.show = true;
        } else {
          const trailEntity = viewer.entities.add({
            polyline: {
              positions: trailCartesians,
              width: 2.0,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.15,
                color: Cesium.Color.CYAN.withAlpha(0.5),
              }),
            },
          });
          trailEntitiesRef.current.set(flight.icao24, trailEntity);
        }
      }
    });
  }, [flights, visible, currentZone, selectedFlight, viewerRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const viewer = viewerRef.current;
      if (viewer && !viewer.isDestroyed()) {
        entitiesRef.current.forEach((e) => viewer.entities.remove(e));
        trailEntitiesRef.current.forEach((e) => viewer.entities.remove(e));
      }
      entitiesRef.current.clear();
      trailEntitiesRef.current.clear();
    };
  }, [viewerRef]);

  return null;
}
