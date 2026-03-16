// ============================================================
// BottomBar — Ticker + status indicators
// ============================================================

import { useCityStore } from '../../stores/cityStore';
import { formatAltitude } from '../../lib/altitudeManager';
import './BottomBar.css';

const TICKER_TEXT =
  'ARGUS URBAN INTELLIGENCE PLATFORM — REAL-TIME SATELLITE + SIGNAL FUSION — KARACHI · LAHORE · ISLAMABAD · RAWALPINDI — ALL DATA SOURCES OPEN · ZERO CLASSIFIED FEEDS — PHASE 2: CITY BREATHES OPERATIONAL';

export function BottomBar() {
  const currentZone = useCityStore((s) => s.currentZone);
  const cameraAltitude = useCityStore((s) => s.cameraAltitude);
  const isClassifiedMode = useCityStore((s) => s.isClassifiedMode);

  const mode = isClassifiedMode ? 'CLASSIFIED' : 'PUBLIC';

  return (
    <footer className="bottom-bar">
      <div className="bottom-bar__ticker">
        <div className="bottom-bar__ticker-track">
          <span className="bottom-bar__ticker-text">{TICKER_TEXT}</span>
          <span className="bottom-bar__ticker-text">{TICKER_TEXT}</span>
        </div>
      </div>

      <div className="bottom-bar__status">
        <span className="bottom-bar__item">
          <span className="bottom-bar__label">ALT</span>
          <span className="bottom-bar__value">{formatAltitude(cameraAltitude)}</span>
        </span>

        <span className="bottom-bar__divider">│</span>

        <span className="bottom-bar__item">
          <span className="bottom-bar__label">ZONE</span>
          <span className="bottom-bar__value bottom-bar__value--cyan">{currentZone}</span>
        </span>

        <span className="bottom-bar__divider">│</span>

        <span className="bottom-bar__item">
          <span className="bottom-bar__label">MODE</span>
          <span className={`bottom-bar__value ${mode === 'CLASSIFIED' ? 'bottom-bar__value--red' : 'bottom-bar__value--green'}`}>
            {mode}
          </span>
        </span>

        <span className="bottom-bar__divider">│</span>

        <span className="bottom-bar__item">
          <span className="bottom-bar__label">SYS</span>
          <span className="bottom-bar__value bottom-bar__value--green">NOMINAL</span>
        </span>
      </div>
    </footer>
  );
}
