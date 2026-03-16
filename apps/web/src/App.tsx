// File: apps/web/src/App.tsx
// ARGUS V4.0 — Classic Interface
// Restored previous static layer system & layout

import { useRef, useEffect } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from './stores/commandStore';
import { applyViewMode } from './lib/viewModes';
import { audioService } from './services/audioService';

// UI — Original V4 Components
import { TopBar } from './components/ui/TopBar';
import { CommandCenter } from './components/ui/CommandCenter';
import { DataLayersMenu } from './components/ui/DataLayersMenu';
import { InsightWidget } from './components/ui/InsightWidget';
import { LocationsBar } from './components/ui/LocationsBar';
import { CommanderAuth } from './components/ui/CommanderAuth';
import { BottomBar } from './components/ui/BottomBar';
import { ModeToggle } from './components/ui/ModeToggle';

// Overlays
import { FlightLockOverlay } from './components/globe/FlightLockOverlay';
import { CinematicIntro } from './components/ui/CinematicIntro';

// Globe
import { Globe } from './components/globe/Globe';

import './App.css';

export function App() {
  const globeRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const viewMode = useCommandStore((s) => s.viewMode);
  const globeReady = useCommandStore((s) => s.globeReady);
  const cleanUI = useCommandStore((s) => s.optics.cleanUI);
  const setGlobeReady = useCommandStore((s) => s.setGlobeReady);
  const isLocked = useCommandStore((s) => s.isLocked);
  const setIsLocked = useCommandStore((s) => s.setIsLocked);

  // Apply view mode CSS filters (NVG / Thermal / etc)
  useEffect(() => {
    applyViewMode(globeRef.current, viewMode, viewerRef.current);
  }, [viewMode, globeReady]);

  // Global Audio Feedback
  useEffect(() => {
    const handleGlobalClick = () => audioService.playClick();
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  // Clean UI toggle
  useEffect(() => {
    document.body.classList.toggle('clean-ui', cleanUI);
  }, [cleanUI]);

  return (
    <>
      <CinematicIntro onComplete={() => setGlobeReady(true)} />

      {/* ═══════════════ COMMANDER AUTH GATE ═══════════════ */}
      {isLocked && (
        <CommanderAuth onComplete={() => setIsLocked(false)} />
      )}

      {/* ═══════════════ GLOBE CANVAS ═══════════════ */}
      <div className="globe-fullscreen" ref={globeRef}>
        <Globe viewerRef={viewerRef} />
      </div>

      {/* Cinematic Vignette */}
      <div className="vignette-overlay" />

      {/* ═══════════════ FLOATING UI ═══════════════ */}
      <div className={isLocked ? 'ui-locked' : ''}>
        {/* Top/System Bar */}
        <TopBar />

        {/* Intelligence / Briefing */}
        <CommandCenter />

        {/* Global Layer Control */}
        <DataLayersMenu />

        {/* Target Details / Hollywood Camera Settings */}
        <InsightWidget />

        {/* Locations pills + Modes */}
        {globeReady && <LocationsBar />}

        {/* Bottom Ticker bar */}
        <BottomBar />

        {/* Restricted Area Access Button */}
        <ModeToggle />
        
        {/* Flight Tracker Targeting Reticle */}
        <FlightLockOverlay viewerRef={viewerRef} />
      </div>

      {/* ═══════════════ LOADING OVERLAY ═══════════════ */}
      <div className={`argus-loading ${globeReady ? 'hidden' : ''}`}>
        <div className="loading-content">
          <img src="/logo/logo.png" alt="ARGUS" className="loading-logo" />
          <div className="sub">INITIALISING V4 INTELLIGENCE GRID</div>
          <div className="loading-bar-container">
            <div className="loading-bar" />
          </div>
        </div>
      </div>
    </>
  );
}
