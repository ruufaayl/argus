import { useState, useEffect } from 'react';

const LINES = [
  'ARGUS // STRATEGIC INTELLIGENCE GRID ONLINE',
  'UPLINK: GROQ-POWERED ANALYTIC CORE // STABLE',
  'AO: PAKISTAN AIRSPACE · LIVE ISR FEEDS LINKED',
  'CLASSIFICATION: SI-PK // EYES-ONLY'
];

interface CinematicIntroProps {
  onComplete: () => void;
}

export function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isEntering, setIsEntering] = useState(true);

  // Initial enter animation
  useEffect(() => {
    const t = setTimeout(() => setIsEntering(false), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (lineIndex >= LINES.length) {
      // Finished typing all lines, wait a moment then trigger sequence end
      const timeout = setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(onComplete, 800); // 800ms fade out before unmounting
      }, 1500); // 1.5s pause to read final text
      return () => clearTimeout(timeout);
    }

    const currentLine = LINES[lineIndex];

    if (charIndex < currentLine.length) {
      // Type next character
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + currentLine[charIndex]);
        setCharIndex(charIndex + 1);
      }, Math.random() * 20 + 20); // 20-40ms per char for realistic organic typing
      return () => clearTimeout(timeout);
    } else {
      // Line finished, move to next line
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + '\n');
        setLineIndex(lineIndex + 1);
        setCharIndex(0);
      }, 400); // 400ms pause between lines
      return () => clearTimeout(timeout);
    }
  }, [lineIndex, charIndex, onComplete]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9999, // very high to be above all
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        backgroundColor: isFadingOut ? 'transparent' : 'rgba(10, 14, 20, 0.4)',
        backdropFilter: isFadingOut ? 'blur(0px)' : 'blur(8px)',
        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isFadingOut ? 0 : 1,
      }}
    >
      <div
        style={{
          padding: '40px 60px',
          background: 'rgba(12, 18, 30, 0.65)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid rgba(0, 200, 255, 0.15)',
          borderRadius: '24px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.1), 0 0 40px rgba(0, 200, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          transform: isEntering ? 'scale(0.95) translateY(20px)' : (isFadingOut ? 'scale(1.05)' : 'scale(1) translateY(0)'),
          opacity: isEntering ? 0 : 1,
          transition: 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* Animated Cyber Spinner */}
        <div style={{ position: 'relative', width: '40px', height: '40px', marginBottom: '8px' }}>
          <div style={{
            position: 'absolute', inset: 0, border: '2px solid rgba(0, 200, 255, 0.2)', borderRadius: '50%',
            borderTopColor: '#00C8FF', animation: 'spin 1s linear infinite'
          }} />
          <div style={{
            position: 'absolute', inset: '8px', border: '2px dashed rgba(0, 200, 255, 0.4)', borderRadius: '50%',
            animation: 'spin 2s linear infinite reverse'
          }} />
        </div>

        <div
          style={{
            fontFamily: '"Orbitron", system-ui, sans-serif',
            color: '#E2E8F0',
            textAlign: 'center',
            lineHeight: '1.7',
            maxWidth: '520px',
            textTransform: 'uppercase',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              letterSpacing: '0.4em',
              opacity: 0.9,
              marginBottom: '10px',
            }}
          >
            ARGUS / V4 STRATNET
          </div>
          <div
            style={{
              fontSize: '13px',
              letterSpacing: '0.22em',
              whiteSpace: 'pre-line',
            }}
          >
            {displayedText}
          </div>
          {lineIndex < LINES.length && (
            <span style={{ 
              display: 'inline-block', 
              width: '8px', 
              height: '15px',
              background: '#00C8FF', 
              marginLeft: '4px',
              animation: 'blink 1s step-end infinite',
              verticalAlign: 'middle',
              boxShadow: '0 0 8px rgba(0, 200, 255, 0.8)'
            }} />
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        `}
      </style>
    </div>
  );
}
