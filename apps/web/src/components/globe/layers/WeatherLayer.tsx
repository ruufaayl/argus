// ============================================================
// File: apps/web/src/components/globe/layers/WeatherLayer.tsx
// ARGUS SENTINEL — Live Precipitation & Weather Layer
//
// DATA SOURCES:
//   Primary:   RainViewer API (free, no key, global radar)
//   Secondary: OpenWeatherMap cloud layer (VITE_OPENWEATHER_KEY)
//
// RENDER: Cesium ImageryLayer overlaid on Google 3D Tiles
//
// RAINVIEWER TILE URL FORMAT:
//   https://tilecache.rainviewer.com{path}/256/{z}/{x}/{y}/{colorScheme}/{smooth}_{snow}.png
//
//   colorScheme values:
//     0 = Original (blue→green→yellow→red)
//     1 = Universal Blue
//     2 = TITAN (high contrast)
//     3 = TWC (The Weather Channel style)
//     4 = Meteored
//     5 = NEXRAD level 3
//     6 = Rainbow
//     7 = Dark Sky
//
//   smooth: 0 = raw pixels, 1 = smoothed (better visual)
//   snow: 0 = off, 1 = snow highlighted (blue tones)
//
// ANIMATION:
//   RainViewer provides the last 12 frames (2 hours history)
//   + 2 forecast frames. We cycle through past frames then
//   hold on latest for live mode, or can scrub for replay.
// ============================================================

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../../stores/commandStore';

// ── Constants ────────────────────────────────────────────────
const RAINVIEWER_MAPS_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const TILE_SIZE = 256;
const RADAR_ALPHA = 0.58;     // Translucency of radar overlay
const COLOR_SCHEME = 6;        // Rainbow — visually most impressive
const SMOOTH = 1;        // Smooth interpolation
const SNOW_HIGHLIGHT = 1;        // Highlight snow in blue
const UPDATE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const FETCH_TIMEOUT_MS = 8_000;
const MAX_TILE_LEVEL = 12;       // Higher = more detail but more requests
const MIN_TILE_LEVEL = 0;

// Pakistan bounding region for cloud layer
const PK_BBOX = {
  west: Cesium.Math.toRadians(60.8),
  south: Cesium.Math.toRadians(23.5),
  east: Cesium.Math.toRadians(77.8),
  north: Cesium.Math.toRadians(37.5),
};

// ── Interfaces ────────────────────────────────────────────────
interface RadarFrame {
  time: number;  // Unix timestamp
  path: string;  // Path prefix for tile URL
}

interface WeatherMaps {
  generated: number;
  host: string;
  radar: {
    past: RadarFrame[];
    nowcast?: RadarFrame[];
  };
  satellite?: {
    infrared?: RadarFrame[];
  };
}

interface Props {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

// ── Utility ───────────────────────────────────────────────────
function buildRadarTileUrl(path: string): string {
  return (
    `https://tilecache.rainviewer.com${path}` +
    `/${TILE_SIZE}/{z}/{x}/{y}` +
    `/${COLOR_SCHEME}` +
    `/${SMOOTH}_${SNOW_HIGHLIGHT}.png`
  );
}

function formatRadarTime(unixTs: number): string {
  return new Date(unixTs * 1000).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Karachi',
  });
}

// ════════════════════════════════════════════════════════════
// WEATHER LAYER
// ════════════════════════════════════════════════════════════

export function WeatherLayer({ viewerRef }: Props) {
  // ── Reactive store bindings ───────────────────────────────
  const isEnabled = useCommandStore(
    (s) => (s as any).layers?.weather ?? false
  );
  const globeReady = useCommandStore((s) => s.globeReady);

  // ── Refs — no state, no re-renders ───────────────────────
  // Using refs prevents React re-render cycles when
  // imagery layers update — Cesium handles its own rendering
  const radarLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const cloudLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const abortRef = useRef<AbortController>();
  const mountedRef = useRef(true);
  const latestFrameRef = useRef<RadarFrame | null>(null);
  const allFramesRef = useRef<RadarFrame[]>([]);

  // ── Toggle visibility reactively ──────────────────────────
  // This runs whenever the layer store toggle changes.
  // Does NOT recreate the layer — just shows/hides it.
  // Toggling on immediately shows the cached layer.
  useEffect(() => {
    if (radarLayerRef.current) {
      radarLayerRef.current.show = isEnabled;
    }
    if (cloudLayerRef.current) {
      cloudLayerRef.current.show = isEnabled;
    }
  }, [isEnabled]);

  // ── Main effect — fetch radar and create layer ────────────
  useEffect(() => {
    if (!globeReady) return;
    mountedRef.current = true;

    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // ── Helper: create imagery layer from frame ──────────────
    const applyRadarFrame = (frame: RadarFrame) => {
      if (!mountedRef.current) return;
      const v = viewerRef.current;
      if (!v || v.isDestroyed()) return;

      const tileUrl = buildRadarTileUrl(frame.path);

      const provider = new Cesium.UrlTemplateImageryProvider({
        url: tileUrl,
        minimumLevel: MIN_TILE_LEVEL,
        maximumLevel: MAX_TILE_LEVEL,
        tileWidth: TILE_SIZE,
        tileHeight: TILE_SIZE,
        // Tell Cesium tiles have alpha (transparency)
        // Critical — without this, clear areas show as white
        hasAlphaChannel: true,
        // Custom credit
        credit: new Cesium.Credit(
          `RainViewer radar ${formatRadarTime(frame.time)} PKT`,
          false
        ),
      });

      // Create new layer BEFORE removing old one.
      // This prevents a flash of no-radar between updates.
      const newLayer = v.imageryLayers.addImageryProvider(provider);

      // Visual configuration
      newLayer.alpha = RADAR_ALPHA;
      newLayer.brightness = 1.4;  // boost colors
      newLayer.contrast = 1.2;  // sharpen definition
      newLayer.saturation = 1.3;  // vivid precipitation colors
      newLayer.gamma = 1.0;
      newLayer.show = isEnabled;

      // Remove old layer after new one is added
      // Small delay lets new layer tiles start loading
      // before the old disappears — smooth transition
      const oldLayer = radarLayerRef.current;
      if (oldLayer) {
        setTimeout(() => {
          if (v && !v.isDestroyed()) {
            v.imageryLayers.remove(oldLayer, true);
          }
        }, 500);
      }

      radarLayerRef.current = newLayer;
      latestFrameRef.current = frame;
    };

    // ── Fetch radar metadata from RainViewer ─────────────────
    const fetchRadarData = async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const timeoutId = setTimeout(
        () => abortRef.current?.abort(),
        FETCH_TIMEOUT_MS
      );

      try {
        const res = await fetch(RAINVIEWER_MAPS_URL, {
          signal: abortRef.current.signal,
          headers: { 'Accept': 'application/json' },
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`RainViewer API: ${res.status}`);
        }

        const maps: WeatherMaps = await res.json();

        if (!mountedRef.current) return;

        // Validate response structure
        if (!maps?.radar?.past?.length) {
          console.warn('[WEATHER] No radar frames in response');
          return;
        }

        const past = maps.radar.past;
        allFramesRef.current = past;

        // Use the most recent past frame for live display
        // past array is oldest→newest, so last element is latest
        const latestFrame = past[past.length - 1];

        if (!latestFrame?.path) {
          console.warn('[WEATHER] Latest frame has no path');
          return;
        }

        // Check if this is actually a new frame
        // (avoid unnecessary tile layer recreation)
        if (latestFrameRef.current?.path === latestFrame.path) {
          console.log('[WEATHER] Radar frame unchanged — skipping update');
          return;
        }

        applyRadarFrame(latestFrame);

        console.log(
          `[WEATHER] Radar frame loaded: ${latestFrame.path}`,
          `Time: ${formatRadarTime(latestFrame.time)} PKT`,
          `Total frames available: ${past.length}`
        );

        // ── Optional: OpenWeatherMap cloud layer ─────────────
        // Only if key is configured
        const owmKey = import.meta.env.VITE_OPENWEATHER_KEY;
        if (owmKey && !cloudLayerRef.current) {
          try {
            const cloudProvider =
              new Cesium.UrlTemplateImageryProvider({
                url:
                  `https://tile.openweathermap.org/map/clouds_new` +
                  `/{z}/{x}/{y}.png?appid=${owmKey}`,
                maximumLevel: 10,
                tileWidth: 256,
                tileHeight: 256,
                hasAlphaChannel: true,
                credit: new Cesium.Credit('OpenWeatherMap', false),
              });

            const cloudLayer =
              viewer.imageryLayers.addImageryProvider(cloudProvider);
            cloudLayer.alpha = 0.25; // very subtle
            cloudLayer.show = isEnabled;

            // Insert BELOW radar layer so clouds are background
            // and radar precipitation is on top
            if (radarLayerRef.current) {
              const radarIndex =
                viewer.imageryLayers.indexOf(radarLayerRef.current);
              if (radarIndex > 0) {
                viewer.imageryLayers.lower(cloudLayer);
              }
            }

            cloudLayerRef.current = cloudLayer;
            console.log('[WEATHER] Cloud layer: ONLINE');
          } catch (cloudErr) {
            console.warn('[WEATHER] Cloud layer failed:', cloudErr);
          }
        }

      } catch (e: any) {
        clearTimeout(timeoutId);
        if (e?.name === 'AbortError') return;
        console.error('[WEATHER] Radar fetch failed:', e);
      }
    };

    // Fetch immediately on mount
    fetchRadarData();

    // Refresh every 10 minutes
    // RainViewer generates new frames every ~10 minutes
    updateIntervalRef.current = setInterval(
      fetchRadarData,
      UPDATE_INTERVAL_MS
    );

    // ── Cleanup ───────────────────────────────────────────────
    return () => {
      mountedRef.current = false;
      clearInterval(updateIntervalRef.current);
      abortRef.current?.abort();

      const v = viewerRef.current;
      if (v && !v.isDestroyed()) {
        if (radarLayerRef.current) {
          v.imageryLayers.remove(radarLayerRef.current, true);
        }
        if (cloudLayerRef.current) {
          v.imageryLayers.remove(cloudLayerRef.current, true);
        }
      }

      radarLayerRef.current = null;
      cloudLayerRef.current = null;
    };
  }, [globeReady]); // Re-run when globe finishes initializing

  // No DOM output — Cesium owns the imagery layer rendering
  return null;
}