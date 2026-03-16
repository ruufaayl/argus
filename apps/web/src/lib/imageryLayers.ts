import * as Cesium from 'cesium';

export interface ImageryLayerRefs {
  baseLayer: Cesium.ImageryLayer;
  nightLayer: Cesium.ImageryLayer | null;
}

export async function setupImageryLayers(
  viewer: Cesium.Viewer
): Promise<ImageryLayerRefs> {

  // Remove all defaults first
  viewer.imageryLayers.removeAll();

  let baseLayer: Cesium.ImageryLayer;

  // ATTEMPT 1 — Bing Maps via Cesium Ion (best quality)
  // Requires Ion token with assets:read scope
  try {
    const bingProvider = await Cesium.IonImageryProvider.fromAssetId(2);
    baseLayer = viewer.imageryLayers.addImageryProvider(bingProvider);
    baseLayer.brightness = 1.05;
    baseLayer.contrast = 1.1;
    baseLayer.saturation = 0.95;
    console.log('[ARGUS] Imagery: Bing Maps loaded');
  } catch (e) {
    console.warn('[ARGUS] Bing Maps failed, trying Esri:', e);

    // ATTEMPT 2 — Esri World Imagery
    // Completely free. No token. No account.
    // Photorealistic satellite. Always works.
    try {
      const esriProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://services.arcgisonline.com/arcgis/rest/services/' +
             'World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: new Cesium.Credit('Esri, Maxar, Earthstar Geographics'),
        minimumLevel: 0,
        maximumLevel: 19,
        tileWidth: 256,
        tileHeight: 256,
      });
      baseLayer = viewer.imageryLayers.addImageryProvider(esriProvider);
      baseLayer.brightness = 1.0;
      baseLayer.contrast = 1.05;
      console.log('[ARGUS] Imagery: Esri World Imagery loaded');
    } catch (e2) {
      console.warn('[ARGUS] Esri failed, using Natural Earth:', e2);

      // ATTEMPT 3 — Natural Earth (bundled with CesiumJS, always works)
      // Lower quality but 100% reliable offline fallback
      const naturalEarthProvider =
        await Cesium.TileMapServiceImageryProvider.fromUrl(
          Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII'),
          {
            fileExtension: 'jpg',
            maximumLevel: 5,
            credit: new Cesium.Credit('Natural Earth'),
          }
        );
      baseLayer = viewer.imageryLayers.addImageryProvider(
        naturalEarthProvider
      );
      console.log('[ARGUS] Imagery: Natural Earth fallback loaded');
    }
  }

  // Night lights layer — DISABLED
  // NASA GIBS WMTS tile matrix is incompatible with CesiumJS
  // GeographicTilingScheme indices at certain zoom levels,
  // causing 400 errors and purple/magenta tile corruption.
  // Will re-add in Phase 4 using correct COG/STAC approach.
  const nightLayer: Cesium.ImageryLayer | null = null;

  return { baseLayer, nightLayer };
}

// Smooth night lights fade — call on every altitude change
export function updateNightLights(
  altitude: number,
  nightLayer: Cesium.ImageryLayer | null
): void {
  if (!nightLayer) return;
  let target = 0.0;
  if (altitude > 300000) {
    target = 0.88;
  } else if (altitude > 100000) {
    target = ((altitude - 100000) / 200000) * 0.88;
  }
  // Smooth lerp — no flickering
  nightLayer.alpha = nightLayer.alpha + (target - nightLayer.alpha) * 0.06;
}
