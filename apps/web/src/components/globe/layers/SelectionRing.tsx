// ============================================================
// SelectionRing — Pulsing ring around selected entity (P2)
// Renders a Cesium EllipseGeometry at the entity's position
// with animated opacity pulse via requestAnimationFrame
// ============================================================

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../../stores/commandStore';

interface Props {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

function getEntityPosition(entity: ReturnType<typeof useCommandStore.getState>['selectedEntity']): {
  lat: number; lon: number; alt: number;
} | null {
  if (!entity) return null;
  switch (entity.type) {
    case 'flight':
      return { lat: entity.data.lat, lon: entity.data.lon, alt: entity.data.altitude };
    case 'landmark':
      return { lat: entity.data.lat, lon: entity.data.lng, alt: 0 };
    case 'vessel':
      return { lat: entity.data.lat, lon: entity.data.lng, alt: 5 };
    case 'satellite':
      return { lat: entity.data.lat, lon: entity.data.lon, alt: entity.data.altKm * 1000 };
    case 'cctv':
      return { lat: entity.data.lat, lon: entity.data.lng, alt: 0 };
    default:
      return null;
  }
}

function getEntityColor(entity: ReturnType<typeof useCommandStore.getState>['selectedEntity']): Cesium.Color {
  if (!entity) return Cesium.Color.CYAN;
  switch (entity.type) {
    case 'flight':
      return entity.data.isMilitary
        ? Cesium.Color.fromCssColorString('#FFB800')
        : Cesium.Color.fromCssColorString('#00C8FF');
    case 'landmark':
      return Cesium.Color.fromCssColorString('#00C8FF');
    case 'vessel':
      return entity.data.type === 35
        ? Cesium.Color.fromCssColorString('#FFB800')
        : Cesium.Color.fromCssColorString('#00FFCC');
    case 'satellite':
      return Cesium.Color.fromCssColorString('#00C8FF');
    case 'cctv':
      return Cesium.Color.fromCssColorString('#F43F5E');
    default:
      return Cesium.Color.CYAN;
  }
}

export function SelectionRing({ viewerRef }: Props) {
  const selectedEntity = useCommandStore((s) => s.selectedEntity);
  const entityRef = useRef<Cesium.Entity | null>(null);
  const pulseRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // Clean up previous ring
    if (entityRef.current) {
      viewer.entities.remove(entityRef.current);
      entityRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    const pos = getEntityPosition(selectedEntity);
    if (!pos) return;

    const baseColor = getEntityColor(selectedEntity);

    // Ring size scales with entity type
    const ringRadius = selectedEntity?.type === 'satellite' ? 50000
      : selectedEntity?.type === 'flight' ? 5000
      : 200; // landmarks, vessels, cctv

    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt),
      ellipse: {
        semiMajorAxis: ringRadius,
        semiMinorAxis: ringRadius,
        fill: false,
        outline: true,
        outlineColor: new Cesium.CallbackProperty(() => {
          const alpha = 0.4 + 0.5 * Math.sin(pulseRef.current);
          return baseColor.withAlpha(alpha);
        }, false) as any,
        outlineWidth: 2,
        height: pos.alt,
        numberOfVerticalLines: 0,
      },
    });

    entityRef.current = entity;

    // Animate pulse
    const animate = () => {
      pulseRef.current += 0.05;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (viewer && !viewer.isDestroyed() && entityRef.current) {
        viewer.entities.remove(entityRef.current);
      }
      entityRef.current = null;
    };
  }, [selectedEntity, viewerRef]);

  return null;
}
