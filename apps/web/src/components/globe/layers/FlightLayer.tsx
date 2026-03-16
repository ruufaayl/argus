// ============================================================
// FlightLayer — Real-time flight tracking with 3D Models
// ============================================================

import { useEffect, useRef, type MutableRefObject } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../../stores/commandStore';
import { useADSB } from '../../../hooks/useADSB';
import type { FlightEntity } from '../../../stores/commandStore';

interface Props {
  viewerRef: MutableRefObject<Cesium.Viewer | null>;
}

// Map aircraft types/callsigns to available models
const getModelForFlight = (f: FlightEntity) => {
  const callsign = f.callsign.toUpperCase();
  
  if (f.isMilitary) return '/models/glTF2/AT75.glb'; // Smaller, tactical look
  if (callsign.startsWith('PIA')) {
    // Guess based on PIA fleet
    if (callsign.match(/PIA\d{3}/)) return '/models/glTF2/B747.glb';
    return '/models/glTF2/A320.glb';
  }
  if (callsign.startsWith('EK') || callsign.startsWith('UAE')) return '/models/glTF2/A380.glb';
  if (callsign.startsWith('QR') || callsign.startsWith('QTR')) return '/models/glTF2/B788.glb';
  
  // Default to A320 for generic traffic
  return '/models/glTF2/A320.glb';
};

export function FlightLayer({ viewerRef }: Props) {
  const flights = useADSB();
  const isVisible = useCommandStore((s) => s.layers.flights);
  const selectEntity = useCommandStore((s) => s.selectEntity);
  const selectedEntity = useCommandStore((s) => s.selectedEntity);

  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);
  const trailsRef = useRef<Map<string, Cesium.Cartesian3[]>>(new Map());

  // Initialize Data Source
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const ds = new Cesium.CustomDataSource('flight-layer');
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    // Click handler for entities
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);        
    handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id instanceof Cesium.Entity) {
        const entity = picked.id;
        if (entity.properties && entity.properties.hasProperty('flightData')) {     
          const flight: FlightEntity = entity.properties.getValue(Cesium.JulianDate.now()).flightData;
          selectEntity({ type: 'flight', data: flight });
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      if (!viewer.isDestroyed()) {
        viewer.dataSources.remove(ds);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update flight entities
  useEffect(() => {
    const ds = dataSourceRef.current;
    if (!ds) return;

    if (!isVisible) {
      ds.entities.removeAll();
      return;
    }

    const currentIcaos = new Set(flights.map(f => f.icao24));

    // Remove stale flights
    const entitiesToRemove: Cesium.Entity[] = [];
    ds.entities.values.forEach((entity) => {
      if (!currentIcaos.has(entity.id)) {
        entitiesToRemove.push(entity);
        trailsRef.current.delete(entity.id); // FIX: Memory leak cleanup
      }
    });
    entitiesToRemove.forEach(e => ds.entities.remove(e));

    // Upsert flights
    flights.forEach((f) => {
      const pos = Cesium.Cartesian3.fromDegrees(f.lon, f.lat, f.altitude);

      // Update history trail
      const trail = trailsRef.current.get(f.icao24) || [];
      trail.push(pos);
      if (trail.length > 50) trail.shift();
      trailsRef.current.set(f.icao24, trail);

      const isSelected = selectedEntity?.type === 'flight' && selectedEntity.data.icao24 === f.icao24;
      
      // Correcting orientation
      const headingRad = Cesium.Math.toRadians(f.heading);
      const hpr = new Cesium.HeadingPitchRoll(headingRad - Cesium.Math.PI_OVER_TWO, 0, 0); 
      const orientation = Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);   

      let entity = ds.entities.getById(f.icao24);

      if (!entity) {
        entity = ds.entities.add({
          id: f.icao24,
          position: pos,
          orientation: orientation as any,
          model: {
            uri: getModelForFlight(f),
            minimumPixelSize: 28,
            maximumScale: 500,
            silhouetteColor: Cesium.Color.CYAN,
            silhouetteSize: 0.0,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2_000_000),
          },
          point: {
            pixelSize: f.isMilitary ? 7 : 5,
            color: f.isMilitary ? Cesium.Color.GOLD : Cesium.Color.fromCssColorString('#00C8FF'),
            outlineColor: Cesium.Color.BLACK.withAlpha(0.7),
            outlineWidth: 1.5,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 50_000_000),
          },
          label: {
            font: '11px "Share Tech Mono", monospace',
            fillColor: Cesium.Color.WHITE.withAlpha(0.85),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -22),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 600_000),
            showBackground: true,
            backgroundColor: new Cesium.Color(0.03, 0.07, 0.14, 0.85),
            backgroundPadding: new Cesium.Cartesian2(6, 3),
          },
          polyline: {
            width: 1.5,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.2,
              color: Cesium.Color.fromCssColorString('#00C8FF').withAlpha(0.5),
            }),
            show: false,
          },
          properties: new Cesium.PropertyBag(),
        });
      }

      // Update changeable properties
      if (entity.position instanceof Cesium.ConstantPositionProperty) {
        entity.position.setValue(pos);
      } else {
        entity.position = new Cesium.ConstantPositionProperty(pos) as any;
      }
      
      if (entity.orientation instanceof Cesium.ConstantProperty) {
        entity.orientation.setValue(orientation);
      } else {
        entity.orientation = new Cesium.ConstantProperty(orientation) as any;
      }

      // Update colors/labels
      const altFL = Math.round(f.altitude / 30.48);
      if (entity.label) {
        if (entity.label.text instanceof Cesium.ConstantProperty) {
          entity.label.text.setValue(`${f.callsign || f.icao24}\nFL${altFL} / ${Math.round(f.velocity)}KT`);
        }
        if (entity.label.fillColor instanceof Cesium.ConstantProperty) {
          entity.label.fillColor.setValue(isSelected ? Cesium.Color.CYAN : (f.isMilitary ? Cesium.Color.GOLD : Cesium.Color.WHITE));
        }
      }

      if (entity.model && entity.model.silhouetteSize instanceof Cesium.ConstantProperty) {
        entity.model.silhouetteSize.setValue(isSelected ? 3.0 : 0.0);
      }

      if (entity.polyline) {
        if (entity.polyline.positions instanceof Cesium.ConstantProperty) {
          entity.polyline.positions.setValue(trail);
        }
        if (entity.polyline.show instanceof Cesium.ConstantProperty) {
          entity.polyline.show.setValue(isSelected && trail.length > 1);
        }
      }

      if (entity.properties) {
        if (!entity.properties.hasProperty('flightData')) {
          entity.properties.addProperty('flightData', f);
        } else {
          (entity.properties as any).flightData = f;
        }
      }

    });
  }, [flights, isVisible, selectedEntity]);

  return null;
}
