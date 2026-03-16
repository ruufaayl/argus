// ============================================================
// CommandDashboard — The Classified Ops Center Layout
// Replaces standard Left/Right panels when PIN is correct
// ============================================================

import { useEffect, useState } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { EntityGraph } from './EntityGraph';
import { IncidentTimeline } from './IncidentTimeline';
import { AuditLog } from './AuditLog';
import './CommandDashboard.css';

export function CommandDashboard() {
  const isClassifiedMode = useCityStore((s) => s.isClassifiedMode);
  const [missionClock, setMissionClock] = useState(0);

  // Mission clock spins up when mode is active
  useEffect(() => {
    let iv: NodeJS.Timeout;
    if (isClassifiedMode) {
      iv = setInterval(() => setMissionClock((m) => m + 1), 1000);
    } else {
      setMissionClock(0);
    }
    return () => clearInterval(iv);
  }, [isClassifiedMode]);

  const formatClock = (secs: number) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `T+${h}:${m}:${s}`;
  };

  if (!isClassifiedMode) return null;

  return (
    <>
      {/* Absolute overlay elements for Classified mode */}
      <div className="cmd-banner">
        <span>RESTRICTED — NCCSIP — MINISTRY OF INTERIOR</span>
      </div>
      
      <div className="cmd-mission-clock">
        {formatClock(missionClock)}
      </div>

      <div className="cmd-grid-overlay" />

      {/* Op-Center Left Panel (Narrow) */}
      <div className="cmd-panel cmd-panel--left">
        <EntityGraph />
      </div>

      {/* Op-Center Right Panel (Dense Data) */}
      <div className="cmd-panel cmd-panel--right">
        <div className="cmd-panel__section cmd-panel__section--timeline">
          <IncidentTimeline />
        </div>
        <div className="cmd-panel__section cmd-panel__section--log">
          <AuditLog />
        </div>
      </div>
      
      {/* Bottom Comms Strip */}
      <div className="cmd-bottom-strip">
        <div className="cmd-bottom-strip__conn">UPLINK: SECURE</div>
        <div className="cmd-bottom-strip__unit">NCCSIP COMMAND</div>
      </div>
    </>
  );
}
