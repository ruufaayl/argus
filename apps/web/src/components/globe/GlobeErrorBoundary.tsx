// ============================================================
// GlobeErrorBoundary — Catches CesiumJS WebGL failures
// ============================================================

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Globe rendering failed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#06060b',
          color: '#8a8a9e',
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: '12px',
          gap: '12px',
          padding: '20px',
          textAlign: 'center',
        }}>
          <span style={{ color: '#ff3b3b', fontSize: '14px', letterSpacing: '2px' }}>
            ◆ GLOBE ENGINE ERROR
          </span>
          <span>WebGL context failed to initialize.</span>
          <span style={{ opacity: 0.5, fontSize: '10px' }}>
            {this.state.error?.message || 'Unknown error'}
          </span>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '12px',
              padding: '6px 16px',
              background: 'transparent',
              border: '1px solid #00d4ff',
              color: '#00d4ff',
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: '11px',
              letterSpacing: '2px',
              cursor: 'pointer',
            }}
          >
            RELOAD
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
