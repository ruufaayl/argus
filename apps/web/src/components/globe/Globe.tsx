// ============================================================
// File: apps/web/src/components/globe/Globe.tsx
// ARGUS V7.0 — CLEAN GLOBE RENDERER
//
// NO CUSTOM GLSL SHADERS. CSS-only view modes.
// maximumScreenSpaceError: 4 for sharp Google 3D Tiles.
// requestRenderMode: false — ALWAYS.
// Camera locked to Pakistan (69.3451, 29.5).
// ============================================================

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../stores/commandStore';
import { useVisionStore, type VisionState } from '../../stores/visionStore';

// ── Data layers ──────────────────────────────────────────────
import { PakistanBorder } from './PakistanBorder';
import { LandmarkLayer } from './LandmarkLayer';
import { FlightLayer } from './layers/FlightLayer';
import { VesselLayer } from './layers/VesselLayer';
import { WeatherLayer } from './layers/WeatherLayer';
import { SatelliteLayer } from './layers/SatelliteLayer';
import { SelectionRing } from './layers/SelectionRing';
import { IntelPinLayer } from './layers/IntelPinLayer';
import { BorderCheckpostLayer } from './layers/BorderCheckpostLayer';

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════

const PK_LON = 69.1912;
const PK_LAT = 31.2836;
const PK_OPEN_ALT = 2000000;
const PK_MAX_ALT = 2500000;
const PK_MIN_ALT = 150;
const PK_DRIFT_KM = 1400;
const GOOGLE_CDN_REQS = 18;

// ── View mode CSS filters ────────────────────────────────────
// Applied to #cesiumContainer div — NOT GLSL shaders.
// CSS = instant, zero GPU compile, zero artifacts.
const VIEW_MODE_FILTERS: Record<string, string> = {
  NORMAL: 'none',
  NVG: 'brightness(1.4) contrast(1.3) hue-rotate(85deg) saturate(3) sepia(0.8)',
  FLIR: 'brightness(1.2) contrast(1.8) saturate(0) sepia(1) hue-rotate(10deg)',
  MONO: 'grayscale(1) contrast(1.4) brightness(0.9)',
  CRT: 'contrast(1.1) brightness(0.9) saturate(0.85)',
};

// ── Vision Gear CSS builder ──────────────────────────────────
function buildVisionCSS(v: VisionState): string {
  const b = 0.4 + (v.exposure / 100) * 1.2;
  const c = 0.4 + (v.signalContrast / 100) * 1.6;
  const s = (v.spectrum / 100) * 2;
  return [
    `brightness(${b.toFixed(3)})`,
    `contrast(${c.toFixed(3)})`,
    `saturate(${s.toFixed(3)})`,
  ].join(' ');
}

// ── Haversine distance ───────────────────────────────────────
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ════════════════════════════════════════════════════════════
// PROPS
// ════════════════════════════════════════════════════════════

interface Props {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

// ════════════════════════════════════════════════════════════
// MAIN GLOBE COMPONENT
// ════════════════════════════════════════════════════════════

export function Globe({ viewerRef }: Props) {
  const setGlobeReady = useCommandStore((s) => s.setGlobeReady);
  const setCameraAlt = useCommandStore((s) => s.setCameraAlt);
  const setMouseCoords = useCommandStore((s) => s.setMouseCoords);
  const viewMode = useCommandStore((s) => s.viewMode);
  const flyToTarget = useCommandStore((s) => s.flyToTarget);

  // Internal refs
  const mouseHandlerRef = useRef<Cesium.ScreenSpaceEventHandler>();
  const bloomRef = useRef<any>(null);
  const boundaryLockRef = useRef(false);
  const tilesetRef = useRef<Cesium.Cesium3DTileset | null>(null);

  // ── Main initialisation ────────────────────────────────────
  useEffect(() => {
    let destroyed = false;

    const init = async () => {
      const container = document.getElementById('cesiumContainer');
      if (!container) {
        console.error('[ARGUS] cesiumContainer element missing');
        return;
      }

      // ── 1. Google CDN throughput ───────────────────────────
      Cesium.RequestScheduler.requestsByServer[
        'tile.googleapis.com:443'
      ] = GOOGLE_CDN_REQS;

      // ── 2. Cesium Viewer ───────────────────────────────────
      // requestRenderMode: false — NON-NEGOTIABLE
      // true = animations freeze = aircraft never move
      const viewer = new Cesium.Viewer(container, {
        baseLayer: false,
        animation: false,
        timeline: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        geocoder: false,
        selectionIndicator: false,
        vrButton: false,
        creditContainer: document.createElement('div'),
        requestRenderMode: false,  // MUST be false
        targetFrameRate: 60,
        msaaSamples: 4,
        scene3DOnly: true,
        shadows: false,
        terrainShadows: Cesium.ShadowMode.DISABLED,
      });

      if (destroyed) { viewer.destroy(); return; }

      viewerRef.current = viewer;
      (window as any).cesiumViewer = viewer;
      (window as any).__argusReady = false;

      // Resolution scale for HiDPI displays
      viewer.resolutionScale = window.devicePixelRatio || 1;

      // ── 3. Google Photorealistic 3D Tiles ─────────────────
      try {
        const googleTileset = await Cesium.Cesium3DTileset.fromUrl(
          `https://tile.googleapis.com/v1/3dtiles/root.json` +
          `?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}`,
          {
            maximumScreenSpaceError: 4,  // SHARP (default 16 = blurry)
            dynamicScreenSpaceError: true,
            dynamicScreenSpaceErrorDensity: 0.00278,
            dynamicScreenSpaceErrorFactor: 4.0,
            dynamicScreenSpaceErrorHeightFalloff: 0.25,
            skipLevelOfDetail: true,
            skipScreenSpaceErrorFactor: 16,
            skipLevels: 1,
            immediatelyLoadDesiredLevelOfDetail: false,
            loadSiblings: false,
            preloadWhenHidden: false,
            cullWithChildrenBounds: true,
            showCreditsOnScreen: true,
          }
        );

        if (!destroyed) {
          viewer.scene.primitives.add(googleTileset);
          viewer.scene.globe.show = false;
          tilesetRef.current = googleTileset;
          console.log('[ARGUS] Google 3D Tiles: ONLINE');
        }
      } catch (e) {
        console.error('[ARGUS] Google 3D Tiles failed:', e);
        viewer.scene.globe.show = true;
        viewer.scene.globe.baseColor =
          Cesium.Color.fromCssColorString('#0A1628');
        try {
          viewer.imageryLayers.addImageryProvider(
            await Cesium.IonImageryProvider.fromAssetId(2)
          );
          console.log('[ARGUS] Bing fallback: ONLINE');
        } catch {
          viewer.imageryLayers.addImageryProvider(
            new Cesium.UrlTemplateImageryProvider({
              url:
                'https://services.arcgisonline.com/arcgis' +
                '/rest/services/World_Imagery/MapServer' +
                '/tile/{z}/{y}/{x}',
              maximumLevel: 19,
            })
          );
          console.log('[ARGUS] Esri fallback: ONLINE');
        }
      }

      // ── 4. World Terrain + Water ───────────────────────────
      try {
        viewer.terrainProvider =
          await Cesium.createWorldTerrainAsync({
            requestWaterMask: true,
            requestVertexNormals: true,
          });
        viewer.scene.globe.showWaterEffect = true;
        console.log('[ARGUS] Terrain + water: ONLINE');
      } catch (e) {
        console.warn('[ARGUS] Terrain failed:', e);
      }

      // ── 5. Scene configuration ─────────────────────────────
      viewer.scene.sun = new Cesium.Sun();
      viewer.scene.moon = new Cesium.Moon();
      viewer.scene.globe.enableLighting = true;
      // CRITICAL: Must be FALSE when using Google 3D Tiles
      // true = billboards (flights/vessels/satellites) render BEHIND tiles = invisible
      viewer.scene.globe.depthTestAgainstTerrain = false;

      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.show = true;
      }

      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.0001;
      viewer.scene.fog.screenSpaceErrorFactor = 2.0;
      viewer.scene.fog.minimumBrightness = 0.03;

      // ── 6. Post-Processing: Bloom ONLY ─────────────────────
      // NO custom GLSL shaders. All view modes use CSS filter.
      const bloom = viewer.scene.postProcessStages.bloom;
      bloom.enabled = true;
      bloom.uniforms.contrast = 128;
      bloom.uniforms.brightness = -0.3;
      bloom.uniforms.sigma = 2.5;
      bloom.uniforms.stepSize = 1.0;
      bloom.uniforms.delta = 1.0;
      bloomRef.current = bloom;

      // ── 7. Camera physics ──────────────────────────────────
      const ctrl = viewer.scene.screenSpaceCameraController;
      ctrl.inertiaSpin = 0.95;
      ctrl.inertiaTranslate = 0.95;
      ctrl.inertiaZoom = 0.88;
      ctrl.minimumZoomDistance = PK_MIN_ALT;
      ctrl.maximumZoomDistance = PK_MAX_ALT;
      ctrl.maximumMovementRatio = 0.1;
      ctrl.bounceAnimationTime = 3.0;
      ctrl.enableCollisionDetection = true;

      ctrl.tiltEventTypes = [
        Cesium.CameraEventType.RIGHT_DRAG,
        Cesium.CameraEventType.PINCH,
        {
          eventType: Cesium.CameraEventType.LEFT_DRAG,
          modifier: Cesium.KeyboardEventModifier.CTRL,
        },
      ];

      // ── 8. Opening camera position ─────────────────────────
      // Start centered on Pakistan from space (pitch -90 for exact center targeting)
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          PK_LON, PK_LAT, 5000000
        ),
        orientation: {
          heading: 0,
          pitch: Cesium.Math.toRadians(-90),
          roll: 0,
        },
      });

      // ── 9. Camera altitude tracking ────────────────────────
      viewer.camera.changed.addEventListener(() => {
        const h = viewer.camera.positionCartographic?.height ?? 800000;
        setCameraAlt(h);
      });
      viewer.camera.percentageChanged = 0.005;

      // ── 10. Mouse coordinate tracking ──────────────────────
      mouseHandlerRef.current = new Cesium.ScreenSpaceEventHandler(
        viewer.scene.canvas
      );
      mouseHandlerRef.current.setInputAction(
        (e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
          try {
            // Try pickPosition first (works on 3D tiles)
            const p3d = viewer.scene.pickPosition(e.endPosition);
            if (p3d && Cesium.defined(p3d) && !isNaN(p3d.x)) {
              const c = Cesium.Cartographic.fromCartesian(p3d);
              if (c) {
                setMouseCoords({
                  lat: Cesium.Math.toDegrees(c.latitude),
                  lng: Cesium.Math.toDegrees(c.longitude),
                });
                return;
              }
            }
            // Fallback: ray cast against ellipsoid (works when globe.show=false)
            const ray = viewer.camera.getPickRay(e.endPosition);
            if (ray) {
              const ellipsoid = viewer.scene.globe.ellipsoid;
              const pos = Cesium.IntersectionTests.rayEllipsoid(
                ray, ellipsoid
              );
              if (pos) {
                const pt = Cesium.Ray.getPoint(ray, pos.start);
                const c = Cesium.Cartographic.fromCartesian(pt);
                if (c) {
                  setMouseCoords({
                    lat: Cesium.Math.toDegrees(c.latitude),
                    lng: Cesium.Math.toDegrees(c.longitude),
                  });
                }
              }
            }
          } catch {
            // Silently ignore pick errors — occurs on tile boundaries
          }
        },
        Cesium.ScreenSpaceEventType.MOUSE_MOVE
      );

      // ── 11. Pakistan soft boundary enforcement ─────────────
      viewer.scene.postRender.addEventListener(() => {
        if (boundaryLockRef.current) return;
        const carto = viewer.camera.positionCartographic;
        if (!carto) return;
        const altKm = carto.height / 1000;
        if (altKm > 600) return;
        const lat = Cesium.Math.toDegrees(carto.latitude);
        const lon = Cesium.Math.toDegrees(carto.longitude);
        const dist = haversineKm(lat, lon, PK_LAT, PK_LON);
        if (dist > PK_DRIFT_KM) {
          boundaryLockRef.current = true;
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
              PK_LON, PK_LAT,
              Math.max(carto.height, 800000)
            ),
            duration: 2.0,
            easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
            complete: () => { boundaryLockRef.current = false; },
            cancel: () => { boundaryLockRef.current = false; },
          });
        }
      });

      // ── 12. Adaptive FPS performance monitor ──────────────
      let frames = 0;
      let lastTime = performance.now();
      let sseLevel = 4;

      viewer.scene.postRender.addEventListener(() => {
        frames++;
        const now = performance.now();
        if (now - lastTime < 1000) return;
        const fps = frames;
        frames = 0;
        lastTime = now;

        if (tilesetRef.current) {
          if (fps < 30 && sseLevel < 16) {
            sseLevel += 2;
            tilesetRef.current.maximumScreenSpaceError = sseLevel;
          } else if (fps > 55 && sseLevel > 4) {
            sseLevel--;
            tilesetRef.current.maximumScreenSpaceError = sseLevel;
          }
        }
      });

      // ── 13. Signal ready ───────────────────────────────────
      (window as any).__argusReady = true;
      setGlobeReady(true);
      console.log('[ARGUS] V7.0 — All systems online.');
      console.log('[ARGUS] Post-processing: Bloom only (CSS view modes)');
    };

    init().catch((e) => {
      console.error('[ARGUS] Init failed:', e);
    });

    // ── Cleanup ────────────────────────────────────────────
    return () => {
      destroyed = true;
      mouseHandlerRef.current?.destroy();

      const v = viewerRef.current;
      if (v && !v.isDestroyed()) {
        v.destroy();
        viewerRef.current = null;
        (window as any).cesiumViewer = null;
        (window as any).__argusReady = false;
      }
    };
  }, []);

  // ── View mode CSS filter ───────────────────────────────────
  // Applied to #cesiumContainer — NOT GLSL shaders
  useEffect(() => {
    const el = document.getElementById('cesiumContainer');
    if (!el) return;
    el.style.filter = VIEW_MODE_FILTERS[viewMode] ?? 'none';
  }, [viewMode]);

  // ── Fly To Target Listener // Fly-to global command listener
  useEffect(() => {
    if (!flyToTarget || !viewerRef.current) return;
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        flyToTarget.lng, flyToTarget.lat, 2000
      ),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
      duration: 3.0,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, [flyToTarget, viewerRef]);

  // Cinematic Sequence Drop Trigger
  const triggerCinematicZoom = useCommandStore((s) => s.triggerCinematicZoom);
  useEffect(() => {
    if (triggerCinematicZoom > 0 && viewerRef.current) {
      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          PK_LON, PK_LAT, PK_OPEN_ALT
        ),
        orientation: {
          heading: 0,
          pitch: Cesium.Math.toRadians(-90), // straight down to maintain perfect center
          roll: 0,
        },
        duration: 4.0,
        easingFunction: Cesium.EasingFunction.QUARTIC_IN_OUT,
      });
    }
  }, [triggerCinematicZoom, viewerRef]);

  // View Mode Effects Listener Gear CSS subscription ───────────────────────────
  // Watches visionStore and applies CSS filter when sliders change
  // Only applies when viewMode is NORMAL (view modes take priority)
  useEffect(() => {
    const unsub = useVisionStore.subscribe((state) => {
      const el = document.getElementById('cesiumContainer');
      if (!el) return;
      const currentMode = useCommandStore.getState().viewMode;
      if (currentMode !== 'NORMAL') return;
      el.style.filter = buildVisionCSS(state);

      // Update vignette overlay
      const vigEl = document.getElementById('vignette-overlay');
      if (vigEl) {
        const v = state.lensShadow / 100;
        (vigEl as HTMLElement).style.background = `radial-gradient(
          ellipse at center,
          transparent ${(1 - v) * 100}%,
          rgba(0,0,0,${(v * 0.85).toFixed(3)}) 100%
        )`;
      }

      // Update bloom if available
      if (bloomRef.current) {
        bloomRef.current.uniforms.contrast =
          80 + (state.lightBleed / 100) * 180;
      }
    });
    return unsub;
  }, []);

  // ════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════
  return (
    <div
      id="cesiumContainer"
      style={{
        width: '100%',
        height: '100%',
        background: '#000008',
        overflow: 'hidden',
      }}
    >
      <PakistanBorder viewerRef={viewerRef} />
      <LandmarkLayer viewerRef={viewerRef} />
      <WeatherLayer viewerRef={viewerRef} />
      <FlightLayer viewerRef={viewerRef} />
      <VesselLayer viewerRef={viewerRef} />
      <SatelliteLayer viewerRef={viewerRef} />
      <SelectionRing viewerRef={viewerRef} />
      <IntelPinLayer viewerRef={viewerRef} />
      <BorderCheckpostLayer viewerRef={viewerRef} />
    </div>
  );
}