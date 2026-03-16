// ============================================================
// cameraSystem.ts — Game-style Camera Input, Inertia & Keyboard Controls
// ============================================================

import * as Cesium from 'cesium';
import { useCommandStore } from '../stores/commandStore';

// 6A-C — SETUP CONTROLS & INERTIA
export function setupCamera(viewer: Cesium.Viewer): void {
  const controller = viewer.scene.screenSpaceCameraController;

  controller.inertiaSpin = 0.93;
  controller.inertiaTranslate = 0.93;
  controller.inertiaZoom = 0.85;

  controller.minimumZoomDistance = 80;
  controller.maximumZoomDistance = 25000000;

  // Custom mapping for game-like camera logic
  controller.tiltEventTypes = [
    Cesium.CameraEventType.RIGHT_DRAG,
    Cesium.CameraEventType.PINCH,
    {
      eventType: Cesium.CameraEventType.LEFT_DRAG,
      modifier: Cesium.KeyboardEventModifier.CTRL,
    },
  ];
  controller.rotateEventTypes = [
    Cesium.CameraEventType.LEFT_DRAG,
  ];
  controller.translateEventTypes = [
    Cesium.CameraEventType.MIDDLE_DRAG,
    {
      eventType: Cesium.CameraEventType.LEFT_DRAG,
      modifier: Cesium.KeyboardEventModifier.SHIFT,
    },
  ];
  controller.zoomEventTypes = [
    Cesium.CameraEventType.WHEEL,
    Cesium.CameraEventType.PINCH,
  ];

  controller.enableCollisionDetection = true;
}

// 6D — SMOOTH FLY TO
export function flyToCity(
  viewer: Cesium.Viewer,
  cityId: 'karachi' | 'lahore' | 'islamabad' | 'rawalpindi',
  onComplete?: () => void
): void {
  const CITY_VIEWS = {
    karachi: { lng: 67.0099, lat: 24.8615, alt: 78000, heading: 345, pitch: -32 },
    lahore: { lng: 74.3436, lat: 31.5497, alt: 72000, heading: 10, pitch: -35 },
    islamabad: { lng: 73.0479, lat: 33.6844, alt: 68000, heading: 355, pitch: -30 },
    rawalpindi: { lng: 73.0651, lat: 33.5651, alt: 70000, heading: 20, pitch: -33 },
  };
  const view = CITY_VIEWS[cityId];

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(view.lng, view.lat, view.alt),
    orientation: {
      heading: Cesium.Math.toRadians(view.heading),
      pitch: Cesium.Math.toRadians(view.pitch),
      roll: 0,
    },
    duration: 3.5,
    easingFunction: Cesium.EasingFunction.QUARTIC_IN_OUT,
    complete: onComplete,
  });
}

// 6E — KEYBOARD LISTENER
export function setupKeyboardControls(viewer: Cesium.Viewer): () => void {
  function onKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement) return;
    if (e.target instanceof HTMLTextAreaElement) return;

    switch (e.key) {
      case '1': flyToCity(viewer, 'karachi'); break;
      case '2': flyToCity(viewer, 'lahore'); break;
      case '3': flyToCity(viewer, 'islamabad'); break;
      case '4': flyToCity(viewer, 'rawalpindi'); break;
      case 'Home':
      case '0':
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(69.3451, 30.3753, 1400000),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-55),
            roll: 0,
          },
          duration: 4.0,
          easingFunction: Cesium.EasingFunction.QUARTIC_IN_OUT,
        });
        break;
      case ' ':
        const pos = viewer.camera.positionCartographic;
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromRadians(pos.longitude, pos.latitude, pos.height),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
          duration: 1.5,
          easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
        });
        break;
      case 'ArrowUp': viewer.camera.rotate(viewer.camera.right, Cesium.Math.toRadians(-2)); break;
      case 'ArrowDown': viewer.camera.rotate(viewer.camera.right, Cesium.Math.toRadians(2)); break;
      case 'ArrowLeft': viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, Cesium.Math.toRadians(2)); break;
      case 'ArrowRight': viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, Cesium.Math.toRadians(-2)); break;
      case 'Escape':
        useCommandStore.getState().clearSelection();
        useCommandStore.getState().setFlyToTarget(null);

        const currentPos = viewer.camera.positionCartographic;
        const currentLatEsc = Cesium.Math.toDegrees(currentPos.latitude);
        const currentLngEsc = Cesium.Math.toDegrees(currentPos.longitude);
        const currentAltEsc = currentPos.height;
        
        // Zoom out 50km (50,000 meters)
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(currentLngEsc, currentLatEsc, currentAltEsc + 50000),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-60), // Match hover angle
            roll: 0
          },
          duration: 2.0,
          easingFunction: Cesium.EasingFunction.QUARTIC_OUT
        });
        break;
    }

  }

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}

// 6F — DOUBLE CLICK DIVE
export function setupDoubleClickDive(viewer: Cesium.Viewer): void {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
    if (Cesium.defined(cartesian)) {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const lng = Cesium.Math.toDegrees(cartographic.longitude);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);
      const currentAlt = viewer.camera.positionCartographic.height;
      const targetAlt = Math.max(300, currentAlt * 0.25);

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lng, lat, targetAlt),
        orientation: { heading: viewer.camera.heading, pitch: viewer.camera.pitch, roll: 0 },
        duration: 1.8,
        easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      });
    }
  }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
}

// 6G — CURSOR SYSTEM
export function setupCursor(viewer: Cesium.Viewer): void {
  const canvas = viewer.scene.canvas as HTMLCanvasElement;
  canvas.style.cursor = 'crosshair';

  let isDragging = false;
  canvas.addEventListener('mousedown', () => {
    isDragging = true;
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'crosshair';
  });
  canvas.addEventListener('mousemove', () => {
    if (!isDragging) canvas.style.cursor = 'crosshair';
  });
}
