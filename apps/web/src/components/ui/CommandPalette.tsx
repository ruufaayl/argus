// ============================================================
// CommandPalette.tsx — Ctrl+K global search overlay
// Fuzzy search across landmarks, flights, vessels
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../stores/commandStore';
import { audioService } from '../../services/audioService';

interface SearchResult {
  type: 'landmark' | 'flight' | 'vessel';
  name: string;
  detail: string;
  lat: number;
  lon: number;
  data?: any;
}

interface Props {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

export function CommandPalette({ viewerRef }: Props) {
  const paletteOpen = useCommandStore((s) => s.paletteOpen);
  const setPaletteOpen = useCommandStore((s) => s.setPaletteOpen);
  const setSelectedEntity = useCommandStore((s) => (s as any).setSelectedEntity);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when palette opens
  useEffect(() => {
    if (paletteOpen) {
      setQuery('');
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [paletteOpen]);

  // Close on Escape
  useEffect(() => {
    if (!paletteOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        audioService.playClick();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [paletteOpen, setPaletteOpen]);

  // Search logic
  const doSearch = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return; }
    const lower = q.toLowerCase();
    const hits: SearchResult[] = [];

    // Search landmarks from the viewer entities + cached data
    // Access featureCache via a simple global search approach
    const viewer = viewerRef.current;
    if (viewer && !viewer.isDestroyed()) {
      // Search through all primitives for flights
      const primitives = viewer.scene.primitives;
      for (let i = 0; i < primitives.length && hits.length < 30; i++) {
        const prim = primitives.get(i);
        // BillboardCollection — check for flights/vessels
        if (prim instanceof Cesium.BillboardCollection) {
          for (let j = 0; j < prim.length && hits.length < 30; j++) {
            const bb = prim.get(j);
            const id = bb.id;
            if (!id?.type || !id?.data) continue;

            if (id.type === 'flight') {
              const f = id.data;
              const callsign = (f.callsign || '').trim();
              const reg = (f.registration || '').trim();
              if (callsign.toLowerCase().includes(lower) || reg.toLowerCase().includes(lower) || (f.icao24 || '').toLowerCase().includes(lower)) {
                hits.push({
                  type: 'flight',
                  name: callsign || f.icao24,
                  detail: `${f.type || 'Aircraft'} · FL${Math.round((f.altitudeFt || 0) / 100)} · ${f.isMilitary ? 'MILITARY' : 'CIVIL'}`,
                  lat: f.lat,
                  lon: f.lon,
                  data: f,
                });
              }
            } else if (id.type === 'vessel') {
              const v = id.data;
              const vname = (v.name || '').trim();
              if (vname.toLowerCase().includes(lower) || String(v.mmsi).includes(lower)) {
                hits.push({
                  type: 'vessel',
                  name: vname || `MMSI ${v.mmsi}`,
                  detail: `${v.typeName || 'Vessel'} · ${v.speed || 0} kts · ${v.destination || ''}`,
                  lat: v.lat,
                  lon: v.lng || v.lon,
                  data: v,
                });
              }
            }
          }
        }

        // PointPrimitiveCollection — check for landmarks
        if (prim instanceof Cesium.PointPrimitiveCollection) {
          for (let j = 0; j < prim.length && hits.length < 30; j++) {
            const pt = prim.get(j);
            const id = pt.id;
            if (!id?.type || id.type !== 'landmark' || !id?.data) continue;

            const d = id.data;
            const name = (d.nameEn || d.name || '').trim();
            if (name.toLowerCase().includes(lower)) {
              hits.push({
                type: 'landmark',
                name,
                detail: `${(d.typeName || d.category || '').toUpperCase()} · T${d.tier}`,
                lat: d.lat,
                lon: d.lon,
                data: d,
              });
            }
          }
        }
      }
    }

    // Deduplicate by name
    const seen = new Set<string>();
    const deduped = hits.filter(h => {
      const key = `${h.type}-${h.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setResults(deduped.slice(0, 15));
    setSelectedIdx(0);
  }, [viewerRef]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      selectResult(results[selectedIdx]);
    }
  };

  const selectResult = (r: SearchResult) => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // Fly to result
    viewer.camera.cancelFlight();
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        r.lon, r.lat,
        r.type === 'flight' ? 80000 : r.type === 'vessel' ? 5000 : 2000
      ),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
      duration: 2.0,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });

    // Select entity
    if (r.type === 'landmark' && r.data) {
      setSelectedEntity?.({
        type: 'landmark',
        data: {
          name: r.data.nameEn || r.data.name,
          category: r.data.typeName || r.data.category,
          city: r.data.tags?.['addr:city'] || r.data.tags?.['is_in'] || 'Pakistan',
          province: r.data.tags?.['is_in:state'] || '',
          tier: `T${r.data.tier}`,
          lat: r.data.lat,
          lng: r.data.lon,
        },
      });
    } else if (r.type === 'flight' && r.data) {
      setSelectedEntity?.({
        type: 'flight',
        data: r.data,
      });
    } else if (r.type === 'vessel' && r.data) {
      setSelectedEntity?.({
        type: 'vessel',
        data: r.data,
      });
    }

    setPaletteOpen(false);
    audioService.playClick();
  };

  if (!paletteOpen) return null;

  const typeIcon = (t: string) => t === 'flight' ? '✈' : t === 'vessel' ? '⚓' : '◈';
  const typeColor = (t: string) => t === 'flight' ? '#00C8FF' : t === 'vessel' ? '#00FFCC' : '#FFB800';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) { setPaletteOpen(false); audioService.playClick(); } }}
    >
      <div style={{
        width: 'min(520px, 90vw)',
        background: 'rgba(10, 18, 30, 0.95)',
        border: '1px solid rgba(0, 200, 255, 0.15)',
        borderRadius: '14px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 200, 255, 0.08)',
        overflow: 'hidden',
      }}>
        {/* Search input */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '14px', opacity: 0.4 }}>⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); doSearch(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder="Search landmarks, flights, vessels..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-bright, #E8F0FF)', fontSize: '14px',
              fontFamily: '"Inter", sans-serif', letterSpacing: '0.3px',
            }}
          />
          <span style={{
            fontSize: '9px', color: 'var(--text-dim, #556680)',
            padding: '2px 6px', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px', letterSpacing: '0.5px',
          }}>ESC</span>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '6px 0' }}>
            {results.map((r, i) => (
              <div
                key={`${r.type}-${r.name}-${i}`}
                onClick={() => selectResult(r)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: i === selectedIdx ? 'rgba(0, 200, 255, 0.08)' : 'transparent',
                  borderLeft: i === selectedIdx ? '2px solid var(--cyan, #00C8FF)' : '2px solid transparent',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <span style={{ fontSize: '14px', color: typeColor(r.type), minWidth: '20px', textAlign: 'center' }}>
                  {typeIcon(r.type)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '12px', fontWeight: 600, color: 'var(--text-bright, #E8F0FF)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{r.name}</div>
                  <div style={{
                    fontSize: '10px', color: 'var(--text-dim, #556680)',
                    letterSpacing: '0.5px', marginTop: '2px',
                  }}>{r.detail}</div>
                </div>
                <span style={{
                  fontSize: '8px', color: typeColor(r.type), letterSpacing: '1px',
                  padding: '2px 6px', border: `1px solid ${typeColor(r.type)}30`,
                  borderRadius: '4px', fontFamily: 'var(--font-mono)',
                }}>{r.type.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {query && results.length === 0 && (
          <div style={{
            padding: '24px 16px', textAlign: 'center',
            fontSize: '11px', color: 'var(--text-dim, #556680)', letterSpacing: '1px',
          }}>
            NO MATCHES FOUND
          </div>
        )}

        {/* Hint */}
        {!query && (
          <div style={{
            padding: '16px', textAlign: 'center',
            fontSize: '10px', color: 'var(--text-dim, #556680)', letterSpacing: '0.5px',
          }}>
            Type to search across all data layers
          </div>
        )}
      </div>
    </div>
  );
}
