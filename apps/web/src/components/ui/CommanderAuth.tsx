import { useState, useEffect } from 'react';
import { audioService } from '../../services/audioService';
import './CommanderAuth.css';

interface CommanderAuthProps {
  onComplete: () => void;
}

const COMMANDERS = [
  // STRIKENET
  {
    id: 'titan',
    callsign: 'TITAN',
    realName: 'Asim Munir',
    rank: 'FIELD MARSHAL',
    clearance: 'ALPHA-5',
    specialization: 'Supreme Commander',
    faction: 'STRIKENET',
    factionBadge: '⬡',
    portrait: '/person/commander.png',
    portraitFull: '/person/commander.png',
    stats: { missions: 842, accuracy: '99.9%', clearance: 'LEVEL 5' },
    accent: '#FF3040', // Red
    bio: 'Supreme Commander of the Armed Forces. Offensive Strike Division.',
  },
  {
    id: 'nexus',
    callsign: 'NEXUS',
    realName: 'Sahir Shamshad Mirza',
    rank: 'GENERAL',
    clearance: 'ALPHA-5',
    specialization: 'Joint Chiefs Chairman',
    faction: 'STRIKENET',
    factionBadge: '⬡',
    portrait: '/person/commander1.png',
    portraitFull: '/person/commander1.png',
    stats: { missions: 765, accuracy: '98.5%', clearance: 'LEVEL 5' },
    accent: '#FF3040',
    bio: 'Chairman Joint Chiefs of Staff Committee. Strategic operations and coordination.',
  },
  {
    id: 'hammerfall',
    callsign: 'HAMMERFALL',
    realName: 'Nauman Zakaria',
    rank: 'LIEUTENANT GENERAL',
    clearance: 'ALPHA-4',
    specialization: 'I Corps Commander',
    faction: 'STRIKENET',
    factionBadge: '⬡',
    portrait: '/person/commander2.png',
    portraitFull: '/person/commander2.png',
    stats: { missions: 512, accuracy: '96.2%', clearance: 'LEVEL 4' },
    accent: '#FF3040',
    bio: 'Commander, I Corps (Strike). Forward offensive operations.',
  },

  // CIPHER
  {
    id: 'cipher-1',
    callsign: 'CIPHER-1',
    realName: 'Hassan Khattak',
    rank: 'LIEUTENANT GENERAL',
    clearance: 'OMEGA-5',
    specialization: 'DG ISI',
    faction: 'CIPHER',
    factionBadge: '◈',
    portrait: '/person/commander6.png',
    portraitFull: '/person/commander6.png',
    stats: { missions: 934, accuracy: '99.1%', clearance: 'LEVEL 5' },
    accent: '#AA88FF', // Purple
    bio: 'Director General ISI. Intelligence operations and covert directives.',
  },
  {
    id: 'phantom',
    callsign: 'PHANTOM',
    realName: 'Amir Najam',
    rank: 'LIEUTENANT GENERAL',
    clearance: 'OMEGA-5',
    specialization: 'GHQ Special Ops',
    faction: 'CIPHER',
    factionBadge: '◈',
    portrait: '/person/commander8.png',
    portraitFull: '/person/commander8.png',
    stats: { missions: 418, accuracy: '97.8%', clearance: 'LEVEL 5' },
    accent: '#AA88FF',
    bio: 'GHQ Special Operations command. Black ops and tactical insertion.',
  },
  {
    id: 'wraith',
    callsign: 'WRAITH',
    realName: 'Azhar Waqas',
    rank: 'LIEUTENANT GENERAL',
    clearance: 'OMEGA-5',
    specialization: 'Strategic Plans',
    faction: 'CIPHER',
    factionBadge: '◈',
    portrait: '/person/commander9.png',
    portraitFull: '/person/commander9.png',
    stats: { missions: 382, accuracy: '99.5%', clearance: 'LEVEL 5' },
    accent: '#AA88FF',
    bio: 'Strategic Plans Division. Nuclear asset command and control.',
  },

  // IRONVEIL
  {
    id: 'liongate',
    callsign: 'LIONGATE',
    realName: 'Fayyaz H. Shah',
    rank: 'LIEUTENANT GENERAL',
    clearance: 'BETA-4',
    specialization: 'IV Corps Lahore',
    faction: 'IRONVEIL',
    factionBadge: '⬟',
    portrait: '/person/commander3.png',
    portraitFull: '/person/commander3.png',
    stats: { missions: 611, accuracy: '95.4%', clearance: 'LEVEL 4' },
    accent: '#FFB800', // Amber
    bio: 'Commander, IV Corps. Lahore sector and eastern border defense.',
  },
  {
    id: 'bulwark',
    callsign: 'BULWARK',
    realName: 'Imdad H. Shah',
    rank: 'LIEUTENANT GENERAL',
    clearance: 'BETA-4',
    specialization: 'XXX Corps Gujranwala',
    faction: 'IRONVEIL',
    factionBadge: '⬟',
    portrait: '/person/commander4.png',
    portraitFull: '/person/commander4.png',
    stats: { missions: 589, accuracy: '94.8%', clearance: 'LEVEL 4' },
    accent: '#FFB800',
    bio: 'Commander, XXX Corps. Gujranwala sector integrity and fortification.',
  },
  {
    id: 'sandstorm',
    callsign: 'SANDSTORM',
    realName: 'Muhammad Aqeel',
    rank: 'LIEUTENANT GENERAL',
    clearance: 'BETA-4',
    specialization: 'XXXI Corps Bahawalpur',
    faction: 'IRONVEIL',
    factionBadge: '⬟',
    portrait: '/person/commander5.png',
    portraitFull: '/person/commander5.png',
    stats: { missions: 476, accuracy: '96.5%', clearance: 'LEVEL 4' },
    accent: '#FFB800',
    bio: 'Commander, XXXI Corps. Bahawalpur sector and desert striking forces.',
  },

  // SPECTRE
  {
    id: 'medic-1',
    callsign: 'MEDIC-1',
    realName: 'Arshad Naseem',
    rank: 'LIEUTENANT GENERAL',
    clearance: 'GAMMA-3',
    specialization: 'Surgeon General',
    faction: 'SPECTRE',
    factionBadge: '✚',
    portrait: '/person/commander7.png',
    portraitFull: '/person/commander7.png',
    stats: { missions: 1024, accuracy: '99.8%', clearance: 'LEVEL 3' },
    accent: '#00FF88', // Green
    bio: 'Surgeon General of the Armed Forces. Medical corps and support operations.',
  },
];

const FACTIONS = ['ALL', 'STRIKENET', 'CIPHER', 'IRONVEIL', 'SPECTRE'];

export function CommanderAuth({ onComplete }: CommanderAuthProps) {
  const [selectedCommanderIndex, setSelectedCommanderIndex] = useState(0);
  const [activeFaction, setActiveFaction] = useState('ALL');
  const [authState, setAuthState] = useState<'idle' | 'passcode' | 'authenticating' | 'confirmed'>('idle');
  const [authProgress, setAuthProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isError, setIsError] = useState(false);
  
  const SECRET = (import.meta as any).env.VITE_CLASSIFIED_PASSWORD || '1503';

  // Play ambient typing sounds or similar when auth mounts if you want
  useEffect(() => {
    // Any initial mount effects
  }, []);

  const filteredCommanders = activeFaction === 'ALL'
    ? COMMANDERS
    : COMMANDERS.filter(c => c.faction === activeFaction);

  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  // Ensure selected index is valid after faction change
  useEffect(() => {
    if (filteredCommanders.length > 0) {
      // Find the currently selected commander id
      const currentId = COMMANDERS[selectedCommanderIndex].id;
      // If that commander isn't in the new filtered list, reset to first
      const newIndexInFiltered = filteredCommanders.findIndex(c => c.id === currentId);
      if (newIndexInFiltered === -1) {
        const fallbackGlobalIndex = COMMANDERS.findIndex(c => c.id === filteredCommanders[0].id);
        setSelectedCommanderIndex(fallbackGlobalIndex >= 0 ? fallbackGlobalIndex : 0);
      }
    }
  }, [activeFaction]);

  const selectedCommander = COMMANDERS[selectedCommanderIndex];

  const handleSelectCommander = (index: number) => {
    if (index === selectedCommanderIndex || authState !== 'idle') return;
    audioService.playClick();
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedCommanderIndex(index);
      setIsTransitioning(false);
    }, 150); // half of transition duration
  };

  const handleScrollClick = (direction: 'left' | 'right') => {
    audioService.playClick();
    const container = document.querySelector('.operators-scroll-container');
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  // Passcode Keyboard Handling
  useEffect(() => {
    if (authState !== 'passcode' || isFadingOut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (passcode.length < 4) {
          audioService.playClick();
          setPasscode((prev) => prev + e.key);
          setIsError(false);
        }
      } else if (e.key === 'Backspace') {
        audioService.playClick();
        setPasscode((prev) => prev.slice(0, -1));
        setIsError(false);
      } else if (e.key === 'Escape') {
        audioService.playClick();
        setPasscode('');
        setAuthState('idle');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authState, passcode, isFadingOut]);

  // Evaluate Passcode Success/Fail
  useEffect(() => {
    if (authState === 'passcode' && passcode.length === 4) {
      if (passcode === SECRET.slice(0, 4)) {
        audioService.playTargetAcquired();
        setAuthState('authenticating');

        // Simulate progress
        const duration = 1800; // ms
        const startTime = Date.now();

        const animateProgress = () => {
          const now = Date.now();
          const elapsed = now - startTime;
          const progress = Math.min((elapsed / duration) * 100, 100);
          setAuthProgress(progress);

          if (elapsed < duration) {
            requestAnimationFrame(animateProgress);
          } else {
            setAuthState('confirmed');
            setTimeout(() => {
              setIsFadingOut(true);
              setTimeout(() => {
                onComplete();
              }, 800);
            }, 900);
          }
        };
        requestAnimationFrame(animateProgress);
      } else {
        // Failure
        audioService.playClick();
        setIsError(true);
        setTimeout(() => {
          setPasscode('');
          setIsError(false);
        }, 600);
      }
    }
  }, [passcode, authState, SECRET, onComplete]);

  return (
    <div className={`commander-auth-overlay ${isFadingOut ? 'hide' : ''}`}>
      <div
        className={`profile-terminal ${isFadingOut ? 'slide-up-hide' : ''}`}
        style={{ '--commander-accent': selectedCommander.accent } as React.CSSProperties}
      >
        <header className="terminal-header">
          <div className="header-left">ARGUS · COMMANDER SELECTION</div>
          <div className="header-faction-tabs">
            {FACTIONS.map(f => (
              <button
                key={f}
                className={activeFaction === f ? 'active' : ''}
                onClick={() => { audioService.playClick(); setActiveFaction(f); }}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="header-right">
            <div>CLEARANCE: {selectedCommander.clearance}</div>
            <div style={{ color: 'var(--commander-accent)', marginTop: '2px' }}>SESSION: ACTIVE</div>
          </div>
        </header>

        <div className="terminal-main">
          {/* Left info panel */}
          <div className={`commander-info-panel ${isTransitioning ? 'transition-out' : 'transition-in'}`}>
            <div className="faction-badge-container">
              <svg viewBox="0 0 100 100" className="hex-bg">
                <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" />
              </svg>
              <div className="faction-symbol" style={{ color: selectedCommander.accent }}>
                {selectedCommander.factionBadge}
              </div>
            </div>

            <h2 className="commander-callsign">{selectedCommander.callsign} <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginLeft: '8px' }}>// {selectedCommander.realName}</span></h2>
            <p className="commander-rank">{selectedCommander.rank}</p>

            <div className="thin-divider" />

            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">MISSIONS</div>
                <div className="stat-value">{selectedCommander.stats.missions}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">ACCURACY</div>
                <div className="stat-value">{selectedCommander.stats.accuracy}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">CLEARANCE</div>
                <div className="stat-value">{selectedCommander.stats.clearance}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">SPECIALIZATION</div>
                <div className="stat-value">{selectedCommander.specialization.toUpperCase()}</div>
              </div>
            </div>

            <div className="thin-divider" />

            <p className="commander-bio">{selectedCommander.bio}</p>

            <div className="authorize-button-container">
              <button
                className={`authorize-button ${authState === 'confirmed' ? 'confirmed' : ''}`}
                onClick={() => { if (authState === 'idle') { audioService.playClick(); setAuthState('passcode'); } }}
                disabled={authState !== 'idle'}
              >
                {authState === 'idle' && 'AUTHORIZE COMMANDER'}
                {authState === 'authenticating' && 'AUTHENTICATING...'}
                {authState === 'confirmed' && '✓ IDENTITY CONFIRMED'}
              </button>
            </div>
          </div>

          {/* Center commander figure */}
          <div className="commander-figure-area">
            <div className={`commander-figure-wrapper ${isTransitioning ? 'transition-out-pos' : 'transition-in-pos'}`}>
              {!imageError[selectedCommander.id] ? (
                <img
                  src={selectedCommander.portraitFull || selectedCommander.portrait}
                  alt={selectedCommander.callsign}
                  className="commander-figure"
                  onError={() => setImageError(prev => ({ ...prev, [selectedCommander.id]: true }))}
                />
              ) : (
                <div className="commander-silhouette">
                  <div className="silhouette-text">{selectedCommander.callsign}</div>
                </div>
              )}
            </div>

            <div 
              className={`ground-glow ${authState === 'confirmed' ? 'auth-flash' : ''}`}
            />
          </div>
        </div>

        {/* Bottom operator row */}
        <div className="operator-selector-row">
          <button className="scroll-arrow left" onClick={() => handleScrollClick('left')}>‹</button>

          <div className="operators-scroll-container">
            {filteredCommanders.map((commander) => {
              const globalIndex = COMMANDERS.findIndex(c => c.id === commander.id);
              const isSelected = globalIndex === selectedCommanderIndex;
              
              return (
                <div
                  key={commander.id}
                  className={`operator-thumb ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectCommander(globalIndex)}
                  style={{ '--accent': commander.accent } as React.CSSProperties}
                >
                  <div className="operator-thumb-img-wrapper">
                    {!imageError[commander.id + '_thumb'] ? (
                      <img
                        src={commander.portrait}
                        alt=""
                        className="operator-thumb-img"
                        onError={() => setImageError(prev => ({ ...prev, [commander.id + '_thumb']: true }))}
                      />
                    ) : (
                      <div className="operator-thumb-placeholder">{commander.callsign[0]}</div>
                    )}
                  </div>
                  <span className="operator-callsign">{commander.callsign}</span>
                  {isSelected && <div className="active-indicator" />}
                </div>
              );
            })}
          </div>

          <button className="scroll-arrow right" onClick={() => handleScrollClick('right')}>›</button>
        </div>
      </div>

      {/* FULL SCREEN PASSCODE POPUP */}
      {(authState === 'passcode' || authState === 'authenticating' || authState === 'confirmed') && (
        <div className="passcode-popup-overlay">
          <div className={`passcode-popup-modal ${isError ? 'shake' : ''}`} style={{ borderColor: isError ? '#ff3333' : 'var(--commander-accent)', boxShadow: isError ? '0 0 30px rgba(255, 51, 51, 0.4)' : '0 0 40px rgba(0,0,0,0.8)' }}>
            
            <div className="passcode-popup-header">
              <div className="popup-brand">ARGUS // AUTHENTICATION</div>
              {authState === 'passcode' && (
                <button className="popup-close-btn" onClick={() => { audioService.playClick(); setAuthState('idle'); setPasscode(''); }}>
                  ✕
                </button>
              )}
            </div>

            <div className="passcode-popup-content">
              {authState === 'passcode' && (
                <>
                  <div className="passcode-label-large">ENTER CLASSIFIED PIN</div>
                  <div className="passcode-dots-large">
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className={`passcode-dot-large ${passcode.length > index ? 'filled' : ''} ${isError ? 'error' : ''}`} />
                    ))}
                  </div>
                  {isError && <div className="passcode-error-text">ACCESS DENIED</div>}
                  {!isError && <div className="passcode-instruction">Awaiting keyboard input...</div>}
                </>
              )}

              {authState === 'authenticating' && (
                <div className="auth-processing-container">
                  <div className="passcode-label-large" style={{ color: '#00FF88' }}>VERIFYING CREDENTIALS...</div>
                  <div className="auth-progress-track">
                    <div className="auth-progress-fill" style={{ width: `${authProgress}%` }} />
                  </div>
                  <div className="auth-progress-percentage">{Math.round(authProgress)}%</div>
                </div>
              )}

              {authState === 'confirmed' && (
                <div className="auth-success-container">
                  <div className="success-icon">✓</div>
                  <div className="passcode-label-large" style={{ color: '#00FF88', textShadow: '0 0 10px #00FF88' }}>IDENTITY CONFIRMED</div>
                  <div className="success-subtext">Welcome, {selectedCommander.callsign}</div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
