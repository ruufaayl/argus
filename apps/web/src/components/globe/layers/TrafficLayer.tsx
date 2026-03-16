// ============================================================
// TrafficLayer — Simulated particle flow along major highways
// ============================================================

import { useEffect, useRef, type MutableRefObject } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../../stores/commandStore';

// Road coordinate arrays (simplified arterial paths)
const ROADS = [
  {
    name: 'Shahrah-e-Faisal Karachi',
    coords: [
      [67.0108, 24.8587], [67.0250, 24.8550], [67.0400, 24.8510],
      [67.0600, 24.8470], [67.0800, 24.8430], [67.1000, 24.8400],
      [67.1200, 24.8380], [67.1400, 24.8360], [67.1609, 24.9065],
    ],
  },
  {
    name: 'Kashmir Highway Islamabad',
    coords: [
      [72.9793, 33.7165], [72.9900, 33.7100], [73.0050, 33.7050],
      [73.0200, 33.7000], [73.0350, 33.6950], [73.0487, 33.6900],
      [73.0600, 33.6850], [73.0700, 33.6800],
    ],
  },
  {
    name: 'GT Road Lahore-Rawalpindi',
    coords: [
      [74.3293, 31.5824], [74.2500, 31.6200], [74.1500, 31.7000],
      [73.9000, 31.8000], [73.6000, 32.2000], [73.3000, 32.6000],
      [73.1000, 33.0000], [73.0596, 33.5979],
    ],
  },
];

const PARTICLES_PER_ROAD = 30;

// Create a tiny glowing dot canvas
function createDot(color: string, size: number = 6): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size * 2;
  canvas.height = size * 2;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size, size, 0, size, size, size);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size * 2, size * 2);
  return canvas;
}

interface Props {
  viewerRef: MutableRefObject<Cesium.Viewer | null>;
}

export function TrafficLayer({ viewerRef }: Props) {
  const isVisible = useCommandStore((s) => s.layers.traffic);
  const bbsRef = useRef<Cesium.BillboardCollection | null>(null);
  const progressRef = useRef<number[]>([]);
  const removeListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const bbs = new Cesium.BillboardCollection({ scene: viewer.scene });
    viewer.scene.primitives.add(bbs);
    bbsRef.current = bbs;

    const cyanDot = createDot('rgba(0, 200, 255, 0.8)', 4);
    const amberDot = createDot('rgba(255, 184, 0, 0.7)', 4);

    // Initialize particles
    const progresses: number[] = [];

    ROADS.forEach((road, ri) => {
      for (let i = 0; i < PARTICLES_PER_ROAD; i++) {
        const progress = Math.random(); // Random start position along road
        progresses.push(progress);

        const pos = interpolateRoad(road.coords, progress);
        bbs.add({
          position: Cesium.Cartesian3.fromDegrees(pos[0], pos[1], 20),
          image: ri === 0 ? amberDot : cyanDot, // Karachi in amber (heavy traffic)
          scale: 1.0,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
        });
      }
    });
    progressRef.current = progresses;

    // Animate particles along roads
    const removeListener = viewer.scene.preUpdate.addEventListener(() => {
      if (!bbsRef.current) return;

      let idx = 0;
      ROADS.forEach((road) => {
        for (let i = 0; i < PARTICLES_PER_ROAD; i++) {
          const speed = 0.0005 + Math.random() * 0.0003; // Variable speed
          progressRef.current[idx] += speed;
          if (progressRef.current[idx] > 1) progressRef.current[idx] = 0;

          const pos = interpolateRoad(road.coords, progressRef.current[idx]);
          const bb = bbsRef.current!.get(idx);
          bb.position = Cesium.Cartesian3.fromDegrees(pos[0], pos[1], 20);
          idx++;
        }
      });
    });
    removeListenerRef.current = removeListener;

    return () => {
      removeListener();
      if (!viewer.isDestroyed()) {
        viewer.scene.primitives.remove(bbs);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle visibility
  useEffect(() => {
    if (bbsRef.current) {
      bbsRef.current.show = isVisible;
    }
  }, [isVisible]);

  return null;
}

// Linear interpolation along a coordinate array
function interpolateRoad(coords: number[][], t: number): [number, number] {
  const n = coords.length - 1;
  const scaledT = t * n;
  const i = Math.floor(scaledT);
  const frac = scaledT - i;

  if (i >= n) return [coords[n][0], coords[n][1]];

  const x = coords[i][0] + (coords[i + 1][0] - coords[i][0]) * frac;
  const y = coords[i][1] + (coords[i + 1][1] - coords[i][1]) * frac;
  return [x, y];
}
