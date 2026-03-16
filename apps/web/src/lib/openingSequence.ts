import * as Cesium from 'cesium';

// Wait until the globe has loaded enough tiles to look good
function waitForGlobeReady(
  viewer: Cesium.Viewer,
  timeoutMs = 8000
): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;

    // Resolve when tile loading drops to near zero
    const unsubscribe = viewer.scene.globe.tileLoadProgressEvent.addEventListener(
      (tilesRemaining: number) => {
        if (tilesRemaining < 5 && !resolved) {
          resolved = true;
          unsubscribe();
          resolve();
        }
      }
    );

    // Safety timeout — resolve after 8s regardless
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        resolve();
      }
    }, timeoutMs);
  });
}

export async function runOpeningSequence(
  viewer: Cesium.Viewer,
  onComplete: () => void
): Promise<void> {

  if (viewer.isDestroyed()) return;

  // STEP 1 — Set initial camera position INSTANTLY
  // Start from space — user sees stars + Earth immediately
  // No animation, instant placement
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      67.0, 28.0, 4000000  // 4000km above Pakistan
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-50),
      roll: 0,
    },
  });

  // STEP 2 — Wait for tiles to actually load before moving
  // This prevents the black-screen-then-jerk problem
  await waitForGlobeReady(viewer);

  if (viewer.isDestroyed()) return;

  // STEP 3 — Slow atmospheric descent
  // User sees Pakistan from space for 2 seconds first
  await new Promise<void>((resolve) => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        67.5, 26.5, 600000  // 600km
      ),
      orientation: {
        heading: Cesium.Math.toRadians(10),
        pitch: Cesium.Math.toRadians(-42),
        roll: 0,
      },
      duration: 3.0,
      easingFunction: Cesium.EasingFunction.QUINTIC_IN_OUT,
      complete: resolve,
      cancel: resolve,
    });
  });

  if (viewer.isDestroyed()) return;

  // STEP 4 — Final dive to Karachi city view
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      67.0099, 24.8615, 80000  // 80km above Karachi
    ),
    orientation: {
      heading: Cesium.Math.toRadians(345),
      pitch: Cesium.Math.toRadians(-32),
      roll: 0,
    },
    duration: 3.5,
    easingFunction: Cesium.EasingFunction.QUARTIC_IN_OUT,
    complete: () => {
      onComplete();
    },
    cancel: () => {
      onComplete();
    },
  });
}
