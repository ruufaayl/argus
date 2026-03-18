// ============================================================
// SatelliteDossier — Satellite click panel (P2)
// Shows: Identity, orbital data, Pakistan overpass status,
// category classification, position
// Spec: Deep Spec E.1–E.3, Module Spec 4.1
// ============================================================

import { useState } from 'react';
import { useCommandStore, type SatelliteEntity } from '../../stores/commandStore';
import { audioService } from '../../services/audioService';

// ── Category classification ──

function classifySatellite(category: string): {
  label: string;
  description: string;
  color: string;
  threatRelevance: 'HIGH' | 'MODERATE' | 'LOW' | 'NONE';
} {
  switch (category) {
    case 'military':
      return { label: 'MILITARY', description: 'Defense / Reconnaissance Satellite', color: '#FF8800', threatRelevance: 'HIGH' };
    case 'starlink':
      return { label: 'STARLINK', description: 'SpaceX Starlink Constellation', color: '#00C8FF', threatRelevance: 'LOW' };
    case 'gps':
      return { label: 'GNSS', description: 'Global Navigation Satellite System', color: '#FFB800', threatRelevance: 'MODERATE' };
    case 'iss':
      return { label: 'SPACE STATION', description: 'International Space Station', color: '#F43F5E', threatRelevance: 'NONE' };
    case 'weather':
      return { label: 'WEATHER', description: 'Meteorological Satellite', color: '#00FF88', threatRelevance: 'LOW' };
    default:
      return { label: 'UNKNOWN', description: 'Unclassified Orbital Object', color: '#AAAAAA', threatRelevance: 'LOW' };
  }
}

function getOrbitType(altKm: number): { name: string; abbrev: string } {
  if (altKm < 2000) return { name: 'Low Earth Orbit', abbrev: 'LEO' };
  if (altKm < 20200) return { name: 'Medium Earth Orbit', abbrev: 'MEO' };
  if (altKm >= 35700 && altKm <= 35900) return { name: 'Geostationary Orbit', abbrev: 'GEO' };
  if (altKm > 35900) return { name: 'High Earth Orbit', abbrev: 'HEO' };
  return { name: 'Medium Earth Orbit', abbrev: 'MEO' };
}

function computeOrbitalPeriod(altKm: number): number {
  const R = 6371; // Earth radius km
  const mu = 398600.4418; // Earth gravitational parameter km^3/s^2
  const a = R + altKm;
  return 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / mu) / 60; // minutes
}

// ── Subcomponents ──

function TelemetryBox({ label, value, unit, color, mono }: {
  label: string; value: string; unit?: string; color?: string; mono?: boolean;
}) {
  return (
    <div className="glass-card" style={{
      padding: '10px 12px',
      borderRadius: 'var(--r-sm)',
      background: 'var(--glass-fill-default)',
    }}>
      <div style={{
        fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px',
        color: 'var(--text-secondary)', textTransform: 'uppercase',
        marginBottom: '4px', fontFamily: 'var(--font-mono)',
      }}>{label}</div>
      <div style={{
        fontSize: mono ? '16px' : '14px', fontWeight: 600,
        color: color || 'var(--text-primary)',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font)',
        display: 'flex', alignItems: 'baseline', gap: '3px',
      }}>
        <span>{value}</span>
        {unit && <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>{unit}</span>}
      </div>
    </div>
  );
}

function SectionHeader({ title, expanded, onToggle, color }: {
  title: string; expanded: boolean; onToggle: () => void; color?: string;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '8px 0', marginBottom: expanded ? '8px' : '4px',
        background: 'none', border: 'none', cursor: 'pointer',
        borderBottom: '1px solid var(--glass-border)',
      }}
    >
      <span style={{
        fontSize: '10px', fontWeight: 600, letterSpacing: '2px',
        color: color || 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
      }}>
        {title}
      </span>
      <span style={{
        fontSize: '10px', color: 'var(--text-faint)',
        transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
        transition: 'transform 200ms var(--ease-spring)',
        display: 'inline-block',
      }}>
        ▼
      </span>
    </button>
  );
}

function OrbitVisual({ altKm, category }: { altKm: number; category: string }) {
  const cls = classifySatellite(category);
  const maxAlt = 36000;
  const normalizedAlt = Math.min(altKm / maxAlt, 1);
  const orbitRadius = 18 + normalizedAlt * 22; // 18-40px radius

  return (
    <svg width="88" height="88" viewBox="0 0 88 88" style={{ flexShrink: 0 }}>
      {/* Earth */}
      <circle cx="44" cy="44" r="16" fill="rgba(30,80,120,0.4)" stroke="rgba(100,180,255,0.2)" strokeWidth="1" />
      <text x="44" y="48" textAnchor="middle" fill="var(--text-faint)" fontSize="7" fontFamily="var(--font-mono)">EARTH</text>
      {/* Orbit path */}
      <circle
        cx="44" cy="44" r={orbitRadius} fill="none"
        stroke={cls.color} strokeWidth="1" strokeDasharray="3,3"
        opacity={0.4}
      />
      {/* Satellite dot */}
      <circle
        cx={44 + orbitRadius} cy="44" r="4"
        fill={cls.color}
        filter={`drop-shadow(0 0 4px ${cls.color})`}
      >
        <animateTransform
          attributeName="transform" type="rotate"
          from="0 44 44" to="360 44 44"
          dur={`${Math.max(4, normalizedAlt * 20)}s`}
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

// ── Main Component ──

export function SatelliteDossier({ satellite }: { satellite: SatelliteEntity }) {
  const clearSelection = useCommandStore((s) => s.clearSelection);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    orbital: true,
    position: false,
    coverage: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    audioService.playClick();
  };

  const cls = classifySatellite(satellite.category);
  const orbit = getOrbitType(satellite.altKm);
  const period = computeOrbitalPeriod(satellite.altKm);
  const speedKmh = (satellite.velocityKms * 3600).toFixed(0);

  return (
    <div
      className="glass-panel"
      style={{
        animation: 'panel-open-right 350ms var(--ease-out-expo) both',
        display: 'flex', flexDirection: 'column', height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px', borderBottom: '1px solid var(--glass-border)',
      }}>
        <span style={{
          fontSize: '11px', fontWeight: 600, letterSpacing: '2px',
          color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
        }}>SATELLITE DOSSIER</span>
        <button
          className="cc-toggle"
          onClick={() => { clearSelection(); audioService.playClick(); }}
          style={{ width: '28px', height: '28px', borderRadius: '8px' }}
        >
          ✕
        </button>
      </div>

      {/* ── Scrollable Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }} className="cc-body">

        {/* ═══ IDENTITY CARD ═══ */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '20px', fontWeight: 700,
              color: cls.color,
              fontFamily: 'var(--font-mono)', letterSpacing: '1px',
            }}>
              {satellite.name}
            </span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {cls.description}
          </div>
          <div style={{
            fontSize: '10px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)',
            letterSpacing: '1px',
          }}>
            NORAD: {satellite.noradId} · {orbit.abbrev}
          </div>

          {/* Status badges */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span className="glass-badge" style={{ color: cls.color, borderColor: `${cls.color}40` }}>
              {cls.label}
            </span>
            {satellite.isOverPakistan && (
              <span className="glass-badge threat" style={{
                animation: 'alert-pulse-critical 2s ease-in-out infinite',
              }}>
                OVER PAKISTAN
              </span>
            )}
            {cls.threatRelevance !== 'NONE' && (
              <span className={`glass-badge ${cls.threatRelevance === 'HIGH' ? 'warn' : 'live'}`}>
                INTEL: {cls.threatRelevance}
              </span>
            )}
          </div>
        </div>

        {/* ═══ ORBITAL DATA ═══ */}
        <SectionHeader
          title="ORBITAL PARAMETERS"
          expanded={expandedSections.orbital}
          onToggle={() => toggleSection('orbital')}
        />
        {expandedSections.orbital && (
          <div style={{
            marginBottom: '14px', animation: 'card-enter 300ms var(--ease-out-expo) both',
          }}>
            {/* Orbit visual + data */}
            <div className="glass-card" style={{
              padding: '16px', display: 'flex', alignItems: 'center', gap: '16px',
              borderRadius: 'var(--r-md)', marginBottom: '8px',
            }}>
              <OrbitVisual altKm={satellite.altKm} category={satellite.category} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '1.5px', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                  {orbit.name.toUpperCase()}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Altitude {satellite.altKm.toFixed(0)} km · Period {period.toFixed(1)} min
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
            }}>
              <TelemetryBox label="ALTITUDE" value={satellite.altKm.toFixed(0)} unit="km" mono />
              <TelemetryBox label="VELOCITY" value={satellite.velocityKms.toFixed(2)} unit="km/s" mono />
              <TelemetryBox label="GROUND SPEED" value={Number(speedKmh).toLocaleString()} unit="km/h" mono />
              <TelemetryBox label="PERIOD" value={period.toFixed(1)} unit="min" mono />
            </div>
          </div>
        )}

        {/* ═══ PAKISTAN COVERAGE ═══ */}
        <SectionHeader
          title="PAKISTAN OVERPASS"
          expanded={expandedSections.coverage}
          onToggle={() => toggleSection('coverage')}
          color={satellite.isOverPakistan ? 'var(--text-threat)' : undefined}
        />
        {expandedSections.coverage && (
          <div style={{
            marginBottom: '14px', animation: 'card-enter 300ms var(--ease-out-expo) both',
          }}>
            <div className="glass-card" style={{
              padding: '14px', borderRadius: 'var(--r-md)',
              background: satellite.isOverPakistan ? 'rgba(244,63,94,0.08)' : 'var(--glass-fill-default)',
              border: satellite.isOverPakistan ? '1px solid rgba(244,63,94,0.25)' : undefined,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px',
              }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: satellite.isOverPakistan ? 'var(--text-threat)' : 'var(--text-safe)',
                  boxShadow: satellite.isOverPakistan ? '0 0 8px var(--text-threat)' : '0 0 6px var(--text-safe)',
                  animation: satellite.isOverPakistan ? 'pulse 1.5s ease-in-out infinite' : 'none',
                }} />
                <span style={{
                  fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: satellite.isOverPakistan ? 'var(--text-threat)' : 'var(--text-safe)',
                  letterSpacing: '1px',
                }}>
                  {satellite.isOverPakistan ? 'CURRENTLY OVER PAKISTAN' : 'NOT OVER PAKISTAN'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {satellite.isOverPakistan
                  ? `Satellite is within Pakistani airspace at ${satellite.altKm.toFixed(0)} km altitude. Potential coverage of national territory.`
                  : `Satellite is currently outside Pakistani airspace. Next overpass depends on orbital parameters.`
                }
              </div>
            </div>
          </div>
        )}

        {/* ═══ POSITION ═══ */}
        <SectionHeader
          title="POSITION"
          expanded={expandedSections.position}
          onToggle={() => toggleSection('position')}
        />
        {expandedSections.position && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
            marginBottom: '14px', animation: 'card-enter 300ms var(--ease-out-expo) both',
          }}>
            <TelemetryBox label="LATITUDE" value={satellite.lat.toFixed(5)} unit="°" mono />
            <TelemetryBox label="LONGITUDE" value={satellite.lon.toFixed(5)} unit="°" mono />
          </div>
        )}

        {/* ═══ DATA SOURCE FOOTER ═══ */}
        <div style={{
          marginTop: '16px', paddingTop: '12px',
          borderTop: '1px solid var(--glass-border)',
          fontSize: '9px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)',
          letterSpacing: '1px', display: 'flex', justifyContent: 'space-between',
        }}>
          <span>SOURCE: CELESTRAK TLE</span>
          <span className="data-live">LIVE SGP4</span>
        </div>
      </div>
    </div>
  );
}
