// ============================================================
// TimelineScrubber — Multi-track timeline with playback (P3)
// Fixed to bottom of screen, expandable
// Tracks: flights, vessels, intel, incidents
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { audioService } from '../../services/audioService';

const TRACK_COLORS: Record<string, string> = {
  flights: '#00C8FF',
  vessels: '#00FFCC',
  intel: '#FFB800',
  incidents: '#F43F5E',
};

const TRACK_LABELS: Record<string, string> = {
  flights: 'FLIGHTS',
  vessels: 'VESSELS',
  intel: 'INTEL',
  incidents: 'INCIDENTS',
};

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatTimeShort(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function TimelineScrubber() {
  const {
    currentTime, rangeStart, rangeEnd,
    isPlaying, playbackSpeed, tracks, isExpanded,
    setCurrentTime, togglePlay, setSpeed, goLive, toggleTrack, setExpanded, pause,
  } = useTimelineStore();

  const scrubberRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

  const isLive = currentTime === null;
  const displayTime = currentTime ?? Date.now();
  const progress = (displayTime - rangeStart) / (rangeEnd - rangeStart);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || isLive) return;

    lastTickRef.current = performance.now();

    const tick = (now: number) => {
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;

      const newTime = (currentTime ?? Date.now()) + dt * playbackSpeed;
      if (newTime >= rangeEnd) {
        setCurrentTime(rangeEnd);
        pause();
        return;
      }
      setCurrentTime(newTime);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, isLive, playbackSpeed, currentTime, rangeEnd]);

  // Scrub handler
  const handleScrub = useCallback((clientX: number) => {
    const el = scrubberRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = rangeStart + pct * (rangeEnd - rangeStart);
    setCurrentTime(time);
  }, [rangeStart, rangeEnd, setCurrentTime]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    handleScrub(e.clientX);

    const onMove = (ev: MouseEvent) => {
      if (isDraggingRef.current) handleScrub(ev.clientX);
    };
    const onUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [handleScrub]);

  if (!isExpanded) {
    return (
      <button
        className="glass-btn-secondary"
        onClick={() => { setExpanded(true); audioService.playPanelOpen(); }}
        style={{
          position: 'fixed', bottom: '48px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, fontSize: '10px', letterSpacing: '1.5px', padding: '6px 16px',
          fontFamily: 'var(--font-mono)',
        }}
      >
        TIMELINE
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
      width: 'min(calc(100vw - 720px), 900px)', zIndex: 200,
      background: 'var(--glass-fill-default)',
      backdropFilter: 'blur(var(--blur-md))',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--r-md)',
      padding: '12px 16px',
      animation: 'timeline-expand 300ms var(--ease-out-expo) both',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 600, letterSpacing: '2px',
            color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
          }}>TIMELINE</span>

          {/* Playback controls */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className="glass-btn-secondary"
              onClick={() => { togglePlay(); audioService.playClick(); }}
              style={{ padding: '4px 10px', fontSize: '10px', fontFamily: 'var(--font-mono)' }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            {[1, 2, 4, 8].map(s => (
              <button
                key={s}
                className={`glass-btn-secondary ${playbackSpeed === s && !isLive ? 'active' : ''}`}
                onClick={() => { setSpeed(s); audioService.playClick(); }}
                style={{
                  padding: '4px 8px', fontSize: '9px', fontFamily: 'var(--font-mono)',
                  opacity: playbackSpeed === s && !isLive ? 1 : 0.5,
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Live button */}
          <button
            className={`glass-btn-secondary ${isLive ? 'active' : ''}`}
            onClick={() => { goLive(); audioService.playClick(); }}
            style={{
              padding: '4px 10px', fontSize: '9px', fontFamily: 'var(--font-mono)',
              color: isLive ? 'var(--text-live)' : 'var(--text-faint)',
              borderColor: isLive ? 'var(--glow-live)' : undefined,
            }}
          >
            {isLive ? '● LIVE' : 'GO LIVE'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)',
            color: isLive ? 'var(--text-live)' : 'var(--text-primary)',
          }}>
            {formatTimeShort(displayTime)}
          </span>
          <button
            className="cc-toggle"
            onClick={() => { setExpanded(false); audioService.playClick(); }}
            style={{ width: '24px', height: '24px', borderRadius: '6px', fontSize: '12px' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Track toggles */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        {Object.keys(tracks).map(track => (
          <button
            key={track}
            onClick={() => { toggleTrack(track); audioService.playClick(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: tracks[track] ? `${TRACK_COLORS[track]}15` : 'transparent',
              border: `1px solid ${tracks[track] ? TRACK_COLORS[track] + '40' : 'var(--glass-border)'}`,
              borderRadius: 'var(--r-xs)',
              padding: '3px 8px', cursor: 'pointer',
              fontSize: '9px', fontFamily: 'var(--font-mono)',
              color: tracks[track] ? TRACK_COLORS[track] : 'var(--text-faint)',
              letterSpacing: '1px',
            }}
          >
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: tracks[track] ? TRACK_COLORS[track] : 'var(--text-faint)',
            }} />
            {TRACK_LABELS[track]}
          </button>
        ))}
      </div>

      {/* Scrubber bar */}
      <div
        ref={scrubberRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'relative', height: '24px', cursor: 'pointer',
          background: 'rgba(255,255,255,0.04)', borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        {/* Time ticks */}
        {Array.from({ length: 13 }).map((_, i) => {
          const pct = i / 12;
          const tickTime = rangeStart + pct * (rangeEnd - rangeStart);
          return (
            <div key={i} style={{
              position: 'absolute', left: `${pct * 100}%`, top: 0, bottom: 0,
              borderLeft: '1px solid rgba(255,255,255,0.08)',
            }}>
              {i % 3 === 0 && (
                <span style={{
                  position: 'absolute', top: '2px', left: '4px',
                  fontSize: '7px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)',
                  whiteSpace: 'nowrap',
                }}>
                  {formatTime(tickTime)}
                </span>
              )}
            </div>
          );
        })}

        {/* Progress fill */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${Math.max(0, Math.min(100, progress * 100))}%`,
          background: isLive
            ? 'linear-gradient(90deg, transparent, rgba(52,211,153,0.15))'
            : 'linear-gradient(90deg, transparent, rgba(0,200,255,0.15))',
          transition: isDraggingRef.current ? 'none' : 'width 0.3s',
        }} />

        {/* Playhead */}
        <div style={{
          position: 'absolute',
          left: `${Math.max(0, Math.min(100, progress * 100))}%`,
          top: 0, bottom: 0, width: '2px',
          background: isLive ? 'var(--text-live)' : 'var(--cyan)',
          boxShadow: `0 0 6px ${isLive ? 'var(--glow-live)' : 'var(--cyan)'}`,
          transition: isDraggingRef.current ? 'none' : 'left 0.3s',
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '-4px',
            width: '10px', height: '10px', borderRadius: '50%',
            background: isLive ? 'var(--text-live)' : 'var(--cyan)',
            transform: 'translateY(-50%)',
            boxShadow: `0 0 8px ${isLive ? 'var(--glow-live)' : 'var(--cyan)'}`,
          }} />
        </div>
      </div>

      {/* Range labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: '4px',
        fontSize: '8px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)',
        letterSpacing: '0.5px',
      }}>
        <span>{formatTime(rangeStart)} (T-24H)</span>
        <span>{formatTime(rangeEnd)} (NOW)</span>
      </div>
    </div>
  );
}
