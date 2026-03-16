// ============================================================
// InsightWidget — Target intelligence panel (V4.0)
// Real Groq threat analysis with threat index gauge,
// foot traffic, strategic importance, years stable
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useCommandStore, DEFAULT_OPTICS } from '../../stores/commandStore';
import { audioService } from '../../services/audioService';

interface BriefingData {
  analysis: string;
  threatIndex: number;
  strategicImportance: string;
  footTrafficLevel: string;
  lastIncident: string;
  yearsStable: number;
  intel: string;
}

async function fetchBriefing(name: string, city: string, category: string): Promise<BriefingData> {
  const res = await fetch('/api/intel/briefing', {
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
            {value.toFixed(1)}
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
        animation: value >= 8 ? 'pulse 1.5s ease-in-out infinite' : 'none',
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

  useEffect(() => {
    if (!entity || entity.type !== 'landmark') {
      setDisplayedText('');
      setIsTyping(false);
      setBriefing(null);
      lastFetchedRef.current = '';
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      return;
    }

    const name = entity.data.name;
    if (lastFetchedRef.current === name) return;
    lastFetchedRef.current = name;

    setDisplayedText('');
    setIsTyping(false);
    setBriefing(null);
    setBriefingLoading(true);
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

    return () => {
      cancelled = true;
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, [entity]);

  const importanceColor = (imp: string) => {
    if (imp === 'CRITICAL') return 'var(--red)';
    if (imp === 'HIGH') return 'var(--amber)';
    if (imp === 'MODERATE') return 'var(--cyan)';
    return 'var(--green)';
  };

  const stableColor = (years: number) => {
    if (years >= 10) return 'var(--green)';
    if (years >= 5) return 'var(--cyan)';
    if (years >= 2) return 'var(--amber)';
    return 'var(--red)';
  };

  return (
    <div className="insight-widget liquid-panel">
      <div className="insight-header">
        <span className="insight-title" style={{ fontFamily: 'var(--font-mono)' }}>INTELLIGENCE</span>
        {entity && (
          <button className="cc-toggle" onClick={() => { clearSelection(); audioService.playClick(); }}>✕</button>
        )}
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
                  label="YEARS STABLE" 
                  value={`${briefing.yearsStable} YRS`} 
                  color={stableColor(briefing.yearsStable)} 
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
          <>
            <div className="insight-target-name" style={{ color: entity.data.isMilitary ? 'var(--amber)' : 'var(--cyan)' }}>
              {entity.data.callsign || entity.data.icao24}
            </div>
            <div className="insight-target-sub">
              ICAO: {entity.data.icao24} · {entity.data.isMilitary ? '⚠ MILITARY' : 'CIVIL AVIATION'}
            </div>
            <div className="telem-grid">
              <MetricCard label="BARO ALT" value={`${(entity.data.altitude * 3.28084).toFixed(0)} ft`} />
              <MetricCard label="GROUNDSPEED" value={`${(entity.data.velocity * 1.94384).toFixed(0)} kt`} />
              <MetricCard label="TRACK" value={`${entity.data.heading?.toFixed(0)}°`} />
              <MetricCard label="SQUAWK" value={entity.data.squawk || '——'} />
              <MetricCard label="SOURCE" value={entity.data.source?.toUpperCase() || 'ADS-B'} color="var(--cyan)" />
              <MetricCard label="CLASS" value={entity.data.isMilitary ? 'MILITARY' : 'COMMERCIAL'} color={entity.data.isMilitary ? 'var(--amber)' : 'var(--text-bright)'} />
            </div>
          </>
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

          <div className="optics-control-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Hollywood Camera</span>
            <button
              className="optics-btn"
              style={{ fontSize: '9px', padding: '3px 8px', margin: 0, letterSpacing: '0.5px' }}
              onClick={() => setOptics({ ...DEFAULT_OPTICS, tiers: optics.tiers })}
            >
              ↺ RESET
            </button>
          </div>
          {[
            { id: 'bloom', label: 'Bloom' },
            { id: 'sharpen', label: 'Sharpen' },
            { id: 'contrast', label: 'Contrast' },
            { id: 'brightness', label: 'Brightness' },
            { id: 'saturation', label: 'Saturation' },
            { id: 'gamma', label: 'Gamma' },
            { id: 'vignette', label: 'Vignette' },
            { id: 'aberration', label: 'Aberration' },
            { id: 'grain', label: 'Film Grain' },
            { id: 'distortion', label: 'Distortion' },
          ].map((slider) => (
            <div className="optics-item" key={slider.id}>
              <span className="name">{slider.label}</span>
              <input
                type="range" min={0} max={100}
                value={optics[slider.id as keyof typeof optics] as number}
                className="optics-slider"
                onChange={(e) => setOptics({ [slider.id]: +e.target.value })}
              />
              <span className="val">{optics[slider.id as keyof typeof optics]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
