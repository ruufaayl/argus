// ============================================================
// SignalFeed — Real-time scrolling intelligence feed
// Displays aggregated signals from AQI, Weather, Outages, etc.
// ============================================================

import { useEffect, useState } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { useCityData } from '../../hooks/useCityData';
import type { Signal } from '@sentinel/shared';
import './SignalFeed.css';

function formatTimeAgo(timestamp: number): string {
  const diffInSecs = Math.floor((Date.now() - timestamp) / 1000);
  if (diffInSecs < 60) return `${diffInSecs}s ago`;
  const diffInMins = Math.floor(diffInSecs / 60);
  if (diffInMins < 60) return `${diffInMins}m ago`;
  const diffInHours = Math.floor(diffInMins / 60);
  return `${diffInHours}h ago`;
}

export function SignalFeed() {
  const currentCity = useCityStore((s) => s.currentCity);
  const { signals, isLoading } = useCityData(currentCity);
  const [, setNow] = useState(Date.now());

  // Force re-render every minute to update "time ago" correctly
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(iv);
  }, []);

  if (isLoading && signals.length === 0) {
    return (
      <div className="signal-feed__loading">
        <span className="signal-feed__loading-dot" />
        ESTABLISHING SIGNAL UPLINK...
      </div>
    );
  }

  return (
    <div className="signal-feed">
      <div className="signal-feed__header">
        <span className="signal-feed__icon">▤</span>
        <span className="signal-feed__title">LIVE SIGNALS INTERCEPT</span>
        <span className="signal-feed__count">{signals.length}</span>
      </div>

      <div className="signal-feed__list">
        {signals.length === 0 && (
          <div className="signal-feed__empty">NO ACTIVE SIGNALS</div>
        )}
        
        {signals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} />
        ))}
      </div>
    </div>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  return (
    <div className={`signal-card signal-card--${signal.severity}`}>
      <div className="signal-card__meta">
        <span className="signal-card__time">{formatTimeAgo(signal.timestamp)}</span>
        <span className="signal-card__source">SRC: {signal.source.toUpperCase()}</span>
      </div>
      
      <div className="signal-card__title">{signal.title}</div>
      <div className="signal-card__detail">{signal.detail}</div>
      
      {signal.district && (
        <div className="signal-card__district">
          › LOC: {signal.district.toUpperCase()}
        </div>
      )}
    </div>
  );
}
