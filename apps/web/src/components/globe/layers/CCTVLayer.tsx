// ============================================================
// CCTVLayer — Simulated surveillance cones in key cities
// ============================================================

import { useEffect, useRef, type MutableRefObject } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../../stores/commandStore';

// CCTV node positions — key intersections in Islamabad Red Zone & Karachi Clifton
const CCTV_NODES = [
  // Islamabad — Constitution Avenue / Red Zone
  { id: 'ISB-01', location: 'Constitution Ave / D-Chowk', lat: 33.7290, lng: 73.0880 },
  { id: 'ISB-02', location: 'Parliament House Gate', lat: 33.7350, lng: 73.0940 },
  { id: 'ISB-03', location: 'Aiwan-e-Sadr Gate', lat: 33.7298, lng: 73.0888 },
  { id: 'ISB-04', location: 'Supreme Court Entrance', lat: 33.7279, lng: 73.0891 },
  { id: 'ISB-05', location: 'Blue Area F-6', lat: 33.7215, lng: 73.0635 },
  { id: 'ISB-06', location: 'Serena Hotel Gate', lat: 33.7265, lng: 73.0865 },
  { id: 'ISB-07', location: 'Faisal Mosque Entry', lat: 33.7295, lng: 73.0373 },
  { id: 'ISB-08', location: 'Margalla Road / F-7', lat: 33.7185, lng: 73.0449 },
  // Karachi — Clifton / DHA
  { id: 'KHI-01', location: 'Clifton Bridge', lat: 24.8124, lng: 67.0282 },
  { id: 'KHI-02', location: 'Sea View Roundabout', lat: 24.8050, lng: 67.0290 },
  { id: 'KHI-03', location: 'Gizri Intersection', lat: 24.8040, lng: 67.0530 },
  { id: 'KHI-04', location: 'Zamzama Park', lat: 24.8180, lng: 67.0380 },
  { id: 'KHI-05', location: 'DHA Phase V Gate', lat: 24.7994, lng: 67.0611 },
  // Lahore
  { id: 'LHR-01', location: 'Mall Road / GPO', lat: 31.5648, lng: 74.3268 },
  { id: 'LHR-02', location: 'Liberty Chowk', lat: 31.5100, lng: 74.3350 },
];

interface Props {
  viewerRef: MutableRefObject<Cesium.Viewer | null>;
}

export function CCTVLayer({ viewerRef }: Props) {
  const isVisible = useCommandStore((s) => s.layers.cctv);
  const selectEntity = useCommandStore((s) => s.selectEntity);
  const entitiesRef = useRef<Cesium.Entity[]>([]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // Create swept-cone entities
    const entities: Cesium.Entity[] = [];

    CCTV_NODES.forEach((node) => {
      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(node.lng, node.lat, 35),
        cylinder: {
          length: 30,
          topRadius: 0.5,
          bottomRadius: 25,
          material: Cesium.Color.fromCssColorString('rgba(0, 255, 128, 0.12)'),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('rgba(0, 255, 128, 0.25)'),
          outlineWidth: 1,
          slices: 16,
        },
        id: node.id as any,
      });
      entities.push(entity);
    });

    entitiesRef.current = entities;

    // Click handler for CCTV cones
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(click.position);
      if (picked?.id?._id) {
        const nodeId = picked.id._id;
        const node = CCTV_NODES.find((n) => n.id === nodeId);
        if (node) {
          selectEntity({
            type: 'cctv',
            data: { id: node.id, location: node.location, lat: node.lat, lng: node.lng, status: 'ACTIVE' as const },
          });
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      entities.forEach((e) => {
        if (!viewer.isDestroyed()) viewer.entities.remove(e);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle visibility
  useEffect(() => {
    entitiesRef.current.forEach((e) => {
      e.show = isVisible;
    });
  }, [isVisible]);

  return null;
}
