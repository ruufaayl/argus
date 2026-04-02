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
import { ProjectedRouteLayer } from './layers/ProjectedRouteLayer';
import { CCTVLayer } from './layers/CCTVLayer';
import { SigintLayer } from './layers/SigintLayer';

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════

const PK_LON = 69.1912;
const PK_LAT = 31.2836;
const PK_OPEN_ALT = 4500000;
const PK_MAX_ALT = 40000000;  // 40,000km — see all satellites
const PK_MIN_ALT = 150;
const IDLE_TIMEOUT_MS = 15_000;  // 15s idle → auto zoom out

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
  // boundaryLockRef removed (unused)
  const tilesetRef = useRef<Cesium.Cesium3DTileset | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isFlyingRef = useRef(false);
  const trackedEntityRef = useRef<{lon: number; lat: number; alt: number; type: string} | null>(null);

  // ── Main initialisation ────────────────────────────────────
  useEffect(() => {
    let destroyed = false;

    const init = async () => {
      const container = document.getElementById('cesiumContainer');
      if (!container) {
        console.error('[ARGUS] cesiumContainer element missing');
        return;
      }

      // ── 1. Disable Cesium Ion completely ────────────────
      Cesium.Ion.defaultAccessToken = '';

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

      // ── 3. Globe imagery — multi-source with fallback ──
      viewer.scene.globe.show = true;
      viewer.scene.globe.baseColor =
        Cesium.Color.fromCssColorString('#0A1628');

      // Remove ALL default imagery layers (Ion-based or otherwise)
      viewer.imageryLayers.removeAll();

      // ── Render error recovery (must be set BEFORE adding imagery) ──
      viewer.scene.renderError.addEventListener((_scene: any, error: any) => {
        const msg = error?.message || String(error);
        console.warn('[ARGUS] Render error (recovering):', msg);
        if (!viewer.useDefaultRenderLoop) {
          setTimeout(() => {
            if (!viewer.isDestroyed() && !viewer.useDefaultRenderLoop) {
              console.warn('[ARGUS] Restarting render loop...');
              viewer.useDefaultRenderLoop = true;
            }
          }, 100);
        }
      });

      // ── Global imagery error interceptor ──────────────────
      viewer.imageryLayers.layerAdded.addEventListener((layer: Cesium.ImageryLayer) => {
        const provider = layer.imageryProvider;
        if (provider?.errorEvent) {
          provider.errorEvent.addEventListener(() => false);
        }
      });

      // ── Add imagery: Cesium built-in NaturalEarth base + Esri overlay ──
      // NaturalEarthII ships with Cesium static assets (served by vite-plugin-cesium)
      // This gives us a guaranteed base layer even if external tiles fail.
      try {
        const naturalEarth = await Cesium.TileMapServiceImageryProvider.fromUrl(
          Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
        );
        naturalEarth.errorEvent.addEventListener(() => false);
        viewer.imageryLayers.addImageryProvider(naturalEarth);
        console.log('[ARGUS] NaturalEarth base imagery: ONLINE');
      } catch (neErr) {
        console.warn('[ARGUS] NaturalEarth failed:', neErr);
      }

      // Esri World Imagery overlay (high-res satellite tiles)
      const esriProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 19,
        credit: 'Esri, Maxar, Earthstar Geographics',
      });
      esriProvider.errorEvent.addEventListener(() => false);
      const esriLayer = viewer.imageryLayers.addImageryProvider(esriProvider);
      esriLayer.alpha = 1.0;
      console.log('[ARGUS] Esri World Imagery overlay: ONLINE');

      console.log('[ARGUS] Imagery layers:', viewer.imageryLayers.length);

      // ── 4. Terrain — ellipsoid (flat, no Ion required) ───
      viewer.scene.globe.showWaterEffect = false;
      console.log('[ARGUS] Ellipsoid terrain: ONLINE');

      // ── 5. Scene configuration ─────────────────────────────
      viewer.scene.sun = new Cesium.Sun();
      viewer.scene.moon = new Cesium.Moon();
      viewer.scene.globe.enableLighting = false;
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
      ctrl.inertiaSpin = 0.97;
      ctrl.inertiaTranslate = 0.97;
      ctrl.inertiaZoom = 0.92;
      ctrl.minimumZoomDistance = PK_MIN_ALT;
      ctrl.maximumZoomDistance = PK_MAX_ALT;
      ctrl.maximumMovementRatio = 0.1;
      ctrl.bounceAnimationTime = 2.0;
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

      // ── 10b. Click-to-fly — click anywhere on globe ──────
      // If no entity is picked (LandmarkLayer handles entity clicks),
      // fly to 2km above clicked point and show coordinate pin.
      mouseHandlerRef.current.setInputAction(
        (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
          try {
            // Check if an entity/primitive was picked — let layer handlers deal with those
            const picked = viewer.scene.pick(e.position);
            if (Cesium.defined(picked) && picked.id) return;

            // Get globe surface position
            const ray = viewer.camera.getPickRay(e.position);
            if (!ray) return;

            const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
            if (!cartesian) return;

            const carto = Cesium.Cartographic.fromCartesian(cartesian);
            if (!carto) return;

            const lat = Cesium.Math.toDegrees(carto.latitude);
            const lng = Cesium.Math.toDegrees(carto.longitude);

            // Cancel any in-flight animation first to prevent crash
            viewer.camera.cancelFlight();
            isFlyingRef.current = true;

            // Fly to 2km above the clicked point
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(lng, lat, 2000),
              orientation: {
                heading: 0,
                pitch: Cesium.Math.toRadians(-45),
                roll: 0,
              },
              duration: 2.5,
              easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
              complete: () => { isFlyingRef.current = false; },
              cancel: () => { isFlyingRef.current = false; },
            });

            // Add a temporary coordinate pin at clicked location
            const pinId = `click-pin-${Date.now()}`;
            viewer.entities.add({
              id: pinId,
              position: Cesium.Cartesian3.fromDegrees(lng, lat, 50),
              point: {
                pixelSize: 10,
                color: Cesium.Color.fromCssColorString('#00FFCC'),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
              },
              label: {
                text: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
                font: '13px "Inter", sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 3,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -24),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                showBackground: true,
                backgroundColor: Cesium.Color.fromCssColorString('rgba(10,20,30,0.85)'),
                backgroundPadding: new Cesium.Cartesian2(8, 5),
              },
            });

            // Remove pin after 8 seconds
            setTimeout(() => {
              if (!viewer.isDestroyed()) {
                viewer.entities.removeById(pinId);
              }
            }, 8000);

          } catch {
            // Ignore pick errors
          }
        },
        Cesium.ScreenSpaceEventType.LEFT_CLICK
      );

      // ── 11. Idle auto-zoom out ──────────────────────────────
      // If user is idle for 15 seconds, zoom back to default Pakistan view
      let idleTimer: ReturnType<typeof setTimeout> | null = null;

      const resetIdleTimer = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          if (viewer.isDestroyed() || isFlyingRef.current) return;
          const h = viewer.camera.positionCartographic?.height ?? 0;
          // Only auto-zoom if currently zoomed in (below 1000km)
          if (h < 1_000_000) {
            isFlyingRef.current = true;
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(
                PK_LON, PK_LAT, PK_OPEN_ALT
              ),
              orientation: {
                heading: 0,
                pitch: Cesium.Math.toRadians(-90),
                roll: 0,
              },
              duration: 3.0,
              easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
              complete: () => { isFlyingRef.current = false; },
              cancel: () => { isFlyingRef.current = false; },
            });
          }
        }, IDLE_TIMEOUT_MS);
      };

      // Reset timer on any user interaction
      const canvas = viewer.scene.canvas;
      canvas.addEventListener('pointerdown', resetIdleTimer);
      canvas.addEventListener('pointermove', resetIdleTimer);
      canvas.addEventListener('wheel', resetIdleTimer);
      resetIdleTimer(); // Start initial timer

      idleTimerRef.current = idleTimer!;

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
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
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

  // ── Fly To Target Listener — global command listener
  useEffect(() => {
    if (!flyToTarget || !viewerRef.current) return;
    const viewer = viewerRef.current;
    if (viewer.isDestroyed()) return;

    // Guard: cancel any in-flight animation first
    viewer.camera.cancelFlight();
    isFlyingRef.current = true;

    viewer.camera.flyTo({
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
      complete: () => { isFlyingRef.current = false; },
      cancel: () => { isFlyingRef.current = false; },
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

  // ── Entity-Centric Camera Tracking ─────────────────────────
  // When an entity is selected, enable orbit-around-entity mode
  useEffect(() => {
    const unsub = useCommandStore.subscribe((state, prev) => {
      const entity = (state as any).selectedEntity;
      const prevEntity = (prev as any)?.selectedEntity;

      if (entity === prevEntity) return;

      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return;

      if (entity && entity.data) {
        const d = entity.data;
        let lon = d.lon ?? d.lng ?? 0;
        let lat = d.lat ?? 0;
        let alt = 0;

        if (entity.type === 'satellite') {
          alt = (d.altKm || 400) * 1000;
        } else if (entity.type === 'flight') {
          alt = Math.max((d.altitudeFt || 35000) * 0.3048, 1000);
        } else if (entity.type === 'vessel') {
          alt = 5;
        } else {
          alt = 50;
        }

        // Set orbit center to entity position
        const entityPosition = Cesium.Cartesian3.fromDegrees(lon, lat, alt);

        // Create a temporary entity for camera tracking
        const trackId = '__argus_track_entity__';
        viewer.entities.removeById(trackId);

        const trackEntity = viewer.entities.add({
          id: trackId,
          position: entityPosition,
          point: {
            pixelSize: 1,
            color: Cesium.Color.TRANSPARENT,
          },
        });

        // Use Cesium's built-in entity tracking for orbit behavior
        viewer.trackedEntity = trackEntity;
        trackedEntityRef.current = { lon, lat, alt, type: entity.type };

        // Fly to appropriate viewing distance
        const viewDist = entity.type === 'satellite' ? 500000 :
                         entity.type === 'flight' ? 80000 :
                         entity.type === 'vessel' ? 2000 : 5000;

        setTimeout(() => {
          if (viewer.isDestroyed()) return;
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt + viewDist),
            orientation: {
              heading: 0,
              pitch: Cesium.Math.toRadians(-45),
              roll: 0,
            },
            duration: 2.0,
            easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
          });
        }, 100);

      } else {
        // Entity deselected — release tracking
        viewer.trackedEntity = undefined;
        viewer.entities.removeById('__argus_track_entity__');
        trackedEntityRef.current = null;
      }
    });

    return unsub;
  }, [viewerRef]);

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
      <ProjectedRouteLayer viewerRef={viewerRef} />
      <CCTVLayer viewerRef={viewerRef} />
      <SigintLayer viewerRef={viewerRef} />
    </div>
  );
}