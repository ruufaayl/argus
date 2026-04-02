// ============================================================
// InsightWidget — Target intelligence panel (V4.0)
// Real Groq threat analysis with threat index gauge,
// foot traffic, strategic importance, years stable
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useCommandStore } from '../../stores/commandStore';
import { useVisionStore, type VisionState } from '../../stores/visionStore';
import { audioService } from '../../services/audioService';
import { AircraftDossier } from '../dossier/AircraftDossier';
import { VesselDossier } from '../dossier/VesselDossier';
import { SatelliteDossier } from '../dossier/SatelliteDossier';

interface BriefingData {
  analysis: string;
  threatIndex: number;
  strategicImportance: string;
  footTrafficLevel: string;
  lastIncident: string;
  builtDate: string;
  intel: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function fetchBriefing(name: string, city: string, category: string): Promise<BriefingData> {
  const res = await fetch(`${API_BASE}/api/intel/briefing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, city, category }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Briefing API ${res.status}`);
  return await res.json();
}

// Threat index gauge component
function ThreatGauge({ value }: { value: number }) {
  // Guard against null/undefined/NaN
  const safeValue = (typeof value === 'number' && !Number.isNaN(value)) ? value : 0;
  const pct = Math.min(100, Math.max(0, (safeValue / 10) * 100));
  const color = safeValue >= 8 ? '#F43F5E' : safeValue >= 6 ? '#FFB800' : safeValue >= 4 ? '#00C8FF' : '#34D399';
  const label = safeValue >= 8 ? 'CRITICAL' : safeValue >= 6 ? 'HIGH' : safeValue >= 4 ? 'MODERATE' : 'LOW';

  return (
    <div style={{
      padding: '12px', borderRadius: '10px',
      background: `${color}0a`,
      border: `1px solid ${color}30`,
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px' }}>THREAT INDEX</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '22px', fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>
            {safeValue.toFixed(1)}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>/10</span>
        </div>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}80, ${color})`,
          boxShadow: `0 0 8px ${color}60`, transition: 'width 0.8s cubic-bezier(0.2,0.8,0.2,1)',
          borderRadius: '4px',
        }} />
      </div>
      <span style={{
        fontSize: '9px', fontWeight: 700, letterSpacing: '2px', color,
        animation: safeValue >= 8 ? 'pulse 1.5s ease-in-out infinite' : 'none',
      }}>{label}</span>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="telem-item">
      <div className="label">{label}</div>
      <div className="value" style={{ color: color || 'var(--text-bright)', fontSize: '12px' }}>{value}</div>
    </div>
  );
}

export function InsightWidget() {
  const entity = useCommandStore((s) => s.selectedEntity);
  const clearSelection = useCommandStore((s) => s.clearSelection);
  const optics = useCommandStore((s) => s.optics);
  const setOptics = useCommandStore((s) => s.setOptics);

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const lastFetchedRef = useRef('');
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when entity changes — but do NOT auto-fetch briefing
  useEffect(() => {
    if (!entity || entity.type !== 'landmark') {
      setDisplayedText('');
      setIsTyping(false);
      setBriefing(null);
      setBriefingLoading(false);
      lastFetchedRef.current = '';
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      return;
    }
    // New landmark selected — reset briefing state
    if (lastFetchedRef.current !== entity.data.name) {
      setDisplayedText('');
      setIsTyping(false);
      setBriefing(null);
      setBriefingLoading(false);
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    }
  }, [entity]);

  // Manual briefing generation — triggered by button
  const handleGenerateBriefing = () => {
    if (!entity || entity.type !== 'landmark') return;
    const name = entity.data.name;
    lastFetchedRef.current = name;
    setBriefingLoading(true);
    setDisplayedText('');
    setBriefing(null);
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

    let cancelled = false;
    fetchBriefing(name, entity.data.city, entity.data.category)
      .then((data) => {
        if (cancelled) return;
        setBriefing(data);
        setBriefingLoading(false);
        audioService.playDataUplink();
        if (data.threatIndex >= 7) audioService.playCriticalAlert();

        setIsTyping(true);
        let i = 0;
        const text = data.analysis || '';
        typingIntervalRef.current = setInterval(() => {
          if (cancelled) { clearInterval(typingIntervalRef.current!); return; }
          if (i < text.length) {
            setDisplayedText(text.slice(0, i + 1));
            i++;
          } else {
            setIsTyping(false);
            clearInterval(typingIntervalRef.current!);
          }
        }, 10);
      })
      .catch(() => {
        if (!cancelled) setBriefingLoading(false);
      });

    // Cleanup on unmount
    return () => { cancelled = true; };
  };

  const importanceColor = (imp: string) => {
    if (imp === 'CRITICAL') return 'var(--red)';
    if (imp === 'HIGH') return 'var(--amber)';
    if (imp === 'MODERATE') return 'var(--cyan)';
    return 'var(--green)';
  };

  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div
        className="insight-widget liquid-panel"
        style={{ cursor: 'pointer', width: '48px', minHeight: '48px', maxHeight: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
        onClick={() => { setCollapsed(false); audioService.playClick(); }}
      >
        <span style={{ fontSize: '10px', letterSpacing: '1px', color: 'var(--text-dim)', writingMode: 'vertical-rl' }}>INTEL</span>
      </div>
    );
  }

  return (
    <div className="insight-widget liquid-panel">
      <div className="insight-header">
        <span className="insight-title" style={{ fontFamily: 'var(--font-mono)' }}>INTELLIGENCE</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="cc-toggle" onClick={() => { setCollapsed(true); audioService.playClick(); }} title="Collapse">▼</button>
          {entity && (
            <button className="cc-toggle" onClick={() => { clearSelection(); audioService.playClick(); }}>✕</button>
          )}
        </div>
      </div>

      <div className="insight-body">
        {entity?.type === 'landmark' ? (
          <>
            <div className="insight-target-name">{entity.data.name}</div>
            <div className="insight-target-sub">
              {entity.data.city} · {entity.data.category.toUpperCase()} · {entity.data.tier}
            </div>

            {/* Threat Gauge */}
            {briefing && <ThreatGauge value={briefing.threatIndex} />}

            {/* Loading state for briefing */}
            {briefingLoading && (
              <div style={{
                textAlign: 'center', padding: '16px',
                color: 'var(--cyan)', fontSize: '10px', letterSpacing: '1.5px',
                animation: 'pulse 1s ease-in-out infinite',
              }}>
                ⬡ ANALYZING THREAT POSTURE...
              </div>
            )}

            {/* Metric grid */}
            {briefing && (
              <div className="telem-grid" style={{ marginBottom: '12px' }}>
                <MetricCard 
                  label="STRATEGIC IMP." 
                  value={briefing.strategicImportance} 
                  color={importanceColor(briefing.strategicImportance)} 
                />
                <MetricCard 
                  label="FOOT TRAFFIC" 
                  value={briefing.footTrafficLevel} 
                />
                <MetricCard
                  label="ESTABLISHED"
                  value={briefing.builtDate || 'Unknown'}
                />
                <MetricCard 
                  label="LAST INCIDENT" 
                  value={briefing.lastIncident} 
                  color={briefing.lastIncident === 'No recorded incidents' ? 'var(--green)' : 'var(--amber)'} 
                />
              </div>
            )}

            {/* Intel one-liner */}
            {briefing?.intel && (
              <div style={{
                fontSize: '11px', color: 'var(--text-muted)', padding: '8px 10px',
                background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                border: '1px solid var(--glass-border)', marginBottom: '12px',
                fontStyle: 'italic',
              }}>
                {briefing.intel}
              </div>
            )}

            {/* Coordinates */}
            <div className="telem-grid" style={{ marginBottom: '12px' }}>
              <MetricCard label="LATITUDE" value={`${entity.data.lat.toFixed(5)}°`} />
              <MetricCard label="LONGITUDE" value={`${entity.data.lng.toFixed(5)}°`} />
            </div>

            {/* Generate Briefing Button — only shown when no briefing loaded */}
            {!briefing && !briefingLoading && (
              <button
                onClick={handleGenerateBriefing}
                style={{
                  width: '100%', padding: '10px 16px', marginBottom: '12px',
                  background: 'rgba(0, 200, 255, 0.06)',
                  border: '1px solid rgba(0, 200, 255, 0.25)',
                  borderRadius: '8px', color: 'var(--cyan)',
                  fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px',
                  cursor: 'pointer', fontFamily: 'var(--font-mono)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.background = 'rgba(0, 200, 255, 0.12)';
                  (e.target as HTMLElement).style.borderColor = 'rgba(0, 200, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = 'rgba(0, 200, 255, 0.06)';
                  (e.target as HTMLElement).style.borderColor = 'rgba(0, 200, 255, 0.25)';
                }}
              >
                ⬡ GENERATE BRIEFING
              </button>
            )}

            {/* AI Analysis Stream */}
            {(displayedText || isTyping) && (
              <div className="ai-stream">
                <div className="ai-stream-header">
                  <span className="dot" />
                  <span>ARGUS INTELLIGENCE BRIEFING</span>
                </div>
                <div className="ai-stream-text" style={{ whiteSpace: 'pre-wrap' }}>
                  {displayedText}
                  {isTyping && <span className="ai-cursor" />}
                </div>
              </div>
            )}
          </>
        ) : entity?.type === 'flight' ? (
          <AircraftDossier flight={entity.data} />
        ) : entity?.type === 'vessel' ? (
          <VesselDossier vessel={entity.data} />
        ) : entity?.type === 'satellite' ? (
          <SatelliteDossier satellite={entity.data} />
        ) : (
          <div className="empty-insight">
            <div className="icon" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>◎</div>
            <div className="text" style={{ fontSize: '12px', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>
              SELECT A TARGET ON THE MAP<br />
              <span style={{ fontSize: '10px', opacity: 0.6 }}>CLICK ANY LANDMARK OR FLIGHT</span>
            </div>
          </div>
        )}

        {/* Optics Controls — always visible */}
        <div className="optics-controls">
          <div className="optics-control-title">Landmark Tiers</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {[1, 2, 3].map((t) => (
              <button
                key={t}
                className={`optics-btn ${optics.tiers.includes(t) ? 'active' : ''}`}
                style={{ flex: 1, margin: 0, padding: '6px' }}
                onClick={() => {
                  audioService.playClick();
                  setOptics({
                    tiers: optics.tiers.includes(t)
                      ? optics.tiers.filter((x) => x !== t)
                      : [...optics.tiers, t].sort()
                  });
                }}
              >
                T{t}
              </button>
            ))}
          </div>

          <VisionGearPanel />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// VISION GEAR PANEL — Tactical slider names, wired to CSS
// ════════════════════════════════════════════════════════════

function VisionGearPanel() {
  const vision = useVisionStore();
  const setSetting = useVisionStore((s) => s.setSetting);
  const resetAll = useVisionStore((s) => s.resetAll);

  const sliders = [
    { key: 'lightBleed',     label: 'Light Bleed' },
    { key: 'opticClarity',   label: 'Optic Clarity' },
    { key: 'signalContrast', label: 'Signal Contrast' },
    { key: 'exposure',       label: 'Exposure' },
    { key: 'spectrum',       label: 'Spectrum' },
    { key: 'sensorGamma',    label: 'Sensor Gamma' },
    { key: 'lensShadow',     label: 'Lens Shadow' },
    { key: 'staticNoise',    label: 'Static Noise' },
    { key: 'lensDrift',      label: 'Lens Drift' },
    { key: 'opticWarp',      label: 'Optic Warp' },
  ];

  return (
    <>
      <div className="optics-control-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Vision Gear</span>
        <button
          className="optics-btn"
          style={{ fontSize: '9px', padding: '3px 8px', margin: 0, letterSpacing: '0.5px' }}
          onClick={resetAll}
        >
          ↺ RESET
        </button>
      </div>
      {sliders.map((slider) => (
        <div className="optics-item" key={slider.key}>
          <span className="name">{slider.label}</span>
          <input
            type="range" min={0} max={100}
            value={vision[slider.key as keyof typeof vision] as number}
            className="optics-slider"
            onChange={(e) => setSetting(slider.key as keyof VisionState, +e.target.value)}
          />
          <span className="val">{vision[slider.key as keyof typeof vision] as number}</span>
        </div>
      ))}
    </>
  );
}
