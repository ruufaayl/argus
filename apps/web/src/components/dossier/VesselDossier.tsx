// ============================================================
// VesselDossier — Full vessel click panel (P2)
// Shows: Identity card, live telemetry, vessel classification,
// military intel section for naval vessels
// Spec: Deep Spec D.1–D.3, Module Spec 3.1
// ============================================================

import { useState } from 'react';
import { useCommandStore, type VesselEntity } from '../../stores/commandStore';
import { audioService } from '../../services/audioService';
import { VesselHistoryCharts } from '../ui/HistoryCharts';
import { PatternAnalysis } from '../ui/PatternAnalysis';

// ── Vessel type classification helpers ──

function classifyVessel(type: number): {
  category: 'NAVAL' | 'CARGO' | 'TANKER' | 'PASSENGER' | 'FISHING' | 'TUG' | 'SAR' | 'RECREATIONAL' | 'UNKNOWN';
  icon: string;
  description: string;
} {
  if (type === 35) return { category: 'NAVAL', icon: '⚓', description: 'Military / Naval Vessel' };
  if (type >= 70 && type <= 79) return { category: 'CARGO', icon: '🚢', description: 'Cargo Vessel' };
  if (type >= 80 && type <= 89) return { category: 'TANKER', icon: '🛢', description: 'Tanker' };
  if (type >= 60 && type <= 69) return { category: 'PASSENGER', icon: '🚢', description: 'Passenger Vessel' };
  if (type === 30) return { category: 'FISHING', icon: '🎣', description: 'Fishing Vessel' };
  if (type === 52) return { category: 'TUG', icon: '🚤', description: 'Tugboat' };
  if (type === 51) return { category: 'SAR', icon: '🚨', description: 'Search & Rescue' };
  if (type === 36 || type === 37) return { category: 'RECREATIONAL', icon: '⛵', description: 'Recreational Craft' };
  return { category: 'UNKNOWN', icon: '🚢', description: 'Unclassified Vessel' };
}

function computeVesselThreatIndex(vessel: VesselEntity): number {
  let score = 0;

  // Military vessel base score
  if (vessel.type === 35) score += 30;

  // High speed anomaly (> 25 knots for non-military)
  if (vessel.speed > 25 && vessel.type !== 35) score += 20;
  else if (vessel.speed > 30) score += 15;

  // No name / no destination
  if (!vessel.name || vessel.name.trim() === '') score += 15;
  if (!vessel.destination || vessel.destination.trim() === '') score += 10;

  // Heading unknown (511 = not available in AIS)
  if (vessel.heading === 511) score += 5;

  // Suspicious type codes (reserved ranges)
  if (vessel.type >= 0 && vessel.type <= 19) score += 10;

  return Math.min(100, score);
}

function headingToCompass(heading: number): string {
  if (heading === 511) return '—';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(heading / 22.5) % 16];
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'NAVAL': return 'var(--text-warn)';
    case 'CARGO': return '#00FFCC';
    case 'TANKER': return '#FF8800';
    case 'PASSENGER': return '#00AAFF';
    case 'SAR': return 'var(--text-threat)';
    default: return 'var(--text-primary)';
  }
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
        <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="44" cy="44" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
          transform="rotate(-90 44 44)"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.65,0,0.35,1), stroke 0.4s' }}
          filter={`drop-shadow(0 0 6px ${color})`}
        />
        <text x="44" y="40" textAnchor="middle" fill={color} fontSize="20" fontWeight="700" fontFamily="var(--font-mono)">{score}</text>
        <text x="44" y="54" textAnchor="middle" fill="var(--text-faint)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="1">{label}</text>
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '1.5px', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
          THREAT INDEX
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Computed from vessel type, speed anomalies, AIS data completeness, and classification.
        </div>
      </div>
    </div>
  );
}

function CompassWidget({ heading }: { heading: number }) {
  const displayHeading = heading === 511 ? 0 : heading;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <text x="24" y="8" textAnchor="middle" fill="var(--text-faint)" fontSize="6" fontFamily="var(--font-mono)">N</text>
      <text x="42" y="26" textAnchor="middle" fill="var(--text-faint)" fontSize="6" fontFamily="var(--font-mono)">E</text>
      <text x="24" y="44" textAnchor="middle" fill="var(--text-faint)" fontSize="6" fontFamily="var(--font-mono)">S</text>
      <text x="6" y="26" textAnchor="middle" fill="var(--text-faint)" fontSize="6" fontFamily="var(--font-mono)">W</text>
      <line
        x1="24" y1="24" x2="24" y2="8"
        stroke="#00FFCC" strokeWidth="2" strokeLinecap="round"
        transform={`rotate(${displayHeading} 24 24)`}
        style={{ filter: 'drop-shadow(0 0 4px #00FFCC)' }}
      />
      <circle cx="24" cy="24" r="2" fill="#00FFCC" />
    </svg>
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

// ── Main Component ──

export function VesselDossier({ vessel }: { vessel: VesselEntity }) {
  const clearSelection = useCommandStore((s) => s.clearSelection);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    telemetry: true,
    position: false,
    naval: false,
    history: false,
    pattern: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    audioService.playClick();
  };

  const classification = classifyVessel(vessel.type);
  const isNaval = vessel.type === 35;
  const threatScore = isNaval ? computeVesselThreatIndex(vessel) : null;
  const categoryColor = getCategoryColor(classification.category);
  const speedKmh = (vessel.speed * 1.852).toFixed(1);
  const headingDisplay = vessel.heading === 511 ? 'N/A' : `${vessel.heading}°`;

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
        }}>VESSEL DOSSIER</span>
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
          {/* Name + type badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '20px', fontWeight: 700,
              color: isNaval ? 'var(--text-warn)' : 'var(--text-primary)',
              fontFamily: 'var(--font-mono)', letterSpacing: '1px',
            }}>
              {vessel.name || `MMSI ${vessel.mmsi}`}
            </span>
          </div>

          {/* Type + classification */}
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {classification.description}
          </div>
          <div style={{
            fontSize: '10px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)',
            letterSpacing: '1px',
          }}>
            MMSI: {vessel.mmsi} · AIS TYPE: {vessel.type}
          </div>

          {/* Status badges */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span className={`glass-badge ${isNaval ? 'warn' : 'live'}`} style={{ color: categoryColor }}>
              {classification.category}
            </span>
            {vessel.speed > 0.5 ? (
              <span className="glass-badge live">UNDERWAY</span>
            ) : (
              <span className="glass-badge" style={{ opacity: 0.6 }}>AT ANCHOR</span>
            )}
            {vessel.destination && (
              <span className="glass-badge" style={{ opacity: 0.7, fontSize: '9px' }}>
                → {vessel.destination}
              </span>
            )}
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
            <TelemetryBox label="SPEED" value={vessel.speed.toFixed(1)} unit="kt" mono
              color={vessel.speed > 25 ? 'var(--text-warn)' : undefined}
            />
            <TelemetryBox label="SPEED" value={speedKmh} unit="km/h" mono />
            <TelemetryBox label="COURSE" value={vessel.course ? `${vessel.course.toFixed(0)}°` : '—'} mono />
            <div className="glass-card" style={{
              padding: '10px 12px', borderRadius: 'var(--r-sm)',
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--glass-fill-default)',
            }}>
              <CompassWidget heading={vessel.heading} />
              <div>
                <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>
                  HEADING
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {headingDisplay} <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>{headingToCompass(vessel.heading)}</span>
                </div>
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
            <TelemetryBox label="LATITUDE" value={vessel.lat.toFixed(5)} unit="°N" mono />
            <TelemetryBox label="LONGITUDE" value={vessel.lng.toFixed(5)} unit="°E" mono />
            {vessel.destination && (
              <div style={{ gridColumn: '1 / -1' }}>
                <TelemetryBox label="DESTINATION" value={vessel.destination} />
              </div>
            )}
          </div>
        )}

        {/* ═══ NAVAL INTEL (only for military vessels) ═══ */}
        {isNaval && (
          <>
            <SectionHeader
              title="NAVAL CLASSIFICATION"
              expanded={expandedSections.naval}
              onToggle={() => toggleSection('naval')}
              color="var(--text-warn)"
            />
            {expandedSections.naval && (
              <div style={{
                marginBottom: '14px', animation: 'card-enter 300ms var(--ease-out-expo) both',
              }}>
                {threatScore !== null && <ThreatGauge score={threatScore} />}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px',
                }}>
                  <TelemetryBox
                    label="CLASSIFICATION"
                    value="NAVAL"
                    color="var(--text-warn)"
                  />
                  <TelemetryBox
                    label="PROFILE"
                    value={
                      vessel.speed > 20
                        ? 'HIGH SPEED TRANSIT'
                        : vessel.speed > 5
                        ? 'PATROL'
                        : 'STATION KEEPING'
                    }
                    color="var(--text-warn)"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ HISTORY CHARTS ═══ */}
        <SectionHeader
          title="ACTIVITY HISTORY"
          expanded={expandedSections.history}
          onToggle={() => toggleSection('history')}
        />
        {expandedSections.history && (
          <VesselHistoryCharts vessel={vessel} />
        )}

        {/* ═══ AI PATTERN ANALYSIS ═══ */}
        <SectionHeader
          title="AI PATTERN ANALYSIS"
          expanded={expandedSections.pattern}
          onToggle={() => toggleSection('pattern')}
          color="var(--text-ai)"
        />
        {expandedSections.pattern && (
          <PatternAnalysis entityType="vessel" entityData={vessel} />
        )}

        {/* ═══ DATA SOURCE FOOTER ═══ */}
        <div style={{
          marginTop: '16px', paddingTop: '12px',
          borderTop: '1px solid var(--glass-border)',
          fontSize: '9px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)',
          letterSpacing: '1px', display: 'flex', justifyContent: 'space-between',
        }}>
          <span>SOURCE: AIS</span>
          <span className="data-live">LIVE</span>
        </div>
      </div>
    </div>
  );
}
