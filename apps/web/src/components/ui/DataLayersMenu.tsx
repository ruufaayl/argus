// ============================================================
// DataLayersMenu.tsx — Independent Layer Toggles (V3.3)
// ============================================================

import { useState } from 'react';
import { useCommandStore } from '../../stores/commandStore';
import type { LayerCategory } from '../../stores/commandStore';

const LAYER_DEFS: { id: LayerCategory; label: string; color: string }[] = [
  { id: 'flights', label: 'Live Air Traffic', color: '#2A8CFF' },    // vivid blue
  { id: 'vessels', label: 'Marine Vessels', color: '#E833E8' },       // vivid magenta
  { id: 'satellites', label: 'Satellites', color: '#FFD633' },        // gold/amber
  { id: 'weather', label: 'Weather Radar', color: '#FF6B35' },       // orange
  { id: 'military', label: 'Military', color: '#FFCC00' },           // bright amber
  { id: 'transport', label: 'Transport', color: '#00CCFF' },         // cyan
  { id: 'education', label: 'Education', color: '#00FF99' },         // mint green
  { id: 'healthcare', label: 'Healthcare', color: '#FF3355' },       // bright red
  { id: 'industrial', label: 'Industrial', color: '#FFFF44' },       // yellow
  { id: 'religious', label: 'Religious', color: '#FFE030' },         // gold
  { id: 'cctv', label: 'CCTV Surveillance', color: '#00FF80' },      // green
  { id: 'sigint', label: 'SIGINT Emissions', color: '#FF3040' },     // red
  { id: 'landmarks', label: 'All Landmarks', color: '#FFFFFF' },     // white
  { id: 'border', label: 'Pakistan Border', color: '#00FF88' },      // green
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
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {flightCount}{milCount > 0 ? ` (+${milCount})` : ''}
                  </span>
                )}
                {layer.id === 'vessels' && isOn && layerCounts['vessels'] ? (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {layerCounts['vessels']}
                  </span>
                ) : null}
                {layer.id === 'satellites' && isOn && layerCounts['satellites'] ? (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {layerCounts['satellites']}{layerCounts['satellitesOverPK'] ? ` (${layerCounts['satellitesOverPK']} PK)` : ''}
                  </span>
                ) : null}
                {layer.id === 'landmarks' && isOn && layerCounts['landmarks'] ? (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
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
