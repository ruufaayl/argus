// ============================================================
// PopulationLayer.tsx — Population Density Heatmap
// Uses Cesium PointPrimitiveCollection for density visualization
// Data: hardcoded Pakistan city density grid
// ============================================================

import { useEffect, useRef, type MutableRefObject } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../stores/commandStore';

interface Props {
  viewerRef: MutableRefObject<Cesium.Viewer | null>;
  visible?: boolean;
  currentZone?: string;
  cityId?: string;
}

interface DensityPoint {
  lat: number;
  lon: number;
  density: number; // people per km²
}

// Pakistan major city centers with population density
const CITY_DENSITIES: { lat: number; lon: number; density: number; radius: number }[] = [
  // Karachi — densest city
  { lat: 24.86, lon: 67.01, density: 44000, radius: 0.3 },
  { lat: 24.93, lon: 67.08, density: 35000, radius: 0.25 },
  { lat: 24.80, lon: 66.95, density: 30000, radius: 0.2 },
  // Lahore
  { lat: 31.55, lon: 74.35, density: 36000, radius: 0.25 },
  { lat: 31.52, lon: 74.30, density: 28000, radius: 0.2 },
  // Faisalabad
  { lat: 31.42, lon: 73.08, density: 18000, radius: 0.15 },
  // Rawalpindi
  { lat: 33.60, lon: 73.05, density: 14000, radius: 0.15 },
  // Islamabad
  { lat: 33.69, lon: 73.04, density: 8000, radius: 0.2 },
  // Peshawar
  { lat: 34.01, lon: 71.58, density: 15000, radius: 0.15 },
  // Multan
  { lat: 30.20, lon: 71.47, density: 12000, radius: 0.12 },
  // Hyderabad
  { lat: 25.40, lon: 68.37, density: 10000, radius: 0.12 },
  // Quetta
  { lat: 30.18, lon: 67.00, density: 5000, radius: 0.12 },
  // Gujranwala
  { lat: 32.16, lon: 74.19, density: 11000, radius: 0.1 },
  // Sialkot
  { lat: 32.50, lon: 74.53, density: 8000, radius: 0.08 },
];

function generateDensityGrid(): DensityPoint[] {
  const points: DensityPoint[] = [];
  const step = 0.15; // ~15km grid

  // Pakistan bounding box
  for (let lat = 23.5; lat <= 37.5; lat += step) {
    for (let lon = 60.8; lon <= 77.8; lon += step) {
      let totalDensity = 0;

      for (const city of CITY_DENSITIES) {
        const dist = Math.sqrt(
          Math.pow(lat - city.lat, 2) + Math.pow(lon - city.lon, 2)
        );
        if (dist < city.radius * 3) {
          // Gaussian falloff
          const sigma = city.radius;
          const weight = Math.exp(-(dist * dist) / (2 * sigma * sigma));
          totalDensity += city.density * weight;
        }
      }

      // Add base rural density
      if (totalDensity < 50) {
        // Rural areas
        if (lat >= 25 && lat <= 35 && lon >= 68 && lon <= 75) {
          totalDensity = 100 + Math.random() * 200; // Punjab rural
        } else if (lat >= 23 && lat <= 28 && lon >= 65 && lon <= 70) {
          totalDensity = 50 + Math.random() * 100; // Sindh rural
        } else if (lat >= 28 && lat <= 32 && lon >= 60 && lon <= 67) {
          totalDensity = 5 + Math.random() * 20; // Balochistan
        } else if (lat >= 32 && lat <= 37 && lon >= 70 && lon <= 77) {
          totalDensity = 50 + Math.random() * 150; // KPK/Northern
        }
      }

      if (totalDensity > 20) {
        points.push({ lat, lon, density: totalDensity });
      }
    }
  }

  return points;
}

function densityToColor(density: number): Cesium.Color {
  if (density > 30000) return Cesium.Color.fromCssColorString('#FF0032').withAlpha(0.55);
  if (density > 15000) return Cesium.Color.fromCssColorString('#FF5000').withAlpha(0.45);
  if (density > 5000) return Cesium.Color.fromCssColorString('#FFDC00').withAlpha(0.35);
  if (density > 1000) return Cesium.Color.fromCssColorString('#00C8FF').withAlpha(0.25);
  if (density > 200) return Cesium.Color.fromCssColorString('#0064C8').withAlpha(0.15);
  return Cesium.Color.fromCssColorString('#001428').withAlpha(0.08);
}

export function PopulationLayer({ viewerRef }: Props) {
  const isVisible = useCommandStore((s) => s.layers.population);
  const pointCollectionRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const gridRef = useRef<DensityPoint[]>([]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    gridRef.current = generateDensityGrid();

    const pc = viewer.scene.primitives.add(
      new Cesium.PointPrimitiveCollection()
    );
    pointCollectionRef.current = pc;

    return () => {
      if (!viewer.isDestroyed()) {
        viewer.scene.primitives.remove(pc);
      }
    };
  }, []);

  useEffect(() => {
    const pc = pointCollectionRef.current;
    const viewer = viewerRef.current;
    if (!pc || !viewer || viewer.isDestroyed()) return;

    pc.removeAll();

    if (!isVisible) return;

    // Time of day weighting
    const pktHour = (new Date().getUTCHours() + 5) % 24;
    const isDaytime = pktHour >= 8 && pktHour <= 20;
    const timeMultiplier = isDaytime ? 1.0 : 0.7;

    gridRef.current.forEach((point) => {
      const adjustedDensity = point.density * timeMultiplier;
      const pixelSize = Math.max(8, Math.min(35, Math.sqrt(adjustedDensity) * 0.15));

      pc.add({
        position: Cesium.Cartesian3.fromDegrees(point.lon, point.lat, 100),
        pixelSize: pixelSize,
        color: densityToColor(adjustedDensity),
        scaleByDistance: new Cesium.NearFarScalar(10_000, 2.0, 2_000_000, 0.5),
        translucencyByDistance: new Cesium.NearFarScalar(5000, 1.0, 3_000_000, 0.0),
      });
    });

    viewer.scene.requestRender();
    console.log(`[POPULATION] ${gridRef.current.length} density points rendered (${isDaytime ? 'day' : 'night'} mode)`);
  }, [isVisible]);

  return null;
}
