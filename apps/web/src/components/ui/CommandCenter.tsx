// ============================================================
// CommandCenter — Live Intel C2 Panel (V4.0)
// Real Groq AI intelligence with threat index, foot traffic,
// years-stable, source attribution — zero simulated content
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useCommandStore } from '../../stores/commandStore';
import { useRadarStore } from '../../stores/radarStore';
import { audioService } from '../../services/audioService';

export interface IntelItem {
  priority: 'critical' | 'high' | 'normal' | 'info';
  title: string;
  detail: string;
  time: string;
  lat: number;
  lng: number;
  location: string;
  threatIndex?: number;
  footTraffic?: string;
  source?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

async function fetchLiveSignals(): Promise<IntelItem[]> {
  const res = await fetch(`${API_BASE}/api/intel/signals`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Intel API ${res.status}`);
  const data = await res.json();
  // API may return array directly or wrapped in object
  if (Array.isArray(data)) return data;
  return [];
}

function ThreatBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 10) * 100));
  const color = value >= 8 ? '#F43F5E' : value >= 6 ? '#FFB800' : value >= 4 ? '#00C8FF' : '#34D399';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
      <span style={{ fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '0.5px', minWidth: '36px' }}>THREAT</span>
      <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color,
          boxShadow: `0 0 6px ${color}`,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <span style={{ fontSize: '9px', color, fontFamily: 'var(--font-mono)', minWidth: '28px', textAlign: 'right' }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function SourceBadge({ source, footTraffic }: { source?: string; footTraffic?: string }) {
  if (!source && !footTraffic) return null;
  return (
    <div style={{ display: 'flex', gap: '4px', marginTop: '5px', flexWrap: 'wrap' }}>
      {source && (
        <span style={{
          fontSize: '8px', padding: '2px 6px', borderRadius: '3px',
          background: 'rgba(0,200,255,0.1)', color: 'var(--cyan)',
          border: '1px solid rgba(0,200,255,0.2)', letterSpacing: '0.5px',
          fontFamily: 'var(--font-mono)',
        }}>{source}</span>
      )}
      {footTraffic && (
        <span style={{
          fontSize: '8px', padding: '2px 6px', borderRadius: '3px',
          background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)',
          border: '1px solid rgba(255,255,255,0.07)', letterSpacing: '0.5px',
        }}>
          {footTraffic} TRAFFIC
        </span>
      )}
    </div>
  );
}

export function CommandCenter() {
  const [collapsed, setCollapsed] = useState(false);
  const setFlyToTarget = useCommandStore((s) => s.setFlyToTarget);
  const [intelFeed, setIntelFeed] = useState<IntelItem[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [maxThreat, setMaxThreat] = useState(0);
  const tacticalAlerts = useCommandStore((s) => s.tacticalAlerts);
  const crossingEvents = useRadarStore((s) => s.crossingEvents);
  const isLocked = useCommandStore((s) => s.isLocked);

  // Convert crossing events to IntelItem format
  const crossingItems: IntelItem[] = crossingEvents
    .filter(e => e.threatLevel === 'CRITICAL' || e.threatLevel === 'HIGH' || e.threatLevel === 'MODERATE')
    .slice(0, 5)
    .map(e => ({
      priority: e.threatLevel === 'CRITICAL' ? 'critical' as const :
                e.threatLevel === 'HIGH' ? 'high' as const : 'normal' as const,
      title: `${e.type === 'ENTRY' ? '⮕' : '⮐'} ${e.callsign} — ${e.sector.name}`,
      detail: `${e.aircraftType} · FL${Math.round(e.altitudeFt / 100)} · ${e.speedKts.toFixed(0)}kt · HDG ${e.headingDeg.toFixed(0)}°${e.airline ? ` · ${e.airline}` : ''}`,
      time: e.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      lat: e.lat,
      lng: e.lon,
      location: e.sector.direction,
      threatIndex: e.threatLevel === 'CRITICAL' ? 9.5 : e.threatLevel === 'HIGH' ? 7.5 : 5.0,
      source: 'RADAR',
    }));

  const loadIntel = useCallback(async () => {
    if (isLocked) return;
    setLoading(true);
    try {
      const items = await fetchLiveSignals();
      if (items.length > 0) {
        setIntelFeed(items);
        setIsLive(true);
        const top = Math.max(...items.map(i => i.threatIndex ?? 0));
        setMaxThreat(top);
        audioService.playDataUplink();
        // Fire critical alert sound if any item is critical
        if (items.some(i => i.priority === 'critical')) {
          setTimeout(() => audioService.playCriticalAlert(), 500);
        }
      }
    } catch (e) {
      console.error('[CC] Intel fetch failed:', e);
      setIsLive(false);
    }
    setLoading(false);
  }, [isLocked]);

  useEffect(() => {
    if (!isLocked) {
      loadIntel();
    }
    const interval = setInterval(() => {
      if (!isLocked) loadIntel();
    }, 90 * 1000); // 90 seconds
    return () => clearInterval(interval);
  }, [loadIntel, isLocked]);

  const handleIntelClick = (lat: number, lng: number, name: string) => {
    setFlyToTarget({ lat: lat - 0.0109, lng, name });
    audioService.playTargetAcquired();
  };

  const threatColor = maxThreat >= 8 ? 'var(--red)' : maxThreat >= 6 ? 'var(--amber)' : 'var(--cyan)';

  if (collapsed) {
    return (
      <div
        className="command-center liquid-panel collapsed"
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '48px' }}
        onClick={() => { setCollapsed(false); audioService.playPanelOpen(); }}
      >
        <span style={{ fontSize: '16px' }}>☰</span>
      </div>
    );
  }

  return (
    <div className="command-center liquid-panel">
      {/* Header */}
      <div className="cc-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="cc-title" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>COMMAND CENTER</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Aggregate Threat Level */}
          {maxThreat > 0 && (
            <span style={{
              fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px',
              color: threatColor, background: `${threatColor}18`,
              border: `1px solid ${threatColor}40`, padding: '2px 7px', borderRadius: '4px',
              animation: maxThreat >= 8 ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }}>
              THREAT {maxThreat.toFixed(1)}
            </span>
          )}
          <button className="cc-toggle" onClick={() => setCollapsed(true)}>✕</button>
        </div>
      </div>

      <div className="cc-body">
        {/* Status bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            LIVE INTELLIGENCE
          </span>
          <span style={{ color: isLive ? 'var(--green)' : 'var(--amber)', fontSize: '8px' }}>●</span>
          {isLive ? (
            <span style={{ color: 'var(--green)', fontSize: '9px', letterSpacing: '0.5px' }}>GROQ UPLINK ACTIVE</span>
          ) : (
            <span style={{ color: 'var(--amber)', fontSize: '9px' }}>ESTABLISHING...</span>
          )}
          {loading && (
            <span style={{ color: 'var(--cyan)', fontSize: '9px', animation: 'pulse 1s ease-in-out infinite' }}>
              ⬡ SCANNING...
            </span>
          )}
        </div>

        {/* Empty state while loading */}
        {!loading && intelFeed.length === 0 && tacticalAlerts.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '24px 16px',
            color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.4 }}>◉</div>
            UPLINK ESTABLISHING...<br />
            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Connecting to intelligence grid</span>
          </div>
        )}

        {/* Intelligence cards — crossings first, then tactical, then intel */}
        {([...crossingItems, ...tacticalAlerts, ...intelFeed]).map((item, i) => (
          <div
            key={`${i}-${item.title}`}
            className={`intel-card priority-${item.priority}`}
            onClick={() => handleIntelClick(item.lat, item.lng, item.location)}
            style={{ animation: `slideUp 0.3s ease ${i * 0.04}s both` }}
          >
            <div className={`priority ${item.priority}`}>
              {item.priority === 'critical' && '⚠ '}
              {item.priority}
            </div>
            <div className="title">{item.title}</div>
            <div className="detail">{item.detail}</div>

            {/* Threat index bar */}
            {typeof item.threatIndex === 'number' && <ThreatBar value={item.threatIndex} />}

            {/* Source + foot traffic badges */}
            <SourceBadge source={item.source} footTraffic={item.footTraffic} />

            <div className="meta">
              <span>{item.time}</span>
              <span className="location-link">📍 {item.location}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
