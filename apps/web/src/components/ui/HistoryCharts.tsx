// ============================================================
// HistoryCharts — SVG activity bars + altitude profile (P3)
// Renders inside InsightWidget when an entity is selected
// Pure SVG — no external chart library
// ============================================================

import { useMemo } from 'react';
import type { FlightEntity, VesselEntity } from '../../stores/commandStore';

// ── Activity Bar Chart (24 bars representing hourly activity) ──

function ActivityBars({ data, color, label }: {
  data: number[];
  color: string;
  label: string;
}) {
  const max = Math.max(...data, 1);
  const barWidth = 100 / data.length;

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px',
        color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
        marginBottom: '6px',
      }}>{label}</div>
      <svg width="100%" height="48" viewBox="0 0 100 48" preserveAspectRatio="none">
        {data.map((val, i) => {
          const h = (val / max) * 40;
          return (
            <rect
              key={i}
              x={i * barWidth + 0.5}
              y={44 - h}
              width={barWidth - 1}
              height={h}
              fill={color}
              opacity={0.6 + (val / max) * 0.4}
              rx={0.5}
            >
              <title>{`${i}:00 — ${val}`}</title>
            </rect>
          );
        })}
        {/* Baseline */}
        <line x1="0" y1="44" x2="100" y2="44" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      </svg>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: '7px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)',
        marginTop: '2px',
      }}>
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>NOW</span>
      </div>
    </div>
  );
}

// ── Altitude / Speed Profile (line chart) ──

function ProfileLine({ points, color, label, unit }: {
  points: number[];
  color: string;
  label: string;
  unit: string;
}) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;

  const pathPoints = points.map((val, i) => {
    const x = (i / (points.length - 1)) * 100;
    const y = 44 - ((val - min) / range) * 40;
    return `${x},${y}`;
  });
  const linePath = `M${pathPoints.join(' L')}`;
  const areaPath = `${linePath} L100,44 L0,44 Z`;

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: '6px',
      }}>
        <span style={{
          fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px',
          color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
        }}>{label}</span>
        <span style={{
          fontSize: '10px', color, fontFamily: 'var(--font-mono)',
        }}>
          {points[points.length - 1].toFixed(0)} {unit}
        </span>
      </div>
      <svg width="100%" height="48" viewBox="0 0 100 48" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${label})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        {/* Current value dot */}
        <circle
          cx="100" cy={44 - ((points[points.length - 1] - min) / range) * 40}
          r="2.5" fill={color} filter={`drop-shadow(0 0 3px ${color})`}
        />
        <line x1="0" y1="44" x2="100" y2="44" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

// ── Generate simulated historical data for entity ──
// In a real system this would come from stored telemetry

function generateFlightHistory(flight: FlightEntity) {
  const seed = flight.callsign.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (i: number) => Math.abs(Math.sin(seed + i * 0.7)) ;

  // Altitude profile (last 20 samples)
  const altProfile = Array.from({ length: 20 }, (_, i) => {
    const base = flight.altitude * 3.28084;
    const phase = i / 19;
    // Simulate climb → cruise → current
    if (phase < 0.3) return base * 0.3 + base * 0.7 * (phase / 0.3);
    return base * (0.95 + rng(i) * 0.1);
  });

  // Speed profile
  const speedProfile = Array.from({ length: 20 }, (_, i) => {
    const base = flight.velocity * 1.94384;
    return base * (0.9 + rng(i + 50) * 0.2);
  });

  // Hourly activity (how many flights in this corridor per hour)
  const hourlyActivity = Array.from({ length: 24 }, (_, i) => {
    // More traffic during day hours
    const dayFactor = (i >= 6 && i <= 22) ? 1.5 : 0.5;
    return Math.floor(rng(i + 100) * 12 * dayFactor) + 1;
  });

  return { altProfile, speedProfile, hourlyActivity };
}

function generateVesselHistory(vessel: VesselEntity) {
  const seed = vessel.mmsi;
  const rng = (i: number) => Math.abs(Math.sin(seed + i * 0.7));

  const speedProfile = Array.from({ length: 20 }, (_, i) =>
    vessel.speed * (0.8 + rng(i) * 0.4)
  );

  const hourlyActivity = Array.from({ length: 24 }, (_, i) => {
    const tideFactor = Math.sin(i / 24 * Math.PI * 2) * 0.3 + 1;
    return Math.floor(rng(i + 200) * 8 * tideFactor) + 1;
  });

  return { speedProfile, hourlyActivity };
}

// ── Exported Components ──

export function FlightHistoryCharts({ flight }: { flight: FlightEntity }) {
  const history = useMemo(() => generateFlightHistory(flight), [flight.callsign]);

  return (
    <div style={{
      padding: '8px 0',
      animation: 'card-enter 300ms var(--ease-out-expo) both',
    }}>
      <ProfileLine
        points={history.altProfile}
        color="#00C8FF"
        label="ALTITUDE PROFILE"
        unit="ft"
      />
      <ProfileLine
        points={history.speedProfile}
        color="#34D399"
        label="SPEED PROFILE"
        unit="kt"
      />
      <ActivityBars
        data={history.hourlyActivity}
        color="#00C8FF"
        label="CORRIDOR ACTIVITY (24H)"
      />
    </div>
  );
}

export function VesselHistoryCharts({ vessel }: { vessel: VesselEntity }) {
  const history = useMemo(() => generateVesselHistory(vessel), [vessel.mmsi]);

  return (
    <div style={{
      padding: '8px 0',
      animation: 'card-enter 300ms var(--ease-out-expo) both',
    }}>
      <ProfileLine
        points={history.speedProfile}
        color="#00FFCC"
        label="SPEED PROFILE"
        unit="kt"
      />
      <ActivityBars
        data={history.hourlyActivity}
        color="#00FFCC"
        label="MARITIME ACTIVITY (24H)"
      />
    </div>
  );
}
