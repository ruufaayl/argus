// ============================================================
// IncidentTimeline — 24H Vertical Signal Plot
// ============================================================

import { useCityStore } from '../../stores/cityStore';
import { useCityData } from '../../hooks/useCityData';
import './IncidentTimeline.css';

export function IncidentTimeline() {
  const currentCity = useCityStore((s) => s.currentCity);
  const { signals } = useCityData(currentCity);

  return (
    <div className="incident-timeline">
      <div className="incident-timeline__header">
        <span className="incident-timeline__title">SIGNAL TEMPORAL PLOT (24H)</span>
      </div>
      
      <div className="incident-timeline__plot">
        <div className="incident-timeline__now-line" />
        <span className="incident-timeline__now-label">T-0 (NOW)</span>

        {signals.map(signal => {
          // Calculate relative Y position based on age (up to 24h)
          const ageMs = Date.now() - signal.timestamp;
          const ageHours = Math.min(24, ageMs / (1000 * 60 * 60));
          const topPercent = (ageHours / 24) * 100;

          return (
            <div 
              key={signal.id} 
              className={`timeline-dot timeline-dot--${signal.severity}`}
              style={{ top: `${topPercent}%` }}
              title={`${signal.title} — ${new Date(signal.timestamp).toLocaleTimeString()}`}
            >
              <span className="timeline-dot__pulse" />
              <div className="timeline-dot__label">{signal.source.toUpperCase()}</div>
            </div>
          );
        })}
        
        {/* Scale markers */}
        {[6, 12, 18, 24].map(h => (
          <div key={h} className="timeline-scale" style={{ top: `${(h/24)*100}%` }}>
            <span className="timeline-scale__label">T-{h}H</span>
          </div>
        ))}
      </div>
    </div>
  );
}
