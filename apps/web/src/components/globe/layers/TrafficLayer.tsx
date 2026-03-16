// ============================================================
// TrafficSimLayer.tsx — Simulated Street Traffic
// Uses animated polylines along real road corridors
// No Deck.gl dependency — pure Cesium for compatibility
// ============================================================

import { useEffect, useRef, type MutableRefObject } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../../stores/commandStore';

interface Props {
  viewerRef: MutableRefObject<Cesium.Viewer | null>;
}

interface SimVehicle {
  id: string;
  waypoints: [number, number][]; // [lon, lat]
  speed: number; // degrees per second (scaled)
  type: 0 | 1 | 2; // 0=car, 1=motorbike, 2=bus
  currentIndex: number;
  progress: number; // 0-1 between current waypoints
}

// Major road corridors for Pakistani cities
const CITY_ROUTES: Record<string, [number, number][][]> = {
  karachi: [
    // Shahrah-e-Faisal
    [[67.01, 24.86], [67.03, 24.87], [67.05, 24.88], [67.07, 24.87], [67.09, 24.86], [67.10, 24.85]],
    // University Road
    [[67.05, 24.93], [67.06, 24.92], [67.07, 24.91], [67.08, 24.90], [67.09, 24.89]],
    // MA Jinnah Road
    [[66.97, 24.86], [66.99, 24.86], [67.01, 24.86], [67.03, 24.86], [67.05, 24.87]],
    // Korangi Industrial
    [[67.12, 24.82], [67.13, 24.83], [67.14, 24.84], [67.15, 24.85], [67.16, 24.84]],
    // Hub River Road
    [[66.92, 24.88], [66.94, 24.87], [66.96, 24.87], [66.98, 24.86]],
    // DHA Phase
    [[67.05, 24.80], [67.06, 24.81], [67.07, 24.82], [67.08, 24.83]],
  ],
  lahore: [
    // Mall Road
    [[74.32, 31.55], [74.33, 31.55], [74.34, 31.55], [74.35, 31.56], [74.36, 31.56]],
    // GT Road
    [[74.28, 31.53], [74.30, 31.54], [74.32, 31.55], [74.34, 31.56]],
    // Multan Road
    [[74.35, 31.48], [74.34, 31.50], [74.34, 31.52], [74.35, 31.54]],
    // Canal Road
    [[74.30, 31.48], [74.31, 31.50], [74.32, 31.52], [74.33, 31.54]],
  ],
  islamabad: [
    // Faisal Avenue
    [[73.04, 33.69], [73.05, 33.70], [73.06, 33.71], [73.07, 33.72], [73.08, 33.73]],
    // Jinnah Avenue
    [[73.05, 33.69], [73.06, 33.69], [73.07, 33.70], [73.08, 33.70]],
    // Margalla Road
    [[73.03, 33.74], [73.05, 33.74], [73.07, 33.74], [73.09, 33.73]],
  ],
  peshawar: [
    // GT Road Peshawar
    [[71.70, 34.01], [71.72, 34.01], [71.74, 34.01], [71.76, 34.01]],
    // University Road Peshawar
    [[71.68, 34.02], [71.70, 34.02], [71.72, 34.03]],
  ],
};

function generateVehicles(): SimVehicle[] {
  const vehicles: SimVehicle[] = [];
  let id = 0;

  const cityVehicleCounts: Record<string, number> = {
    karachi: 200,
    lahore: 120,
    islamabad: 60,
    peshawar: 40,
  };

  for (const [city, routes] of Object.entries(CITY_ROUTES)) {
    const count = cityVehicleCounts[city] || 30;
    for (let i = 0; i < count; i++) {
      const route = routes[i % routes.length];
      const type = (i % 3) as 0 | 1 | 2;
      const speedMultiplier = type === 0 ? 1.0 : type === 1 ? 1.3 : 0.6;

      // Add slight lateral offset to spread vehicles across road width
      const offset = (Math.random() - 0.5) * 0.003;
      const waypoints: [number, number][] = route.map(([lon, lat]) => [
        lon + offset + (Math.random() - 0.5) * 0.004,
        lat + (Math.random() - 0.5) * 0.003,
      ]);

      vehicles.push({
        id: `v-${id++}`,
        waypoints,
        speed: (0.00003 + Math.random() * 0.00004) * speedMultiplier,
        type,
        currentIndex: Math.floor(Math.random() * (waypoints.length - 1)),
        progress: Math.random(),
      });
    }
  }

  return vehicles;
}

const VEHICLE_COLORS: Record<number, Cesium.Color> = {
  0: Cesium.Color.fromCssColorString('#00C8FF').withAlpha(0.8),  // car: cyan
  1: Cesium.Color.WHITE.withAlpha(0.5),                          // bike: white dim
  2: Cesium.Color.fromCssColorString('#00FF88').withAlpha(0.9),  // bus: green
};

export function TrafficSimLayer({ viewerRef }: Props) {
  const isVisible = useCommandStore((s) => s.layers.traffic);
  const pointCollectionRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const vehiclesRef = useRef<SimVehicle[]>([]);
  const pointMapRef = useRef<Map<string, Cesium.PointPrimitive>>(new Map());
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const pc = viewer.scene.primitives.add(
      new Cesium.PointPrimitiveCollection()
    );
    pointCollectionRef.current = pc;
    vehiclesRef.current = generateVehicles();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (!viewer.isDestroyed()) {
        viewer.scene.primitives.remove(pc);
      }
      pointMapRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const pc = pointCollectionRef.current;
    const viewer = viewerRef.current;
    if (!pc || !viewer || viewer.isDestroyed()) return;

    cancelAnimationFrame(animFrameRef.current);

    if (!isVisible) {
      pc.removeAll();
      pointMapRef.current.clear();
      return;
    }

    // Create all points
    pc.removeAll();
    const map = pointMapRef.current;
    map.clear();

    vehiclesRef.current.forEach((v) => {
      const wp = v.waypoints[v.currentIndex];
      const pos = Cesium.Cartesian3.fromDegrees(wp[0], wp[1], 5);
      const point = pc.add({
        position: pos,
        pixelSize: v.type === 2 ? 4 : v.type === 0 ? 3 : 2,
        color: VEHICLE_COLORS[v.type],
        scaleByDistance: new Cesium.NearFarScalar(500, 1.5, 100_000, 0.3),
        translucencyByDistance: new Cesium.NearFarScalar(200, 1.0, 50_000, 0.0),
      });
      map.set(v.id, point);
    });

    let lastTime = performance.now();

    const animate = () => {
      if (!viewer || viewer.isDestroyed()) return;

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Only animate when camera is close enough
      const cameraAlt = viewer.camera.positionCartographic?.height || 800_000;
      if (cameraAlt > 30_000) {
        pc.show = false;
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      pc.show = true;

      vehiclesRef.current.forEach((v) => {
        v.progress += v.speed * dt * 100;
        if (v.progress >= 1) {
          v.progress = 0;
          v.currentIndex = (v.currentIndex + 1) % (v.waypoints.length - 1);
        }

        const from = v.waypoints[v.currentIndex];
        const to = v.waypoints[(v.currentIndex + 1) % v.waypoints.length];
        const lon = from[0] + (to[0] - from[0]) * v.progress;
        const lat = from[1] + (to[1] - from[1]) * v.progress;

        const point = map.get(v.id);
        if (point) {
          point.position = Cesium.Cartesian3.fromDegrees(lon, lat, 5);
        }
      });

      viewer.scene.requestRender();
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isVisible]);

  return null;
}
