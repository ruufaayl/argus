// ============================================================
// File: apps/web/src/App.tsx
// ARGUS v7.0 — Enterprise Command Interface
// Intelligence Platform
// ============================================================

import { useRef, useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from './stores/commandStore';
import { audioService } from './services/audioService';

// ── Core Globe ──────────────────────────────────────────────
import { Globe } from './components/globe/Globe';

// ── UI Panels ───────────────────────────────────────────────
import { TopBar } from './components/ui/TopBar';
import { CommandCenter } from './components/ui/CommandCenter';
import { DataLayersMenu } from './components/ui/DataLayersMenu';
import { InsightWidget } from './components/ui/InsightWidget';
import { LocationsBar } from './components/ui/LocationsBar';
import { BottomBar } from './components/ui/BottomBar';
import { ModeToggle } from './components/ui/ModeToggle';
import { TimelineScrubber } from './components/ui/TimelineScrubber';

// ── Auth & Overlays ──────────────────────────────────────────
import { CommanderAuth } from './components/ui/CommanderAuth';
import { FlightLockOverlay } from './components/globe/FlightLockOverlay';

import './App.css';

// ── Type declarations ────────────────────────────────────────
declare global {
  interface Window {
    cesiumViewer: Cesium.Viewer | null;
    __argusReady: boolean;
  }
}

export function App() {
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  // ── Store selectors ────────────────────────────────────────
  const globeReady = useCommandStore((s) => s.globeReady);
  const cleanUI = useCommandStore((s) => s.optics?.cleanUI ?? false);
  const isLocked = useCommandStore((s) => s.isLocked);
  const setGlobeReady = useCommandStore((s) => s.setGlobeReady);
  const setIsLocked = useCommandStore((s) => s.setIsLocked);

  // ── Clean UI mode ──────────────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle('clean-ui', cleanUI);
  }, [cleanUI]);

  // ── Audio feedback ─────────────────────────────────────────
  useEffect(() => {
    const handleClick = () => audioService.playClick();
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return;

      const store = useCommandStore.getState();

      switch (e.key) {
        case '1': store.setViewMode?.('NORMAL'); break;
        case '2': store.setViewMode?.('NVG'); break;
        case '3': store.setViewMode?.('FLIR'); break;
        case '4': store.setViewMode?.('MONO'); break;
        case '5': store.setViewMode?.('CRT'); break;
        case 'r':
        case 'R':
          if (viewerRef.current) {
            viewerRef.current.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(
                69.1912, 31.2836, 2000000
              ),
              orientation: {
                heading: 0,
                pitch: Cesium.Math.toRadians(-90),
                roll: 0,
              },
              duration: 2.5,
              easingFunction:
                Cesium.EasingFunction.QUARTIC_IN_OUT,
            });
          }
          break;
        case 'Escape':
          store.clearSelection?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const [showIntro] = useState(false);

  // Set globe ready immediately so layers fetch data
  useEffect(() => {
    setGlobeReady(true);
  }, []);

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      {/* Globe always renders — visible through auth overlay */}
      <div
        className="globe-fullscreen"
        id="globe-container"
      >
        <Globe viewerRef={viewerRef} />
      </div>

      {/* Vignette overlay */}
      <div
        className="vignette-overlay"
        id="vignette-overlay"
        aria-hidden="true"
      />

      {/* Commander auth gate */}
      {isLocked && (
        <CommanderAuth onComplete={() => {
          useCommandStore.getState().setViewMode('NORMAL');
          setIsLocked(false);
          useCommandStore.getState().incrementCinematicZoom(); // Trigger the orbital drop!
        }} />
      )}

      {/* Floating UI panels */}
      <div
        className={[
          'ui-layer',
          isLocked || showIntro ? 'ui-locked' : '',
          cleanUI ? 'ui-hidden' : '',
        ].filter(Boolean).join(' ')}
        style={{
          opacity: isLocked || showIntro ? 0 : 1,
          pointerEvents: isLocked || showIntro ? 'none' : 'auto',
          transition: 'opacity 600ms ease',
        }}
        aria-label="ARGUS Command Interface"
      >
        <TopBar />
        <CommandCenter />
        <DataLayersMenu />
        <InsightWidget />
        {globeReady && <LocationsBar />}
        <BottomBar />
        <ModeToggle />
        <TimelineScrubber />
        <FlightLockOverlay viewerRef={viewerRef} />
      </div>

      {/* Boot loading screen */}
      <div
        className={`argus-loading ${globeReady ? 'hidden' : ''}`}
        aria-hidden={globeReady}
      >
        <div className="loading-content">
          <img
            src="/logo/logo.png"
            alt="ARGUS"
            className="loading-logo"
          />
          <div className="loading-title">ARGUS</div>
          <div className="sub">
            INITIALISING INTELLIGENCE GRID
          </div>
          <div className="loading-bar-container">
            <div className="loading-bar" />
          </div>
          <div className="loading-systems">
            <span>GOOGLE 3D TILES</span>
            <span>ADS-B UPLINK</span>
            <span>AIS STREAM</span>
            <span>INTELLIGENCE FEEDS</span>
          </div>
        </div>
      </div>
    </>
  );
}