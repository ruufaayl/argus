// ============================================================
// BorderCheckpostLayer — Pakistan border crossing points (P2)
// Renders checkpost markers at 5 border zones with click panels
// India, Afghanistan, Iran, China, Kashmir/LoC
// ============================================================

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../../stores/commandStore';

interface Checkpost {
  name: string;
  border: string;
  lat: number;
  lng: number;
  status: 'ACTIVE' | 'RESTRICTED' | 'CLOSED';
  type: 'INTERNATIONAL' | 'MILITARY' | 'TRADE';
  notes: string;
}

const CHECKPOSTS: Checkpost[] = [
  // India Border
  { name: 'Wagah Border', border: 'INDIA', lat: 31.6047, lng: 74.5735, status: 'ACTIVE', type: 'INTERNATIONAL', notes: 'Primary India-Pakistan crossing. Daily flag ceremony. High security zone.' },
  { name: 'Khokhrapar', border: 'INDIA', lat: 25.1247, lng: 69.7015, status: 'RESTRICTED', type: 'TRADE', notes: 'Thar Express rail crossing. Limited operations. Sindh-Rajasthan corridor.' },
  { name: 'Munabao-Khokhrapar Rail', border: 'INDIA', lat: 25.1490, lng: 70.0933, status: 'RESTRICTED', type: 'TRADE', notes: 'Periodic rail link. Subject to diplomatic status.' },

  // Afghanistan Border (Durand Line)
  { name: 'Torkham', border: 'AFGHANISTAN', lat: 34.0861, lng: 71.0864, status: 'ACTIVE', type: 'INTERNATIONAL', notes: 'Khyber Pass crossing. Highest traffic volume. NATO supply route.' },
  { name: 'Chaman-Spin Boldak', border: 'AFGHANISTAN', lat: 30.9210, lng: 66.4590, status: 'ACTIVE', type: 'TRADE', notes: 'Balochistan-Kandahar corridor. Key trade route. Frequent closures.' },
  { name: 'Ghulam Khan', border: 'AFGHANISTAN', lat: 33.2167, lng: 69.8167, status: 'RESTRICTED', type: 'MILITARY', notes: 'North Waziristan crossing. Military-controlled. Limited civilian access.' },
  { name: 'Angoor Adda', border: 'AFGHANISTAN', lat: 32.5167, lng: 69.5833, status: 'RESTRICTED', type: 'MILITARY', notes: 'South Waziristan crossing. Strategic military checkpoint.' },

  // Iran Border
  { name: 'Taftan', border: 'IRAN', lat: 28.9622, lng: 61.5972, status: 'ACTIVE', type: 'INTERNATIONAL', notes: 'Primary Iran crossing. Balochistan corridor. ECO transit route.' },
  { name: 'Mand-Pishin', border: 'IRAN', lat: 26.3500, lng: 62.3500, status: 'RESTRICTED', type: 'TRADE', notes: 'Secondary Makran crossing. Limited operations.' },

  // China Border
  { name: 'Khunjerab Pass', border: 'CHINA', lat: 36.8500, lng: 75.4333, status: 'ACTIVE', type: 'INTERNATIONAL', notes: 'Karakoram Highway. CPEC corridor. Seasonal (May-Nov). Elevation 4,693m.' },
  { name: 'Sust Dry Port', border: 'CHINA', lat: 36.7333, lng: 74.8833, status: 'ACTIVE', type: 'TRADE', notes: 'CPEC trade processing hub. Chinese customs presence.' },

  // Kashmir / LoC
  { name: 'Chakothi-Uri LoC', border: 'KASHMIR_LOC', lat: 34.1167, lng: 73.8833, status: 'CLOSED', type: 'MILITARY', notes: 'Line of Control crossing. Suspended since 2019. Bus service halted.' },
  { name: 'Titrinot LoC', border: 'KASHMIR_LOC', lat: 33.4500, lng: 74.0167, status: 'CLOSED', type: 'MILITARY', notes: 'Military-only LoC point. Forward position. No civilian access.' },
];

const STATUS_COLORS: Record<string, Cesium.Color> = {
  ACTIVE: Cesium.Color.fromCssColorString('#34D399'),
  RESTRICTED: Cesium.Color.fromCssColorString('#FFB800'),
  CLOSED: Cesium.Color.fromCssColorString('#F43F5E'),
};

const SVG_CHECKPOST = `data:image/svg+xml,` + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'>` +
  `<polygon fill='%23FFFFFF' points='12,2 22,8 22,16 12,22 2,16 2,8'/>` +
  `<polygon fill='%23000000' opacity='0.3' points='12,4 20,9 20,15 12,20 4,15 4,9'/>` +
  `</svg>`
);

interface Props {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

export function BorderCheckpostLayer({ viewerRef }: Props) {
  const billboardCollRef = useRef<Cesium.BillboardCollection | null>(null);
  const labelCollRef = useRef<Cesium.LabelCollection | null>(null);
  const globeReady = useCommandStore((s) => s.globeReady);
  const isEnabled = useCommandStore((s) => s.layers?.border ?? true);

  useEffect(() => {
    if (billboardCollRef.current) billboardCollRef.current.show = isEnabled;
    if (labelCollRef.current) labelCollRef.current.show = isEnabled;
  }, [isEnabled]);

  useEffect(() => {
    if (!globeReady) return;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const bc = new Cesium.BillboardCollection({ scene: viewer.scene });
    const lc = new Cesium.LabelCollection();
    viewer.scene.primitives.add(bc);
    viewer.scene.primitives.add(lc);
    billboardCollRef.current = bc;
    labelCollRef.current = lc;

    for (const cp of CHECKPOSTS) {
      const statusColor = STATUS_COLORS[cp.status] || STATUS_COLORS.ACTIVE;
      const position = Cesium.Cartesian3.fromDegrees(cp.lng, cp.lat, 200);

      bc.add({
        position,
        image: SVG_CHECKPOST,
        scale: 0.6,
        color: statusColor,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        eyeOffset: new Cesium.Cartesian3(0, 0, -1000),
        scaleByDistance: new Cesium.NearFarScalar(500, 1.5, 800000, 0.3),
        translucencyByDistance: new Cesium.NearFarScalar(1000, 1.0, 1200000, 0.0),
        id: { type: 'checkpost', data: cp },
      });

      lc.add({
        position,
        text: cp.name,
        font: '10px "Share Tech Mono", monospace',
        fillColor: statusColor,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        translucencyByDistance: new Cesium.NearFarScalar(1000, 1.0, 300000, 0.0),
      });
    }

    // Click handler
    const clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    clickHandler.setInputAction(
      (click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        try {
          const picked = viewer.scene.pick(click.position);
          if (Cesium.defined(picked) && picked.id?.type === 'checkpost') {
            const cp: Checkpost = picked.id.data;

            // Drone-zoom to checkpost
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(cp.lng, cp.lat, 800),
              orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-45),
                roll: 0,
              },
              duration: 2.2,
              easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
            });

            // Select as landmark entity for the insight panel
            useCommandStore.getState().selectEntity({
              type: 'landmark',
              data: {
                name: cp.name,
                category: 'border-checkpost',
                city: cp.border,
                province: cp.border,
                tier: cp.type === 'INTERNATIONAL' ? 'T1' : cp.type === 'MILITARY' ? 'T1' : 'T2',
                lat: cp.lat,
                lng: cp.lng,
              },
            });
          }
        } catch {
          // Ignore pick errors
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    // Store count
    useCommandStore.getState().setLayerCount?.('checkposts', CHECKPOSTS.length);

    return () => {
      clickHandler.destroy();
      if (!viewer.isDestroyed()) {
        if (billboardCollRef.current) viewer.scene.primitives.remove(billboardCollRef.current);
        if (labelCollRef.current) viewer.scene.primitives.remove(labelCollRef.current);
      }
      billboardCollRef.current = null;
      labelCollRef.current = null;
    };
  }, [globeReady]);

  return null;
}
