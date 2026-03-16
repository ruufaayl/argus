// ============================================================
// ModeToggle — PIN protected access to Classified Mode
// 4-digit PIN: 1503
// 3 attempt lockout (30 seconds)
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useCityStore } from '../../stores/cityStore';
import './ModeToggle.css';

const CORRECT_PIN = '1503';
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 30000;

export function ModeToggle() {
  const isClassifiedMode = useCityStore((s) => s.isClassifiedMode);
  const toggleMode = useCityStore((s) => s.toggleMode);
  
  const [isOpen, setIsOpen] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);
  const [error, setError] = useState(false);
  
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Handle countdown during lockout
  useEffect(() => {
    let iv: NodeJS.Timeout;
    if (isLocked && lockTimeLeft > 0) {
      iv = setInterval(() => setLockTimeLeft(t => t - 1), 1000);
    } else if (isLocked && lockTimeLeft <= 0) {
      setIsLocked(false);
      setAttempts(0);
      setError(false);
    }
    return () => clearInterval(iv);
  }, [isLocked, lockTimeLeft]);

  // Handle classification toggle click
  const handleToggleClick = () => {
    if (isClassifiedMode) {
      // Free exit from classified mode
      toggleMode();
    } else {
      // Require PIN to enter
      if (!isLocked) {
        setIsOpen(true);
        setTimeout(() => inputRefs[0].current?.focus(), 50);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const newPin = [...pin];
      if (pin[index] === '' && index > 0) {
        // move back and clear
        newPin[index - 1] = '';
        setPin(newPin);
        inputRefs[index - 1].current?.focus();
      } else {
        newPin[index] = '';
        setPin(newPin);
      }
      setError(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setPin(['', '', '', '']);
    }
  };

  const handleChange = (index: number, val: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(val)) return;
    
    // Take just the last entered char in case of paste/fast typing
    const char = val.slice(-1);
    const newPin = [...pin];
    newPin[index] = char;
    setPin(newPin);
    setError(false);

    // Auto advance
    if (char && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Check complete
    if (char && index === 3) {
      const finalPin = newPin.join('');
      if (finalPin === CORRECT_PIN) {
        // Success
        setIsOpen(false);
        setPin(['', '', '', '']);
        setAttempts(0);
        toggleMode();
      } else {
        // Failure
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(true);
        setPin(['', '', '', '']);
        inputRefs[0].current?.focus();
        
        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLocked(true);
          setLockTimeLeft(LOCKOUT_MS / 1000);
          setIsOpen(false);
        }
      }
    }
  };

  return (
    <div className="mode-toggle">
      <button 
        className={`mode-badge ${isClassifiedMode ? 'mode-badge--classified' : 'mode-badge--public'} ${isLocked ? 'mode-badge--locked' : ''}`}
        onClick={handleToggleClick}
        disabled={isLocked}
      >
        <div className="mode-badge__dot"></div>
        {isLocked 
          ? `LOCKOUT (${lockTimeLeft}s)`
          : isClassifiedMode 
            ? 'RESTRICTED' 
            : 'PUBLIC'
        }
      </button>

      {isOpen && !isClassifiedMode && (
        <div className="pin-overlay">
          <div className={`pin-modal ${error ? 'pin-modal--error' : ''}`}>
            <div className="pin-modal__header">
              AUTHORIZATION REQUIRED
              <button 
                className="pin-modal__close" 
                onClick={() => { setIsOpen(false); setPin(['', '', '', '']); }}
              >✕</button>
            </div>
            
            <div className="pin-modal__body">
              <div className="pin-modal__desc">Enter operator passcode to access classified systems</div>
              
              <div className="pin-inputs">
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    ref={inputRefs[i]}
                    className="pin-input"
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                  />
                ))}
              </div>

              {error && (
                <div className="pin-modal__error-msg">
                  INVALID CREDENTIALS ({MAX_ATTEMPTS - attempts} ATTEMPTS REMAINING)
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
