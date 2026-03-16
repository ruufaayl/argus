// ============================================================
// Globe.tsx — V4 Renderer
// Removes Google 3D Tiles, uses standard Cesium Imagery
// ============================================================

import { useEffect } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../stores/commandStore';

// Overlays
import { AtmosphereLayer } from './AtmosphereLayer';
import { NightLightsLayer } from './NightLightsLayer';
import { PopulationLayer } from './PopulationLayer';
import { LandmarkLayer } from './LandmarkLayer';

// Specific V4 Intelligence Layers
import { FlightLayer3D } from './FlightLayer3D';
import { CCTVLayer } from './layers/CCTVLayer';
import { TrafficLayer } from './layers/TrafficLayer';
import { SigintLayer } from './layers/SigintLayer';
import { FlightLayer } from './layers/FlightLayer';

interface Props {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

export function Globe({ viewerRef }: Props) {
  const setGlobeReady = useCommandStore((s) => s.setGlobeReady);
// Removed updateCameraAltitude
  // Removed viewMode

  useEffect(() => {
    const initializeViewer = async () => {
      const container = document.getElementById('cesiumContainer');
      if (!container) return;

    // Initialize V4 standard 3D Globe
    const viewer = new Cesium.Viewer(container, {
      terrainProvider: await Cesium.createWorldTerrainAsync({
        requestWaterMask: true,
        requestVertexNormals: true,
      }),
      baseLayer: new Cesium.ImageryLayer(await Cesium.IonImageryProvider.fromAssetId(2)), // Standard Cesium BaseLayer
      animation: false,
      timeline: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      homeButton: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      geocoder: false,
      creditContainer: document.createElement('div'),
      selectionIndicator: false,
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
    });

    viewerRef.current = viewer;

    // V4 Globe Tweaks
    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.debugShowFramesPerSecond = false;
    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.0001;

    // Atmosphere
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.hueShift = -0.1;
      viewer.scene.skyAtmosphere.saturationShift = 0.3;
      viewer.scene.skyAtmosphere.brightnessShift = -0.1;
    }

    // High altitude default view (looking at Pakistan)
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(69.3451, 30.3753, 3500000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-80),
        roll: 0.0,
      },
      duration: 3,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });

    // Track camera altitude changes
    viewer.camera.changed.addEventListener(() => {
      // const _height = (viewer.camera.positionCartographic as any).height;
      // updateCameraAltitude(height);
    });

    setGlobeReady(true);
    };
    
    initializeViewer();

    return () => {
      const viewer = viewerRef.current;
      if (viewer) {
        viewer.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Update render continuously for V4 glow effects
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const t = setInterval(() => viewer.scene.requestRender(), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div id="cesiumContainer" style={{ width: '100%', height: '100%', background: '#000' }}>
      <AtmosphereLayer viewerRef={viewerRef} />
      <NightLightsLayer viewerRef={viewerRef} isNightMode={false} />
      <PopulationLayer viewerRef={viewerRef} visible={true} currentZone={'CITY'} cityId={'islamabad'} />
      <LandmarkLayer viewerRef={viewerRef} />
      
      {/* V4 Intelligence layers */}
      <CCTVLayer viewerRef={viewerRef} />
      <TrafficLayer viewerRef={viewerRef} />
      <SigintLayer viewerRef={viewerRef} />
      <FlightLayer3D viewerRef={viewerRef} flights={[]} visible={true} currentZone={'CITY'} selectedFlight={null} onSelectFlight={() => {}} />
      <FlightLayer viewerRef={viewerRef} />
    </div>
  );
}
