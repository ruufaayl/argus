// ============================================================
// visibilityManager.ts — Central manager for Layer visibility based on Altitude
// Prevents clutter and GPU blowout by culling geometry at high altitudes
// ============================================================

import type { AltitudeZone } from '@argus/shared';
import type * as Cesium from 'cesium';

interface ManageableLayers {
  osmBuildings?: Cesium.Cesium3DTileset | null;
  cityBeacons?: Cesium.PointPrimitiveCollection | null;
  cityLabels?: Cesium.LabelCollection | null;
}

export function updateLayerVisibilityByZone(
  zone: AltitudeZone,
  refs: ManageableLayers
) {
  // Building Logic
  if (refs.osmBuildings) {
    if (zone === 'SPACE' || zone === 'APPROACH' || zone === 'COUNTRY') {
      refs.osmBuildings.show = false;
    } else {
      refs.osmBuildings.show = true;
    }
  }

  // Beacon Logic — Visible only from far away
  const showBeacons = (zone === 'SPACE' || zone === 'APPROACH' || zone === 'COUNTRY');
  
  if (refs.cityBeacons) refs.cityBeacons.show = showBeacons;
  if (refs.cityLabels) refs.cityLabels.show = showBeacons;
}
