// ============================================================
// FlightInfoPanel — Selected flight details overlay
// ============================================================

import type { FlightDetail } from '../../types/flight';
import './FlightInfoPanel.css';

interface Props {
  flight: FlightDetail | null;
  onClose: () => void;
}

function headingToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export function FlightInfoPanel({ flight, onClose }: Props) {
  if (!flight) return null;

  const vrFpm = Math.round(flight.verticalRate * 196.85);
  const statusIcon = flight.verticalStatus === 'climbing' ? '▲'
    : flight.verticalStatus === 'descending' ? '▼' : '—';
  const statusColor = flight.verticalStatus === 'climbing' ? '#00ff88'
    : flight.verticalStatus === 'descending' ? '#ff4444' : '#6d7a86';
  const secondsAgo = Math.round(Date.now() / 1000 - flight.lastSeen);

  return (
    <div className="flight-panel">
      <div className="flight-panel__header">
        <span className="flight-panel__callsign">✈ {flight.callsign}</span>
        <button className="flight-panel__close" onClick={onClose}>×</button>
      </div>

      <div className="flight-panel__divider" />

      <div className="flight-panel__grid">
        <span className="flight-panel__key">TYPE</span>
        <span className="flight-panel__val">{flight.icaoType}</span>

        <span className="flight-panel__key">ORIGIN</span>
        <span className="flight-panel__val">{flight.originCountry}</span>

        <span className="flight-panel__key">ALT</span>
        <span className="flight-panel__val">{flight.altitudeFt.toLocaleString()} ft</span>

        <span className="flight-panel__key">SPEED</span>
        <span className="flight-panel__val">{flight.velocityKnots} kts</span>

        <span className="flight-panel__key">HEADING</span>
        <span className="flight-panel__val">{Math.round(flight.heading)}° {headingToCompass(flight.heading)}</span>

        <span className="flight-panel__key">STATUS</span>
        <span className="flight-panel__val" style={{ color: statusColor }}>
          {statusIcon} {flight.verticalStatus.toUpperCase()} {vrFpm > 0 ? '+' : ''}{vrFpm} ft/min
        </span>

        <span className="flight-panel__key">LAST SEEN</span>
        <span className="flight-panel__val">{secondsAgo}s ago</span>
      </div>

      <div className="flight-panel__divider" />

      <div className="flight-panel__grid">
        <span className="flight-panel__key">ICAO24</span>
        <span className="flight-panel__val flight-panel__val--dim">{flight.icao24}</span>
      </div>
    </div>
  );
}
