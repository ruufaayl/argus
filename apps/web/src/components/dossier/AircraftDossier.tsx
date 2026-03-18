// ============================================================
// AircraftDossier — Full aircraft click panel (P2)
// Shows: Identity card, live telemetry, flight details,
// military classification, threat assessment
// Spec: Deep Spec C.1–C.4, Module Spec 2.1
// ============================================================

import { useState } from 'react';
import { useCommandStore, type FlightEntity } from '../../stores/commandStore';
import { audioService } from '../../services/audioService';

// ── Aircraft type classification from ICAO hex ranges ──
function classifyAircraft(icao24: string, callsign: string): {
  type: string;
  icon: string;
  category: 'FIGHTER' | 'TRANSPORT' | 'ISR' | 'TANKER' | 'HELICOPTER' | 'COMMERCIAL' | 'CARGO' | 'PRIVATE' | 'UNKNOWN';
} {
  const cs = (callsign || '').toUpperCase().trim();

  if (cs.startsWith('PAF') || cs.startsWith('PAKA'))
    return { type: 'Pakistan Air Force', icon: '✈', category: 'FIGHTER' };
  if (cs.startsWith('ARMY') || cs.startsWith('PAK'))
    return { type: 'Pakistan Army Aviation', icon: '🚁', category: 'HELICOPTER' };
  if (cs.startsWith('PK'))
    return { type: 'PIA — Pakistan International Airlines', icon: '✈', category: 'COMMERCIAL' };
  if (cs.startsWith('SV'))
    return { type: 'Saudia', icon: '✈', category: 'COMMERCIAL' };
  if (cs.startsWith('EK'))
    return { type: 'Emirates', icon: '✈', category: 'COMMERCIAL' };
  if (cs.startsWith('QR'))
    return { type: 'Qatar Airways', icon: '✈', category: 'COMMERCIAL' };
  if (cs.startsWith('TK'))
    return { type: 'Turkish Airlines', icon: '✈', category: 'COMMERCIAL' };
  if (cs.startsWith('FDX') || cs.startsWith('GTI'))
    return { type: 'Cargo Operator', icon: '📦', category: 'CARGO' };

  return { type: 'Unknown Operator', icon: '✈', category: 'UNKNOWN' };
}

// ── Squawk code interpretation ──
function interpretSquawk(squawk: string): { label: string; color: string; alert: boolean } | null {
  if (!squawk) return null;
  switch (squawk) {
    case '7500': return { label: 'HIJACK', color: 'var(--red)', alert: true };
    case '7600': return { label: 'RADIO FAILURE', color: 'var(--amber)', alert: true };
    case '7700': return { label: 'EMERGENCY', color: 'var(--red)', alert: true };
    default: return null;
  }
}

// ── Compute threat score for military aircraft ──
function computeThreatIndex(flight: FlightEntity): number {
  let score = 0;

  // Military aircraft base score
  if (flight.isMilitary) score += 25;

  // Low + slow = surveillance profile
  const altFt = flight.altitude * 3.28084;
  const speedKt = flight.velocity * 1.94384;
  if (altFt < 10000 && speedKt < 250) score += 20;
  else if (altFt < 25000) score += 10;

  // Squawk anomalies
  if (['7500', '7600', '7700'].includes(flight.squawk)) score += 30;

  // Vertical rate anomaly (rapid descent)
  if (Math.abs(flight.verticalRate) > 15) score += 10;

  // Unknown callsign
  if (!flight.callsign || flight.callsign.trim() === '') score += 15;

  return Math.min(100, score);
}

// ── Heading to compass direction ──
function headingToCompass(heading: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(heading / 22.5) % 16];
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

function ThreatGauge({ score }: { score: number }) {
  const color = score >= 60 ? 'var(--text-threat)' : score >= 30 ? 'var(--text-warn)' : 'var(--text-safe)';
  const label = score >= 60 ? 'HIGH' : score >= 30 ? 'ELEVATED' : 'LOW';
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card" style={{
      padding: '16px', display: 'flex', alignItems: 'center', gap: '16px',
      borderRadius: 'var(--r-md)',
    }}>
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ flexShrink: 0 }}>
        {/* Background arc */}
        <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        {/* Value arc */}
        <circle
          cx="44" cy="44" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
          transform="rotate(-90 44 44)"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.65,0,0.35,1), stroke 0.4s' }}
          filter={`drop-shadow(0 0 6px ${color})`}
        />
        {/* Center text */}
        <text x="44" y="40" textAnchor="middle" fill={color} fontSize="20" fontWeight="700" fontFamily="var(--font-mono)">{score}</text>
        <text x="44" y="54" textAnchor="middle" fill="var(--text-faint)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="1">{label}</text>
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '1.5px', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
          THREAT INDEX
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Computed from altitude profile, speed, squawk anomalies, and classification.
        </div>
      </div>
    </div>
  );
}

function CompassWidget({ heading }: { heading: number }) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {/* Cardinal marks */}
      <text x="24" y="8" textAnchor="middle" fill="var(--text-faint)" fontSize="6" fontFamily="var(--font-mono)">N</text>
      <text x="42" y="26" textAnchor="middle" fill="var(--text-faint)" fontSize="6" fontFamily="var(--font-mono)">E</text>
      <text x="24" y="44" textAnchor="middle" fill="var(--text-faint)" fontSize="6" fontFamily="var(--font-mono)">S</text>
      <text x="6" y="26" textAnchor="middle" fill="var(--text-faint)" fontSize="6" fontFamily="var(--font-mono)">W</text>
      {/* Heading needle */}
      <line
        x1="24" y1="24" x2="24" y2="8"
        stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round"
        transform={`rotate(${heading} 24 24)`}
        style={{ filter: 'drop-shadow(0 0 4px var(--cyan))' }}
      />
      <circle cx="24" cy="24" r="2" fill="var(--cyan)" />
    </svg>
  );
}

// ── Main Component ──

export function AircraftDossier({ flight }: { flight: FlightEntity }) {
  const clearSelection = useCommandStore((s) => s.clearSelection);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identity: true,
    telemetry: true,
    flight: false,
    military: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    audioService.playClick();
  };

  const classification = classifyAircraft(flight.icao24, flight.callsign);
  const squawkAlert = interpretSquawk(flight.squawk);
  const threatScore = flight.isMilitary ? computeThreatIndex(flight) : null;
  const altFt = (flight.altitude * 3.28084).toFixed(0);
  const altM = flight.altitude.toFixed(0);
  const speedKt = (flight.velocity * 1.94384).toFixed(0);
  const speedKmh = (flight.velocity * 3.6).toFixed(0);
  const vRateFpm = (flight.verticalRate * 196.85).toFixed(0);
  const heading = flight.heading?.toFixed(0) || '0';

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
        }}>AIRCRAFT DOSSIER</span>
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
          {/* Callsign + type badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '22px', fontWeight: 700,
              color: flight.isMilitary ? 'var(--text-warn)' : 'var(--text-primary)',
              fontFamily: 'var(--font-mono)', letterSpacing: '2px',
            }}>
              {flight.callsign || flight.icao24}
            </span>
            <span className={`glass-badge ${flight.isMilitary ? 'warn' : 'live'}`}>
              {flight.isMilitary ? 'MILITARY' : 'CIVIL'}
            </span>
          </div>

          {/* Operator + ICAO */}
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {classification.type}
          </div>
          <div style={{
            fontSize: '10px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)',
            letterSpacing: '1px',
          }}>
            ICAO24: {flight.icao24.toUpperCase()} · {classification.category}
          </div>

          {/* Status row */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span className={`glass-badge ${flight.onGround ? 'landed' : 'airborne'}`}>
              {flight.onGround ? 'LANDED' : 'AIRBORNE'}
            </span>
            {squawkAlert && (
              <span className="glass-badge threat" style={{
                animation: 'alert-pulse-critical 1.5s ease-in-out infinite',
              }}>
                {squawkAlert.label}
              </span>
            )}
            <span className="glass-badge live" style={{ opacity: 0.7 }}>
              {flight.source?.toUpperCase() || 'ADS-B'}
            </span>
          </div>
        </div>

        {/* ═══ LIVE TELEMETRY ═══ */}
        <SectionHeader
          title="KINEMATICS"
          expanded={expandedSections.telemetry}
          onToggle={() => toggleSection('telemetry')}
        />
        {expandedSections.telemetry && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
            marginBottom: '14px', animation: 'card-enter 300ms var(--ease-out-expo) both',
          }}>
            <TelemetryBox label="BARO ALT" value={altFt} unit="ft" mono />
            <TelemetryBox label="GEO ALT" value={altM} unit="m" mono />
            <TelemetryBox label="GROUNDSPEED" value={speedKt} unit="kt" mono />
            <TelemetryBox label="TRUE AIRSPEED" value={speedKmh} unit="km/h" mono />
            <TelemetryBox
              label="VERT RATE"
              value={`${Number(vRateFpm) > 0 ? '↑' : Number(vRateFpm) < 0 ? '↓' : '→'} ${Math.abs(Number(vRateFpm))}`}
              unit="fpm"
              color={Number(vRateFpm) > 500 ? 'var(--text-safe)' : Number(vRateFpm) < -500 ? 'var(--text-threat)' : 'var(--text-primary)'}
              mono
            />
            <div className="glass-card" style={{
              padding: '10px 12px', borderRadius: 'var(--r-sm)',
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--glass-fill-default)',
            }}>
              <CompassWidget heading={Number(heading)} />
              <div>
                <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>
                  HEADING
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {heading}° <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>{headingToCompass(Number(heading))}</span>
                </div>
              </div>
            </div>
            <TelemetryBox label="SQUAWK" value={flight.squawk || '——'} color={squawkAlert ? squawkAlert.color : undefined} mono />
            <TelemetryBox
              label="ON GROUND"
              value={flight.onGround ? 'YES' : 'NO'}
              color={flight.onGround ? 'var(--text-faint)' : 'var(--text-live)'}
            />
          </div>
        )}

        {/* ═══ POSITION ═══ */}
        <SectionHeader
          title="POSITION"
          expanded={expandedSections.flight}
          onToggle={() => toggleSection('flight')}
        />
        {expandedSections.flight && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
            marginBottom: '14px', animation: 'card-enter 300ms var(--ease-out-expo) both',
          }}>
            <TelemetryBox label="LATITUDE" value={flight.lat.toFixed(5)} unit="°N" mono />
            <TelemetryBox label="LONGITUDE" value={flight.lon.toFixed(5)} unit="°E" mono />
          </div>
        )}

        {/* ═══ MILITARY INTEL (only for military aircraft) ═══ */}
        {flight.isMilitary && (
          <>
            <SectionHeader
              title="MILITARY CLASSIFICATION"
              expanded={expandedSections.military}
              onToggle={() => toggleSection('military')}
              color="var(--text-warn)"
            />
            {expandedSections.military && (
              <div style={{
                marginBottom: '14px', animation: 'card-enter 300ms var(--ease-out-expo) both',
              }}>
                {threatScore !== null && <ThreatGauge score={threatScore} />}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px',
                }}>
                  <TelemetryBox
                    label="TYPE CLASS"
                    value={classification.category}
                    color="var(--text-warn)"
                  />
                  <TelemetryBox
                    label="PROFILE"
                    value={
                      Number(altFt) < 10000 && Number(speedKt) < 250
                        ? 'SURVEILLANCE'
                        : Number(altFt) > 30000
                        ? 'HIGH ALT TRANSIT'
                        : 'PATROL'
                    }
                    color="var(--text-warn)"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ DATA SOURCE FOOTER ═══ */}
        <div style={{
          marginTop: '16px', paddingTop: '12px',
          borderTop: '1px solid var(--glass-border)',
          fontSize: '9px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)',
          letterSpacing: '1px', display: 'flex', justifyContent: 'space-between',
        }}>
          <span>SOURCE: {flight.source?.toUpperCase() || 'OPENSKY'}</span>
          <span className="data-live">LIVE</span>
        </div>
      </div>
    </div>
  );
}

// ── Section Header (collapsible) ──
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
