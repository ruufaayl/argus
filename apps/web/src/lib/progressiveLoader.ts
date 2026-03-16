import * as Cesium from 'cesium';

export function setupProgressiveLoading(
  viewer: Cesium.Viewer
): void {
  const scene = viewer.scene;
  const globe = scene.globe;

  // Base quality — not too aggressive
  // 4.0 = good balance of quality and speed
  globe.maximumScreenSpaceError = 4.0;

  // Load tiles closest to camera center first
  globe.tileCacheSize = 300;
  globe.preloadAncestors = true;
  globe.preloadSiblings = false;

  // Fog-based tile culling
  // Tiles behind fog don't load — saves huge bandwidth
  scene.fog.enabled = true;
  scene.fog.density = 0.0003;
  scene.fog.screenSpaceErrorFactor = 8.0;
  // screenSpaceErrorFactor increases the effective SSE
  // for tiles far from camera — they load at lower quality
  // Tiles near camera: full quality (SSE = 4.0)
  // Tiles at horizon: degraded quality (SSE = 4.0 * 8.0 = 32)
  // Result: centre of screen loads first, always

  // Dynamic SSE based on frame rate
  // If FPS drops, quality reduces automatically
  let lastTime = performance.now();
  let frameCount = 0;

  scene.postRender.addEventListener(() => {
    frameCount++;
    const now = performance.now();
    const elapsed = now - lastTime;

    if (elapsed > 1000) {
      const fps = (frameCount / elapsed) * 1000;
      frameCount = 0;
      lastTime = now;

      if (fps < 25) {
        globe.maximumScreenSpaceError = Math.min(
          16.0,
          globe.maximumScreenSpaceError * 1.5
        );
      } else if (fps > 50 && globe.maximumScreenSpaceError > 4.0) {
        globe.maximumScreenSpaceError = Math.max(
          4.0,
          globe.maximumScreenSpaceError * 0.8
        );
      }
    }
  });

  // Loading progress indicator
  globe.tileLoadProgressEvent.addEventListener((tilesRemaining: number) => {
    const event = new CustomEvent('argus:tilesLoading', {
      detail: { tilesRemaining }
    });
    window.dispatchEvent(event);
  });
}
