// ============================================================
// TopBar — Floating glass header (V3.1)
// ============================================================

import { useCommandStore } from '../../stores/commandStore';
import { usePKTClock } from '../../hooks/usePKTClock';

export function TopBar() {
  const time = usePKTClock(); // e.g., "14:05:01"
  const cameraAlt = useCommandStore((s) => s.cameraAlt);
  const mouseCoords = useCommandStore((s) => s.mouseCoords);

  const altStr =
    cameraAlt > 1000
      ? `${(cameraAlt / 1000).toFixed(1)} km`
      : `${cameraAlt.toFixed(0)} m`;

  // Provide a cool date format
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="topbar-container">
      <div className="topbar-main liquid-panel" style={{ position: 'relative' }}>
        <div className="topbar-left" style={{ flex: 1, display: 'flex', justifyContent: 'space-between', paddingRight: '100px', alignItems: 'center', whiteSpace: 'nowrap' }}>
          <span className="digital-clock" style={{ minWidth: '110px' }}>{time} PKT</span>
          <span className="digital-date">{dateStr.toUpperCase()}</span>
        </div>

        {/* Center Overlapping Logo — Borderless 2x */}
        <div className="topbar-center-logo">
          <img src="/logo/logo.png" alt="ARGUS" />
        </div>

        <div className="topbar-right" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingLeft: '100px', alignItems: 'center', whiteSpace: 'nowrap' }}>
          <span className="alt-badge" style={{ minWidth: '90px', textAlign: 'center', marginRight: 'auto' }}>ALT {altStr}</span>
          <span className="coords" style={{ minWidth: '180px', textAlign: 'right' }}>
            {mouseCoords ? `${mouseCoords.lat.toFixed(4)}°N ${mouseCoords.lng.toFixed(4)}°E` : '—'}
          </span>
          <button
            className="topbar-search-btn"
            title="Open Command Search (Ctrl+K)"
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
              window.dispatchEvent(event);
            }}
          >
            <span className="topbar-search-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}
