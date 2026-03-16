// ============================================================
// ViewModeSelector — Style Presets with icons (V2, WorldView-like)
// ============================================================

import { useCommandStore } from '../../stores/commandStore';
import type { ViewMode } from '../../stores/commandStore';

const MODES: { id: ViewMode; label: string; icon: string }[] = [
  { id: 'NORMAL', label: 'Normal', icon: '◻' },
  { id: 'CRT', label: 'CRT', icon: '▦' },
  { id: 'NVG', label: 'NVG', icon: '☽' },
  { id: 'FLIR', label: 'FLIR', icon: '🔥' },
  { id: 'MONO', label: 'Noir', icon: '◉' },
];

export function ViewModeSelector() {
  const current = useCommandStore((s) => s.viewMode);
  const setMode = useCommandStore((s) => s.setViewMode);

  return (
    <div className="style-presets-bar">
      <span className="style-presets-label">STYLE PRESETS</span>
      <div className="style-presets-list">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`style-preset-btn ${current === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
            title={m.label}
          >
            <span className="style-preset-icon">{m.icon}</span>
            <span className="style-preset-name">{m.label}</span>
          </button>
        ))}
      </div>
      <div className="active-style-indicator">
        <span className="active-style-label">ACTIVE STYLE</span>
        <span className="active-style-value">{current === 'NVG' ? 'NIGHT VISION' : current}</span>
      </div>
    </div>
  );
}
