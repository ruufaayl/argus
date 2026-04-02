// ============================================================
// PatternAnalysis — Groq AI behavioral summary for entities (P3)
// Fetches /api/intel/pattern and displays pattern assessment
// ============================================================

import { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface PatternResult {
  pattern: string;
  confidence: number;
  summary: string;
  indicators: string[];
  recommendation: string;
}

const PATTERN_COLORS: Record<string, string> = {
  ROUTINE: 'var(--text-safe)',
  ANOMALOUS: 'var(--text-warn)',
  SURVEILLANCE: '#00C8FF',
  EVASIVE: 'var(--text-threat)',
  AGGRESSIVE: 'var(--text-threat)',
  UNKNOWN: 'var(--text-faint)',
};

export function PatternAnalysis({ entityType, entityData }: {
  entityType: string;
  entityData: any;
}) {
  const [result, setResult] = useState<PatternResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const fetchedRef = useRef('');

  const entityKey = JSON.stringify({ entityType, id: entityData?.callsign || entityData?.mmsi || entityData?.name });

  useEffect(() => {
    if (fetchedRef.current === entityKey) return;
    fetchedRef.current = entityKey;

    setLoading(true);
    setError(false);
    setResult(null);

    fetch(`${API_BASE}/api/intel/pattern`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityData }),
      signal: AbortSignal.timeout(15000),
    })
      .then(res => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then(data => {
        setResult(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [entityKey]);

  if (loading) {
    return (
      <div style={{
        padding: '12px', textAlign: 'center',
        fontSize: '10px', color: 'var(--cyan)', letterSpacing: '1.5px',
        fontFamily: 'var(--font-mono)',
        animation: 'pulse 1.2s ease-in-out infinite',
      }}>
        ANALYZING BEHAVIORAL PATTERN...
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={{
        padding: '8px', fontSize: '10px', color: 'var(--text-faint)',
        fontFamily: 'var(--font-mono)', textAlign: 'center',
      }}>
        {error ? 'PATTERN ANALYSIS UNAVAILABLE' : ''}
      </div>
    );
  }

  const patternColor = PATTERN_COLORS[result.pattern] || 'var(--text-faint)';
  const confidencePct = Math.round(result.confidence * 100);

  return (
    <div style={{
      padding: '8px 0',
      animation: 'card-enter 300ms var(--ease-out-expo) both',
    }}>
      {/* Pattern badge + confidence */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '12px', fontWeight: 700, letterSpacing: '2px',
            color: patternColor, fontFamily: 'var(--font-mono)',
          }}>
            {result.pattern}
          </span>
          <span className={`glass-badge ${result.pattern === 'ROUTINE' ? 'live' : result.pattern === 'ANOMALOUS' || result.pattern === 'EVASIVE' || result.pattern === 'AGGRESSIVE' ? 'warn' : ''}`}
            style={{ fontSize: '8px' }}
          >
            {confidencePct}% CONF
          </span>
        </div>
      </div>

      {/* Summary */}
      <div style={{
        fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6,
        marginBottom: '10px', padding: '8px 10px',
        background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
        border: '1px solid var(--glass-border)',
      }}>
        {result.summary}
      </div>

      {/* Indicators */}
      {result.indicators.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{
            fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px',
            color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
            marginBottom: '6px',
          }}>INDICATORS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {result.indicators.map((ind, i) => (
              <span key={i} style={{
                fontSize: '9px', padding: '3px 8px', borderRadius: 'var(--r-xs)',
                background: `${patternColor}12`,
                border: `1px solid ${patternColor}30`,
                color: patternColor,
                fontFamily: 'var(--font-mono)', letterSpacing: '0.5px',
              }}>
                {ind}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      <div style={{
        fontSize: '10px', color: patternColor, fontFamily: 'var(--font-mono)',
        letterSpacing: '0.5px', padding: '6px 0',
        borderTop: '1px solid var(--glass-border)',
      }}>
        REC: {result.recommendation}
      </div>
    </div>
  );
}
