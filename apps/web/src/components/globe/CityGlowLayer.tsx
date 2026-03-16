// ============================================================
// CityGlowLayer — Pulsing city markers visible from space
// ============================================================

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import type { AltitudeZone } from '@sentinel/shared';
import { CITIES } from '../../lib/cities';

interface CityGlowLayerProps {
  viewerRef: React.RefObject<Cesium.Viewer | null>;
  currentZone: AltitudeZone;
}

const VISIBLE_ZONES: AltitudeZone[] = ['SPACE', 'APPROACH', 'COUNTRY'];

export function CityGlowLayer({ viewerRef, currentZone }: CityGlowLayerProps) {
  const entitiesRef = useRef<Cesium.Entity[]>([]);
  const pulseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const entities: Cesium.Entity[] = [];

    Object.values(CITIES).forEach((city) => {
      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(city.coordinates.lng, city.coordinates.lat, 0),
        point: {
          pixelSize: 14,
          color: Cesium.Color.CYAN.withAlpha(0.7),
          outlineColor: Cesium.Color.CYAN.withAlpha(0.2),
          outlineWidth: 8,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `${city.shortCode}\n${city.name}`,
          font: '11px "Share Tech Mono", monospace',
          fillColor: Cesium.Color.CYAN.withAlpha(0.9),
          outlineColor: Cesium.Color.BLACK.withAlpha(0.6),
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -20),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      entities.push(entity);
    });

    entitiesRef.current = entities;

    let growing = true;
    let size = 14;

    pulseTimerRef.current = setInterval(() => {
      if (growing) {
        size += 0.5;
        if (size >= 20) growing = false;
      } else {
        size -= 0.5;
        if (size <= 12) growing = true;
      }
      entities.forEach((entity) => {
        if (entity.point) {
          (entity.point.pixelSize as unknown as Cesium.ConstantProperty).setValue(size);
        }
      });
    }, 80);

    return () => {
      if (pulseTimerRef.current) clearInterval(pulseTimerRef.current);
      if (!viewer.isDestroyed()) {
        entities.forEach((e) => viewer.entities.remove(e));
      }
      entitiesRef.current = [];
    };
  }, [viewerRef]);

  useEffect(() => {
    const isVisible = VISIBLE_ZONES.includes(currentZone);
    entitiesRef.current.forEach((entity) => {
      entity.show = isVisible;
    });
  }, [currentZone]);

  return null;
}
