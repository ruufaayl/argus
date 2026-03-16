// ============================================================
// TopBar — Floating glass header (V3.1)
// ============================================================

import { useCommandStore } from '../../stores/commandStore';
import { useRadarStore } from '../../stores/radarStore';
import { usePKTClock } from '../../hooks/usePKTClock';

export function TopBar() {
  const time = usePKTClock(); // e.g., "14:05:01"
  const cameraAlt = useCommandStore((s) => s.cameraAlt);
  const mouseCoords = useCommandStore((s) => s.mouseCoords);
  const unreadCount = useRadarStore((s) => s.unreadCount);
  const markAllRead = useRadarStore((s) => s.markAllRead);

  const altStr =
    cameraAlt > 1000
      ? `${(cameraAlt / 1000).toFixed(1)} km`
      : `${cameraAlt.toFixed(0)} m`;

  // Provide a cool date format
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="topbar-container">
      <div className="topbar-main liquid-panel" style={{ position: 'relative' }}>
        <div className="topbar-left" style={{ flex: 1, display: 'flex', gap: '20px', paddingRight: '100px', alignItems: 'center', whiteSpace: 'nowrap' }}>
          <span className="digital-clock" style={{ width: '100px', display: 'inline-block', textAlign: 'left' }}>{time} PKT</span>
          <span className="digital-date" style={{ width: '130px', display: 'inline-block', textAlign: 'left' }}>{dateStr.toUpperCase()}</span>
          {unreadCount > 0 && (
            <span
              onClick={markAllRead}
              style={{
                fontSize: '10px', fontWeight: 700,
                color: '#000', background: '#F43F5E',
                padding: '2px 7px', borderRadius: '10px',
                cursor: 'pointer', letterSpacing: '0.5px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            >
              {unreadCount} ALERT{unreadCount > 1 ? 'S' : ''}
            </span>
          )}
        </div>

        {/* Center Overlapping Logo — Borderless 2x */}
        <div className="topbar-center-logo">
          <img src="/logo/logo.png" alt="ARGUS" />
        </div>

        <div className="topbar-right" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '20px', paddingLeft: '100px', alignItems: 'center', whiteSpace: 'nowrap' }}>
          <span className="alt-badge" style={{ width: '120px', display: 'inline-block', textAlign: 'right' }}>ALT {altStr}</span>
          <span className="coords" style={{ width: '190px', display: 'inline-block', textAlign: 'right' }}>
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
