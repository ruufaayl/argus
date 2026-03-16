// ============================================================
// LocationsBar — Floating bottom selector (V3.1)
// Glass pill layout with category filtering and landmark chips
// ============================================================

import { useMemo, useRef } from 'react';
import { useCommandStore } from '../../stores/commandStore';
import type { LayerCategory } from '../../stores/commandStore';
import { LANDMARKS, CATEGORY_CONFIG } from '../../data/landmarks';

const CAT_LABELS: Partial<Record<LayerCategory, string>> = {
  military: 'Military',
  government: 'Government',
  transport: 'Transport',
  education: 'Education',
  healthcare: 'Healthcare',
  religious: 'Religious',
  tourism: 'Tourism',
  industrial: 'Industrial',
  commercial: 'Commercial',
  media: 'Media',
};

const CATEGORY_KEYS: LayerCategory[] = [
  'military', 'government', 'transport', 'industrial',
  'education', 'healthcare', 'religious', 'tourism',
  'commercial', 'media',
];

export function LocationsBar() {
  const activeCategory = useCommandStore((s) => s.activeCategory);
  const setActiveCategory = useCommandStore((s) => s.setActiveCategory);
  const setFlyToTarget = useCommandStore((s) => s.setFlyToTarget);
  const selectEntity = useCommandStore((s) => s.selectEntity);
  const viewMode = useCommandStore((s) => s.viewMode);
  const setViewMode = useCommandStore((s) => s.setViewMode);
  const setPaletteOpen = useCommandStore((s) => s.setPaletteOpen);

  const filteredLandmarks = useMemo(() => {
    if (!activeCategory || !CAT_LABELS[activeCategory]) return [];
    return LANDMARKS.filter((lm) => lm.category === activeCategory)
      .sort((a, b) => {
        const order: Record<string, number> = { T1: 0, T2: 1, T3: 2 };
        return (order[a.tier] ?? 9) - (order[b.tier] ?? 9);
      });
  }, [activeCategory]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollChips = (amount: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div className="bottom-float">
      {/* Landmark chips when category is selected */}
      {activeCategory && filteredLandmarks.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
          <button className="preset-btn" onClick={() => scrollChips(-250)} style={{ padding: '6px 10px', fontSize: '16px' }}>‹</button>
          <div className="loc-chips" ref={scrollRef}>
            {filteredLandmarks.map((lm, idx) => (
              <button
                key={`${lm.name}-${idx}`}
                className="loc-chip"
                onClick={() => {
                  const correctedLat = lm.lat - 0.0109;
                  const correctedLng = lm.lng;
                  setFlyToTarget({ lat: correctedLat, lng: correctedLng, name: lm.name });
                  selectEntity({
                    type: 'landmark',
                    data: { ...lm, lat: correctedLat, lng: correctedLng }
                  });
                }}
              >
                {lm.name}
              </button>
            ))}
          </div>
          <button className="preset-btn" onClick={() => scrollChips(250)} style={{ padding: '6px 10px', fontSize: '16px' }}>›</button>
        </div>
      )}

      {/* Category pills */}
      <div className="loc-pills">
        {CATEGORY_KEYS.map((cat) => (
          <button
            key={cat}
            className={`loc-pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            style={{
              '--pill-color': CATEGORY_CONFIG[cat]?.color ?? 'var(--cyan)',
            } as React.CSSProperties}
          >
            {cat === 'military' && <img src="/logo/logo.png" alt="" style={{ height: '12px', marginRight: '6px', opacity: 0.6 }} />}
            {CAT_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Style presets */}
      <div className="presets-row liquid-panel">
        {(['NORMAL', 'NVG', 'FLIR', 'MONO', 'CRT'] as const).map((mode) => (
          <button
            key={mode}
            className={`preset-btn ${viewMode === mode ? 'active' : ''}`}
            onClick={() => setViewMode(mode)}
          >
            {mode === 'NVG' ? 'Night Vision' : mode === 'FLIR' ? 'Thermal' : mode === 'MONO' ? 'Noir' : mode}
          </button>
        ))}
        {/* Search / Command Palette Toggle */}
        <button
          className="preset-btn"
          style={{ padding: '0 12px', display: 'flex', alignItems: 'center' }}
          onClick={() => setPaletteOpen(true)}
          title="Open Command Center (Cmd+K)"
        >
          🔍
        </button>
      </div>
    </div>
  );
}
