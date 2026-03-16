import { useEffect, useState } from 'react';

export function TileLoadingBar() {
  const [tilesRemaining, setTilesRemaining] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout>;

    const handler = (e: Event) => {
      const remaining = (e as CustomEvent).detail.tilesRemaining;
      setTilesRemaining(remaining);

      if (remaining > 0) {
        setVisible(true);
        clearTimeout(hideTimeout);
      } else {
        hideTimeout = setTimeout(() => setVisible(false), 800);
      }
    };

    window.addEventListener('argus:tilesLoading', handler);
    return () => {
      window.removeEventListener('argus:tilesLoading', handler);
      clearTimeout(hideTimeout);
    };
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '36px',
      left: '264px',
      right: '304px',
      height: '2px',
      background: 'rgba(0,200,255,0.08)',
      zIndex: 500,
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        background: 'rgba(0,200,255,0.7)',
        boxShadow: '0 0 8px rgba(0,200,255,0.5)',
        width: tilesRemaining > 0 ? '60%' : '100%',
        transition: tilesRemaining === 0
          ? 'width 0.4s ease'
          : 'none',
        animation: tilesRemaining > 0
          ? 'tile-pulse 1.2s ease-in-out infinite'
          : 'none',
      }} />
      <style>{`
        @keyframes tile-pulse {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
