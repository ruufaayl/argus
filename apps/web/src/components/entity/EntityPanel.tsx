// ============================================================
// EntityPanel — Living city monologue feed
// NO input. NO Q&A. Just the city speaking.
// Cycles append below with timestamp dividers.
// ============================================================

import { useRef, useEffect, useState } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { CITIES } from '../../lib/cities';
import { useEntityFeed } from '../../hooks/useEntityFeed';
import './EntityPanel.css';

function formatPKT(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Karachi',
  });
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function EntityPanel() {
  const currentCity = useCityStore((s) => s.currentCity);
  const city = CITIES[currentCity];
  const { cycles, isStreaming, secondsUntilNext, isLive } = useEntityFeed(currentCity);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll when new content arrives
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [cycles, autoScroll]);

  // Detect manual scroll
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  return (
    <aside className="entity-panel">
      {/* Header — fixed */}
      <div className="entity-panel__header">
        <span className="entity-panel__header-icon">◈</span>
        <span className="entity-panel__header-text">ENTITY VOICE</span>
      </div>

      {/* City identity */}
      <div className="entity-panel__city">
        <h2 className="entity-panel__city-name">I AM {city.name}</h2>
        <div className="entity-panel__city-meta">
          <span>{city.division}</span>
          <span>POP: {city.population}</span>
        </div>
        <div className="entity-panel__city-line" />
      </div>

      {/* Status bar */}
      <div className="entity-panel__status-bar">
        <div className="entity-panel__status-left">
          <span className={`entity-panel__dot ${isStreaming ? 'entity-panel__dot--streaming' : 'entity-panel__dot--idle'}`} />
          <span className="entity-panel__status-text">
            {isStreaming ? 'STREAMING' : isLive ? 'LIVE FEED' : 'LOCAL FEED'}
          </span>
        </div>
        <div className="entity-panel__status-right">
          <span className="entity-panel__countdown">
            NEXT: {formatCountdown(secondsUntilNext)}
          </span>
        </div>
      </div>

      {/* Monologue body — scrollable */}
      <div className="entity-panel__body" ref={scrollRef} onScroll={handleScroll}>
        {cycles.length === 0 && (
          <div className="entity-panel__loading">
            <span className="entity-panel__loading-dot" />
            Connecting to {city.shortCode} entity...
          </div>
        )}

        {cycles.map((cycle) => (
          <div key={cycle.id} className="entity-panel__cycle">
            {/* Timestamp divider */}
            <div className="entity-panel__divider">
              <span>{formatPKT(cycle.timestamp)} PKT</span>
              <span className="entity-panel__divider-sep">—</span>
              <span>AQI {cycle.aqi}</span>
              <span className="entity-panel__divider-sep">—</span>
              <span>{cycle.temp}°C</span>
            </div>

            {/* Monologue text */}
            <div className="entity-panel__text">
              {cycle.text}
              {cycle.isStreaming && <span className="entity-panel__cursor" />}
            </div>
          </div>
        ))}

        {/* Scroll-to-bottom badge */}
        {!autoScroll && (
          <button
            className="entity-panel__live-badge"
            onClick={() => {
              setAutoScroll(true);
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
            }}
          >
            ↓ LIVE
          </button>
        )}
      </div>

      {/* Metrics footer */}
      <div className="entity-panel__metrics">
        <div className="entity-panel__metric">
          <span className="entity-panel__metric-label">AQI</span>
          <span className="entity-panel__metric-value entity-panel__metric-value--warn">
            {city.liveMetrics.aqiBaseValue}
          </span>
        </div>
        <div className="entity-panel__metric">
          <span className="entity-panel__metric-label">TEMP</span>
          <span className="entity-panel__metric-value">{city.liveMetrics.tempBase}°C</span>
        </div>
        <div className="entity-panel__metric">
          <span className="entity-panel__metric-label">GRID</span>
          <span className="entity-panel__metric-value">{city.liveMetrics.gridStressBase}%</span>
        </div>
        <div className="entity-panel__metric">
          <span className="entity-panel__metric-label">STRESS</span>
          <span className="entity-panel__metric-value entity-panel__metric-value--crit">
            {city.liveMetrics.stressScoreBase}/10
          </span>
        </div>
      </div>
    </aside>
  );
}
