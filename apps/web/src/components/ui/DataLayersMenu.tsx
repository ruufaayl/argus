// ============================================================
// DataLayersMenu.tsx — Independent Layer Toggles (V3.3)
// ============================================================

import { useState } from 'react';
import { useCommandStore } from '../../stores/commandStore';
import type { LayerCategory } from '../../stores/commandStore';

const LAYER_DEFS: { id: LayerCategory; label: string; color: string }[] = [
  { id: 'flights', label: 'Live Air Traffic', color: '#00C8FF' },
  { id: 'vessels', label: 'Marine Vessels', color: '#00FFCC' },
  { id: 'satellites', label: 'Satellites', color: '#C8A0FF' },
  { id: 'weather', label: 'Weather Radar', color: '#FF6B35' },
  { id: 'traffic', label: 'Street Traffic', color: '#00C8FF' },
  { id: 'population', label: 'Population Density', color: '#FF5000' },
  { id: 'military', label: 'Military', color: '#FFB800' },
  { id: 'government', label: 'Government', color: '#4A9EFF' },
  { id: 'transport', label: 'Transport', color: '#00C8FF' },
  { id: 'education', label: 'Education', color: '#9B59B6' },
  { id: 'healthcare', label: 'Healthcare', color: '#F43F5E' },
  { id: 'industrial', label: 'Industrial', color: '#95A5A6' },
  { id: 'commercial', label: 'Commercial', color: '#B8B8B8' },
  { id: 'religious', label: 'Religious', color: '#F39C12' },
  { id: 'tourism', label: 'Tourism', color: '#34D399' },
  { id: 'media', label: 'Media/Telecom', color: '#E74C3C' },
  { id: 'residential', label: 'Residential', color: '#1ABC9C' },
];

export function DataLayersMenu() {
  const [collapsed, setCollapsed] = useState(false);
  const layers = useCommandStore((s) => s.layers);
  const toggleLayer = useCommandStore((s) => s.toggleLayer);
  const flightCount = useCommandStore((s) => s.flightCount);
  const milCount = useCommandStore((s) => s.militaryFlightCount);
  const layerCounts = useCommandStore((s) => s.layerCounts);

  if (collapsed) {
    return (
      <div
        className="data-layers liquid-panel collapsed"
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '48px' }}
        onClick={() => setCollapsed(false)}
      >
        <span style={{ fontSize: '16px' }}>⌘</span>
      </div>
    );
  }

  return (
    <div className="data-layers liquid-panel">
      <div className="cc-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="cc-title">Data Layers</span>
        </div>
        <button className="cc-toggle" onClick={() => setCollapsed(true)}>✕</button>
      </div>

      <div className="cc-body">
        <div className="layer-section">
          {LAYER_DEFS.map((layer) => {
            const isOn = layers[layer.id];
            return (
              <div
                key={layer.id}
                className={`layer-row ${isOn ? '' : 'off'}`}
                onClick={() => toggleLayer(layer.id)}
              >
                <div
                  className={`layer-indicator ${isOn ? 'on' : ''}`}
                  style={{ background: isOn ? layer.color : 'var(--text-dim)', color: layer.color }}
                />
                <span className="layer-label">{layer.label}</span>
                {layer.id === 'flights' && isOn && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {flightCount}{milCount > 0 ? ` (+${milCount})` : ''}
                  </span>
                )}
                {layer.id === 'vessels' && isOn && layerCounts['vessels'] ? (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {layerCounts['vessels']}
                  </span>
                ) : null}
                {layer.id === 'landmarks' && isOn && layerCounts['landmarks'] ? (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {layerCounts['landmarks']}
                  </span>
                ) : null}
                <span className={`layer-status ${isOn ? 'on' : 'off'}`}>
                  {isOn ? 'ON' : 'OFF'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
