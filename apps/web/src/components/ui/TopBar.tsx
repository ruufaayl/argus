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
      <div className="topbar-main" style={{ position: 'relative' }}>
        <div className="topbar-left" style={{ flex: 1, display: 'flex', gap: '16px', paddingRight: '80px', alignItems: 'center', whiteSpace: 'nowrap' }}>
          <span className="digital-clock">{time} PKT</span>
          <span className="digital-date">{dateStr.toUpperCase()}</span>
          {unreadCount > 0 && (
            <span
              onClick={markAllRead}
              className="alert-badge-pulse"
              style={{
                fontSize: '10px', fontWeight: 700,
                color: '#000', background: '#F25F5C',
                padding: '2px 8px', borderRadius: 'var(--r-pill)',
                cursor: 'pointer', letterSpacing: '0.5px',
                animation: 'alertPulse 2s ease-in-out infinite',
              }}
            >
              {unreadCount} ALERT{unreadCount > 1 ? 'S' : ''}
            </span>
          )}
        </div>

        {/* Center Logo */}
        <div className="topbar-center-logo">
          <img src="/logo/logo.png" alt="ARGUS" />
        </div>

        <div className="topbar-right" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '16px', paddingLeft: '80px', alignItems: 'center', whiteSpace: 'nowrap' }}>
          <span className="alt-badge">ALT {altStr}</span>
          <span className="coords">
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
