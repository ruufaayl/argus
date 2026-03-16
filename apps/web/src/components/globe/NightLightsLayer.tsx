// ============================================================
// NightLightsLayer — Toggle between day/night imagery
// DAY = full Bing Maps. NIGHT = dim base + VIIRS overlay.
// ============================================================

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

interface NightLightsLayerProps {
  viewerRef: React.RefObject<Cesium.Viewer | null>;
  isNightMode: boolean;
}

export function NightLightsLayer({ viewerRef, isNightMode }: NightLightsLayerProps) {
  const nightLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const addedRef = useRef(false);

  // Add night lights layer once
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || addedRef.current) return;
    addedRef.current = true;

    try {
      const provider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
        maximumLevel: 8,
        credit: 'NASA Earth Observatory',
      });

      const layer = viewer.imageryLayers.addImageryProvider(provider);
      layer.alpha = 1.0;
      layer.brightness = 2.5;
      layer.contrast = 1.5;
      layer.show = false; // Hidden by default (DAY mode)
      nightLayerRef.current = layer;
      console.log('[ARGUS] Night lights layer ready');
    } catch (err) {
      console.warn('[ARGUS] Night lights failed:', err);
    }

    return () => {
      if (!viewer.isDestroyed() && nightLayerRef.current) {
        viewer.imageryLayers.remove(nightLayerRef.current, true);
        nightLayerRef.current = null;
        addedRef.current = false;
      }
    };
  }, [viewerRef]);

  // React to day/night toggle
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const nightLayer = nightLayerRef.current;
    const baseCount = viewer.imageryLayers.length;

    if (isNightMode) {
      // Dim base imagery, show night lights
      if (baseCount > 0) {
        const base = viewer.imageryLayers.get(0);
        base.alpha = 0.15;
        base.brightness = 0.5;
      }
      if (nightLayer) nightLayer.show = true;
      // Dark background for space
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#020208');
      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.brightnessShift = -0.5;
      }
    } else {
      // Full bright day imagery
      if (baseCount > 0) {
        const base = viewer.imageryLayers.get(0);
        base.alpha = 1.0;
        base.brightness = 1.0;
      }
      if (nightLayer) nightLayer.show = false;
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#000510');
      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.brightnessShift = 0;
      }
    }
  }, [isNightMode, viewerRef]);

  return null;
}
