import { useState, useEffect } from 'react';
import { audioService } from '../../services/audioService';

interface CommanderAuthProps {
  onComplete: () => void;
}

const COMMANDERS = [
  { id: '0', name: 'SYED ASIM MUNIR', rank: 'GENERAL', role: 'CHIEF OF ARMY STAFF (COAS)', img: '/person/commander.png' },
  { id: '1', name: 'SAHIR SHAMSHAD MIRZA', rank: 'GENERAL', role: 'CHAIRMAN JOINT CHIEFS OF STAFF', img: '/person/commander1.png' },
  { id: '2', name: 'NAUMAN ZAKARIA', rank: 'LIEUTENANT GENERAL', role: 'COMMANDER, I CORPS (STRIKE)', img: '/person/commander2.png' },
  { id: '3', name: 'SYED FAYYAZ H. SHAH', rank: 'LIEUTENANT GENERAL', role: 'COMMANDER, IV CORPS', img: '/person/commander3.png' },
  { id: '4', name: 'SYED IMDAD H. SHAH', rank: 'LIEUTENANT GENERAL', role: 'COMMANDER, XXX CORPS', img: '/person/commander4.png' },
  { id: '5', name: 'MUHAMMAD AQEEL', rank: 'LIEUTENANT GENERAL', role: 'COMMANDER, XXXI CORPS', img: '/person/commander5.png' },
  { id: '6', name: 'HASSAN KHATTAK', rank: 'LIEUTENANT GENERAL', role: 'OPERATIONAL/STAFF GHQ', img: '/person/commander6.png' },
  { id: '7', name: 'ARSHAD NASEEM', rank: 'LIEUTENANT GENERAL', role: 'SURGEON GENERAL', img: '/person/commander7.png' },
  { id: '8', name: 'AMIR NAJAM', rank: 'LIEUTENANT GENERAL', role: 'OPERATIONAL/STAFF GHQ', img: '/person/commander8.png' },
  { id: '9', name: 'AZHAR WAQAS', rank: 'LIEUTENANT GENERAL', role: 'OPERATIONAL/STAFF GHQ', img: '/person/commander9.png' }
];

export function CommanderAuth({ onComplete }: CommanderAuthProps) {
  const [step, setStep] = useState<'select' | 'profile' | 'passcode'>('select');
  const [selectedCommanderId, setSelectedCommanderId] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // We are expecting a 4-digit code now
  const SECRET = (import.meta as any).env.VITE_CLASSIFIED_PASSWORD || '1503';
  const PASSCODE_LENGTH = 4;

  const currentCommander = COMMANDERS.find(c => c.id === selectedCommanderId) || COMMANDERS[0];

  // Global key handler for passcode step
  useEffect(() => {
    if (step !== 'passcode' || isSuccess || isFadingOut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (passcode.length < PASSCODE_LENGTH) {
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
        setStep('profile'); // go back
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, passcode, isSuccess, isFadingOut]);

  // Auto-submit when length reached
  useEffect(() => {
    if (step === 'passcode' && passcode.length === PASSCODE_LENGTH) {
      if (passcode === SECRET.slice(0, PASSCODE_LENGTH)) {
        // Success
        audioService.playTargetAcquired();
        setIsSuccess(true);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(onComplete, 800);
        }, 800);
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
  }, [passcode, step, SECRET, onComplete]);

  const handleSelectCommander = (id: string) => {
    audioService.playClick();
    setSelectedCommanderId(id);
    setStep('profile');
  };

  const handleVerifyClick = () => {
    audioService.playClick();
    setStep('passcode');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isFadingOut ? 'transparent' : 'rgba(5, 8, 12, 0.85)',
        backdropFilter: isFadingOut ? 'blur(0px)' : 'blur(12px)',
        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isFadingOut ? 0 : 1,
        fontFamily: '"Orbitron", system-ui, sans-serif',
      }}
    >
      <div
        className={`auth-container ${isError ? 'shake-error' : ''}`}
        style={{
          width: '780px',
          background: 'radial-gradient(120% 120% at 50% 0%, rgba(16, 28, 44, 0.85) 0%, rgba(4, 8, 12, 0.95) 100%)',
          border: '1px solid rgba(0, 200, 255, 0.2)',
          borderRadius: '20px',
          boxShadow: '0 32px 128px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 40px rgba(0, 200, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(0, 200, 255, 0.1)',
          background: 'linear-gradient(90deg, rgba(0,200,255,0.05) 0%, transparent 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
        }}>
          <div>
            <div style={{ color: '#00C8FF', fontSize: '15px', letterSpacing: '0.3em', fontWeight: 600 }}>ARGUS / V4 PLATFORM</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', letterSpacing: '0.2em', marginTop: '4px' }}>
              {step === 'select' ? 'SECURE IDENTITY SELECTION' : 'COMMANDER PROFILE // SI-PK'}
            </div>
          </div>
          {step === 'profile' && (
             <button onClick={() => { audioService.playClick(); setStep('select'); }} style={{ background: 'none', border: '1px solid rgba(0, 200, 255, 0.3)', color: '#00C8FF', padding: '4px 12px', fontSize: '10px', cursor: 'pointer', fontFamily: 'Orbitron' }}>BACK</button>
          )}
          {step === 'select' && (
             <div style={{ display: 'flex', gap: '4px' }}>
               <div style={{ width: '4px', height: '12px', background: '#00C8FF', boxShadow: '0 0 8px #00C8FF' }} />
               <div style={{ width: '4px', height: '12px', background: '#00C8FF', opacity: 0.5 }} />
             </div>
          )}
        </div>

        {/* Dynamic Body */}
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: '440px' }}>
          
          {/* STEP 0: Selection View */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            padding: '24px',
            opacity: step === 'select' ? 1 : 0,
            pointerEvents: step === 'select' ? 'auto' : 'none',
            transform: step === 'select' ? 'scale(1)' : 'scale(0.95)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowY: 'auto'
          }}>
            {COMMANDERS.map(cmd => (
              <div
                key={cmd.id}
                onClick={() => handleSelectCommander(cmd.id)}
                className="commander-card"
                style={{
                  background: 'rgba(0, 200, 255, 0.03)',
                  border: '1px solid rgba(0, 200, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <img 
                  src={cmd.img} 
                  loading="lazy"
                  style={{ width: '48px', height: '48px', objectFit: 'cover', objectPosition: 'top', borderRadius: '50%', border: '1px solid rgba(0,200,255,0.3)' }} 
                />
                <div style={{ overflow: 'hidden' }}>
                    <div style={{ color: '#00C8FF', fontSize: '8px', letterSpacing: '0.1em', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{cmd.rank}</div>
                    <div style={{ color: '#fff', fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', marginTop: '2px' }}>{cmd.name}</div>
                </div>
              </div>
            ))}
          </div>

          {/* STEP 1: Profile View */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex',
            padding: '24px 24px 0 24px',
            opacity: step === 'profile' ? 1 : 0,
            pointerEvents: step === 'profile' ? 'auto' : 'none',
            transform: step === 'profile' ? 'scale(1)' : step === 'select' ? 'scale(1.05)' : 'scale(0.95)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            
            {/* Left Data Column */}
            <div style={{ flex: 1, zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px', paddingBottom: '24px' }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', letterSpacing: '0.2em', marginBottom: '8px' }}>TARGET IDENTITY</div>
                <div style={{ color: '#00C8FF', fontSize: '10px', letterSpacing: '0.1em' }}>RANK</div>
                <div style={{ color: '#fff', fontSize: '12px', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '8px' }}>{currentCommander.rank}</div>
                <div style={{ color: '#00C8FF', fontSize: '10px', letterSpacing: '0.1em' }}>NAME</div>
                <div style={{ color: '#fff', fontSize: '16px', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '8px', wordBreak: 'break-word' }}>{currentCommander.name}</div>
                <div style={{ color: '#00C8FF', fontSize: '10px', letterSpacing: '0.1em' }}>ROLE</div>
                <div style={{ color: '#fff', fontSize: '11px', letterSpacing: '0.1em' }}>{currentCommander.role}</div>
              </div>
            </div>

            {/* Center Image */}
            <div style={{ 
              width: '320px', 
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center'
            }}>
              {/* Futuristic glow behind image */}
              <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '180px', height: '180px',
                background: 'radial-gradient(circle, rgba(0,200,255,0.2) 0%, transparent 70%)',
                zIndex: 1,
                borderRadius: '50%'
              }} />
              <img 
                src={currentCommander.img} 
                alt="Commander" 
                loading="lazy"
                style={{ 
                  width: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain', 
                  objectPosition: 'bottom',
                  zIndex: 2,
                  filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.8))'
                }}
              />
            </div>

            {/* Right Data Column */}
            <div style={{ flex: 1, zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', textAlign: 'right', paddingBottom: '24px' }}>
              
              <div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', letterSpacing: '0.2em', marginBottom: '8px' }}>STRATNET UPLINK</div>
                <div style={{ color: '#0f0', fontSize: '11px', letterSpacing: '0.1em', fontFamily: 'monospace', marginBottom: '4px' }}>[ SECURE CONNECTION ]</div>
                <div style={{ color: '#00C8FF', fontSize: '10px', letterSpacing: '0.1em', fontFamily: 'monospace' }}>PING: 12ms</div>
                <div style={{ color: '#00C8FF', fontSize: '10px', letterSpacing: '0.1em', fontFamily: 'monospace', marginTop: '16px' }}>CLEARANCE: <span style={{ color: '#FFB800' }}>LEVEL 5</span></div>
              </div>

              {/* Verify Button */}
              <button 
                className="verify-btn"
                onClick={handleVerifyClick}
                style={{
                  background: 'rgba(0, 200, 255, 0.1)',
                  border: '1px solid currentColor',
                  color: '#00C8FF',
                  padding: '12px 24px',
                  fontFamily: '"Orbitron", sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.2em',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  boxShadow: '0 0 15px rgba(0,200,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>BIO-AUTH</span>
                <span style={{ fontSize: '16px' }}>»</span>
              </button>
            </div>
            
          </div>

          {/* STEP 2: Passcode Entry View */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: step === 'passcode' ? 1 : 0,
            pointerEvents: step === 'passcode' ? 'auto' : 'none',
            transform: step === 'passcode' ? 'scale(1)' : 'scale(1.05)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            background: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.6) 0%, transparent 100%)',
          }}>
            <div style={{
              color: isError ? '#f00' : (isSuccess ? '#0f0' : '#00C8FF'),
              fontSize: '14px', letterSpacing: '0.3em', marginBottom: '32px', fontWeight: 600,
              textShadow: isError ? '0 0 10px #f00' : (isSuccess ? '0 0 10px #0f0' : '0 0 10px #00C8FF')
            }}>
              {isSuccess ? 'AUTHORIZATION GRANTED' : isError ? 'ACCESS DENIED' : 'ENTER PASSCODE'}
            </div>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              {Array.from({ length: PASSCODE_LENGTH }).map((_, i) => (
                <div key={i} style={{
                  width: '60px', height: '80px',
                  background: 'rgba(0,0,0,0.8)',
                  border: `2px solid ${
                    isSuccess ? '#0f0' : 
                    isError ? '#f00' : 
                    (passcode[i] ? '#00C8FF' : 'rgba(0,200,255,0.2)')
                  }`,
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '36px', 
                  color: isSuccess ? '#0f0' : isError ? '#f00' : '#00C8FF',
                  boxShadow: passcode[i] && !isError && !isSuccess ? '0 0 20px rgba(0,200,255,0.3), inset 0 0 15px rgba(0,200,255,0.2)' : 'none',
                  transition: 'all 0.1s'
                }}>
                  {passcode[i] ? '•' : ''}
                </div>
              ))}
            </div>

            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginTop: '32px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
              USE KEYBOARD TO ENTER SECURE PASSCODE // ESC TO ABORT
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
            20%, 40%, 60%, 80% { transform: translateX(8px); }
          }
          .shake-error {
            animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
            border-color: rgba(255, 0, 0, 0.5) !important;
            box-shadow: 0 0 30px rgba(255, 0, 0, 0.2), inset 0 0 20px rgba(255, 0, 0, 0.1) !important;
          }
          .verify-btn:hover {
            background: rgba(0, 200, 255, 0.2) !important;
            box-shadow: 0 0 25px rgba(0, 200, 255, 0.3) !important;
            transform: scale(1.02);
          }
          .commander-card:hover {
            background: rgba(0, 200, 255, 0.1) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 24px rgba(0, 200, 255, 0.15) !important;
          }
        `}
      </style>
    </div>
  );
}
