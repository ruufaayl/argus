// ============================================================
// LandmarkLayer.tsx — V4 Static Landmark Renderer
// ============================================================

import { useEffect, useRef, type MutableRefObject } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../stores/commandStore';
import { LANDMARKS, CATEGORY_CONFIG } from '../../data/landmarks';

interface Props {
  viewerRef: MutableRefObject<Cesium.Viewer | null>;
}

export function LandmarkLayer({ viewerRef }: Props) {
  const isClassifiedMode = useCommandStore((s: any) => s.isClassifiedMode);
  const activeCategory = useCommandStore((s: any) => s.activeCategory);
  const selectEntity = useCommandStore((s: any) => s.selectEntity);
  const layers = useCommandStore((s: any) => s.layers);

  const primitivesRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const labelsRef = useRef<Cesium.LabelCollection | null>(null);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // Build collections for massive performance
    const points = new Cesium.PointPrimitiveCollection();
    const labels = new Cesium.LabelCollection();

    LANDMARKS.forEach((lm: any, idx: number) => {
      // Offset slightly to prevent z-fighting with terrain
      const pos = Cesium.Cartesian3.fromDegrees(lm.lng, lm.lat, 10);
      const conf = CATEGORY_CONFIG[lm.category] || CATEGORY_CONFIG.tourism;

      // 1) The visual point
      points.add({
        position: pos,
        color: Cesium.Color.fromCssColorString(conf.color).withAlpha(0.9),
        pixelSize: lm.tier === 'T1' ? 8 : lm.tier === 'T2' ? 6 : 4,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1,
        id: `lm_${idx}`,
      });

      // 2) The text label
      labels.add({
        position: pos,
        text: lm.name,
        font: lm.tier === 'T1' ? '14px "Rajdhani"' : '12px "Rajdhani"',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -15),
        distanceDisplayCondition:
          lm.tier === 'T1' ? new Cesium.DistanceDisplayCondition(0, 500000) :
          lm.tier === 'T2' ? new Cesium.DistanceDisplayCondition(0, 150000) :
                             new Cesium.DistanceDisplayCondition(0, 50000),
        id: `label_${idx}`,
      });
    });

    viewer.scene.primitives.add(points);
    viewer.scene.primitives.add(labels);
    primitivesRef.current = points;
    labelsRef.current = labels;

    // Pick handler for exact selection
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(click.position);
      if (picked && picked.id && typeof picked.id === 'string' && picked.id.startsWith('lm_')) {
        const idx = parseInt(picked.id.split('_')[1], 10);
        const lm = LANDMARKS[idx];
        if (lm) {
          selectEntity({
            type: 'landmark',
            data: { ...lm, status: 'NOMINAL', lastUpdate: new Date().toISOString() },
          });
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      if (!viewer.isDestroyed()) {
        viewer.scene.primitives.remove(points);
        viewer.scene.primitives.remove(labels);
      }
    };
  }, []);

  // Handle visibility filtering based on layers & active category
  useEffect(() => {
    const points = primitivesRef.current;
    const labels = labelsRef.current;
    if (!points || !labels) return;

    LANDMARKS.forEach((lm: any, idx: number) => {
      const point = points.get(idx);
      const label = labels.get(idx);

      // Determine visibility rules
      // 1. Is this category toggled ON in the layers menu?
      const categoryOn = (layers as Record<string, boolean>)[lm.category] !== false;

      // 2. Is this the EXACT category active in the LocationsBar bottom pills?
      // (If a pill is clicked, ONLY show that category)
      const matchesActiveCategory = activeCategory ? lm.category === activeCategory : true;

      const show = categoryOn && matchesActiveCategory;

      point.show = show;
      label.show = show;
    });
  }, [layers, activeCategory, isClassifiedMode]);

  return null;
}
