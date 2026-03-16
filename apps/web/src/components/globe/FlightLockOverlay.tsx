import { useEffect, useState, useRef } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore, FlightEntity } from '../../stores/commandStore';
import { audioService } from '../../services/audioService';

interface FlightLockOverlayProps {
  viewerRef: React.RefObject<Cesium.Viewer | null>;
}

export function FlightLockOverlay({ viewerRef }: FlightLockOverlayProps) {
  const selectedEntity = useCommandStore((s) => s.selectedEntity);
  const [screenPos, setScreenPos] = useState({ x: -1000, y: -1000, visible: false });
  const [isTracking, setIsTracking] = useState(false);
  const reqRef = useRef<number>();
  const lastEntityId = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedEntity || selectedEntity.type !== 'flight') {
      setScreenPos({ x: -1000, y: -1000, visible: false });
      setIsTracking(false);
      lastEntityId.current = null;
      if (viewerRef.current && viewerRef.current.trackedEntity) {
         viewerRef.current.trackedEntity = undefined;
      }
      return;
    }

    const flight = selectedEntity.data as FlightEntity;

    // Play target lock sound on first selection
    if (lastEntityId.current !== flight.icao24) {
      audioService.playTargetAcquired();
      lastEntityId.current = flight.icao24;
    }

    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const updatePosition = () => {
      reqRef.current = requestAnimationFrame(updatePosition);

      const ds = viewer.dataSources.getByName('flight-layer')[0];
      const entity = ds?.entities.getById(flight.icao24);   
      
      if (!entity || !entity.position) {
         setScreenPos(s => ({ ...s, visible: false }));
         return;
      }

      const time = viewer.clock.currentTime;
      const position = entity.position.getValue(time);

      if (position) {
        const windowPos = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, position);
        if (windowPos) {
          setScreenPos({
            x: windowPos.x,
            y: windowPos.y,
            visible: true
          });
        } else {
          setScreenPos(s => ({ ...s, visible: false }));
        }
      }
    };

    reqRef.current = requestAnimationFrame(updatePosition);

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [selectedEntity, viewerRef]);

  const toggleTracking = () => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedEntity || selectedEntity.type !== 'flight') return;

    const flight = selectedEntity.data as FlightEntity;

    audioService.playClick();

    if (isTracking) {
      viewer.trackedEntity = undefined;
      setIsTracking(false);
      viewer.camera.flyTo({
        destination: viewer.camera.position,
        orientation: {
           heading: viewer.camera.heading,
           pitch: Cesium.Math.toRadians(-45),
           roll: 0
        },
        duration: 1.5
      });
    } else {
      const ds = viewer.dataSources.getByName('flight-layer')[0];
      const entity = ds?.entities.getById(flight.icao24);
      if (entity) {
        viewer.trackedEntity = entity;
        setIsTracking(true);
        audioService.playLockOn();
      }
    }
  };

  if (!screenPos.visible || !selectedEntity || selectedEntity.type !== 'flight') return null;

  const flight = selectedEntity.data as FlightEntity;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 40,
        overflow: 'hidden'
      }}
    >
      <style>{`
        @keyframes bracketPulse {
          0% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.0); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.5; }
        }
        @keyframes scanline {
          0% { transform: translateY(-40px); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: translateY(40px); opacity: 0; }
        }
      `}</style>

      {/* Target Bracket */}
      <div
        style={{
          position: 'absolute',
          left: screenPos.x,
          top: screenPos.y,
          width: '80px',
          height: '80px',
          boxSizing: 'border-box',
          animation: 'bracketPulse 1s ease-in-out infinite',
          transition: 'all 0.1s linear',
          pointerEvents: 'none'
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 80 80">
          <path d="M 0 20 L 0 0 L 20 0" fill="none" stroke="#00dcff" strokeWidth="2" />
          <path d="M 80 20 L 80 0 L 60 0" fill="none" stroke="#00dcff" strokeWidth="2" />
          <path d="M 0 60 L 0 80 L 20 80" fill="none" stroke="#00dcff" strokeWidth="2" />
          <path d="M 80 60 L 80 80 L 60 80" fill="none" stroke="#00dcff" strokeWidth="2" />
          <rect x="10" y="39" width="60" height="2" fill="rgba(0, 220, 255, 0.4)" />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, 
          background: 'linear-gradient(transparent, rgba(0,220,255,0.6), transparent)',
          height: '2px', animation: 'scanline 0.8s linear infinite'
        }} />
      </div>

      {/* Interactive Hub */}
      <div
        style={{
          position: 'absolute',
          left: screenPos.x + 50,
          top: screenPos.y - 40,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          pointerEvents: 'auto'
        }}
      >
        <div
          style={{
            fontFamily: '"Share Tech Mono", monospace',
            color: '#00dcff',
            textShadow: '0 0 8px rgba(0,220,255,0.8)',
            backgroundColor: 'rgba(2, 8, 18, 0.9)',
            padding: '8px 14px',
            borderLeft: '3px solid #00dcff',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(8px)',
            clipPath: 'polygon(0 0, 100% 0, 100% 70%, 90% 100%, 0 100%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', letterSpacing: '1px' }}> 
            {flight.callsign || 'SIGINT-TGT'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div><span style={{opacity: 0.6}}>ALT:</span> {Math.round(flight.altitude * 3.28084)} FT</div>
            <div><span style={{opacity: 0.6}}>SPD:</span> {Math.round(flight.velocity)} KT</div>
            <div><span style={{opacity: 0.6}}>HDG:</span> {Math.round(flight.heading)}°</div>
            <div><span style={{opacity: 0.6}}>TYPE:</span> {flight.isMilitary ? 'MILITARY' : 'CIVIL'}</div>
          </div>
        </div>

        <button
          onClick={toggleTracking}
          style={{
            backgroundColor: isTracking ? '#00dcff' : 'rgba(0, 220, 255, 0.1)',
            color: isTracking ? '#000' : '#00dcff',
            border: '1px solid #00dcff',
            padding: '6px 10px',
            fontSize: '10px',
            fontWeight: 'bold',
            fontFamily: '"Share Tech Mono", monospace',
            cursor: 'pointer',
            marginTop: '4px',
            textAlign: 'center',
            letterSpacing: '2px',
            transition: 'all 0.2s ease',
            pointerEvents: 'auto',
            boxShadow: isTracking ? '0 0 15px rgba(0,220,255,0.6)' : 'none'
          }}
        >
          {isTracking ? 'BREAK TRACK' : 'ENGAGE LOCK'}
        </button>
      </div>
    </div>
  );
}
