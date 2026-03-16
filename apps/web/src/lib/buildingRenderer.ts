// ============================================================
// buildingRenderer.ts — 3D Buildings & Photorealistic Tiles
// Attempts Google Photorealistic Tiles -> fallbacks to OSM
// ============================================================

import * as Cesium from 'cesium';

export async function setupBuildings(viewer: Cesium.Viewer): Promise<Cesium.Cesium3DTileset> {
  // 5A — GOOGLE PHOTOREALISTIC 3D TILES (PRIMARY)
  try {
    const googleTiles = await Cesium.Cesium3DTileset.fromIonAssetId(2275207, {
      maximumScreenSpaceError: 4,
      dynamicScreenSpaceError: true,
      dynamicScreenSpaceErrorDensity: 0.00278,
      dynamicScreenSpaceErrorFactor: 4.0,
      dynamicScreenSpaceErrorHeightFalloff: 0.25,
      skipLevelOfDetail: true,
      baseScreenSpaceError: 1024,
      skipScreenSpaceErrorFactor: 16,
      skipLevels: 1,
      immediatelyLoadDesiredLevelOfDetail: false,
      loadSiblings: false,
    });

    viewer.scene.primitives.add(googleTiles);
    return googleTiles;
  } catch (e) {
    console.warn('[ARGUS] Google 3D Tiles unavailable (Permission required via Ion). Falling back to OSM 3D Buildings.');
    return setupOSMBuildings(viewer);
  }
}

// 5B — OSM BUILDINGS FALLBACK
async function setupOSMBuildings(viewer: Cesium.Viewer): Promise<Cesium.Cesium3DTileset> {
  const osmBuildings = await Cesium.createOsmBuildingsAsync({
    style: new Cesium.Cesium3DTileStyle({
      color: {
        conditions: [
          ["${feature['building']} === 'government' || ${feature['building']} === 'civic'", "color('hsl(220, 0.35, 0.28)', 0.97)"],
          ["${feature['building']} === 'commercial' || ${feature['building']} === 'office' || ${feature['building']} === 'retail'", "color('hsl(215, 0.42, 0.22)', 0.97)"],
          ["${feature['building']} === 'mosque' || ${feature['building']} === 'church' || ${feature['building']} === 'temple'", "color('hsl(35, 0.25, 0.28)', 0.97)"],
          ["${feature['building']} === 'industrial' || ${feature['building']} === 'warehouse'", "color('hsl(210, 0.18, 0.20)', 0.97)"],
          ["${feature['building']} === 'residential' || ${feature['building']} === 'apartments' || ${feature['building']} === 'house'", "color('hsl(218, 0.38, 0.20)', 0.95)"],
          ["true", "color('hsl(215, 0.35, 0.18)', 0.93)"],
        ],
      },
      show: "true",
    }),
  });

  viewer.scene.primitives.add(osmBuildings);

  // Configure tile loading for maximum quality
  osmBuildings.maximumScreenSpaceError = 2.0;
  osmBuildings.dynamicScreenSpaceError = true;
  osmBuildings.dynamicScreenSpaceErrorDensity = 0.00278;
  osmBuildings.dynamicScreenSpaceErrorFactor = 4.0;
  osmBuildings.skipLevelOfDetail = true;
  osmBuildings.baseScreenSpaceError = 1024;
  osmBuildings.skipScreenSpaceErrorFactor = 16;
  osmBuildings.skipLevels = 1;
  osmBuildings.loadSiblings = true;

  viewer.scene.globe.enableLighting = true; // CRITICAL for shadows

  return osmBuildings;
}

// 5C — VISIBILITY BY ALTITUDE
export function updateBuildingVisibility(altitude: number, tileset: Cesium.Cesium3DTileset | null) {
  if (!tileset) return;
  // Above 15km altitude -> hide completely
  if (altitude < 15000) {
    tileset.show = true;
    if (altitude < 2000) {
      tileset.maximumScreenSpaceError = 1.0;
    } else if (altitude < 5000) {
      tileset.maximumScreenSpaceError = 2.0;
    } else {
      tileset.maximumScreenSpaceError = 4.0;
    }
  } else {
    tileset.show = false;
  }
}
