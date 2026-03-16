// ============================================================
// audioService.ts — Argus Tactical Audio Engine (V3.0)
// COD Warzone-inspired military procedural audio
// 8 distinct tactical sounds, Web Audio API synthesized
// ============================================================

class ArgusAudio {
  private ctx: AudioContext | null = null;
  private masterBus: GainNode | null = null;

  private init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterBus = this.ctx.createGain();
    this.masterBus.gain.value = 0.18;
    this.masterBus.connect(this.ctx.destination);
  }

  // ─── 1. Tactical UI Click (sharp filtered noise burst, 20ms) ─────────────
  public playClick() {
    this.init();
    if (!this.ctx || !this.masterBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.02);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 5200;
    filter.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterBus);
    source.start(now);
    source.stop(now + 0.02);
  }

  // ─── 2. Radar Sweep (single low chirp, on new flight detection) ───────────
  public playRadarSweep() {
    this.init();
    if (!this.ctx || !this.masterBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.masterBus);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // ─── 3. Radar Lock-On (dual ascending military tone) ─────────────────────
  public playLockOn() {
    this.init();
    if (!this.ctx || !this.masterBus) return;
    const ctx = this.ctx;
    const masterBus = this.masterBus;
    const now = ctx.currentTime;

    [1200, 1600].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.05, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.09);
      osc.connect(gain);
      gain.connect(masterBus);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.1);
    });
  }

  // ─── 4. Target Acquired (triple ascending ping) ───────────────────────────
  public playTargetAcquired() {
    this.init();
    if (!this.ctx || !this.masterBus) return;
    const ctx = this.ctx;
    const masterBus = this.masterBus;
    const now = ctx.currentTime;

    [900, 1200, 1600].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.08, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.12);
      osc.connect(gain);
      gain.connect(masterBus);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.14);
    });
  }

  // ─── 5. Proximity Alert (rising urgent tri-tone, like COD proximity mine) ─
  public playProximityAlert() {
    this.init();
    if (!this.ctx || !this.masterBus) return;
    const ctx = this.ctx;
    const masterBus = this.masterBus;
    const now = ctx.currentTime;

    [700, 900, 1100, 1400].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.04 + i * 0.01, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.05);
      osc.connect(gain);
      gain.connect(masterBus);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.06);
    });
  }

  // ─── 6. Critical Alert (deep bass + high stab, like COD kill alert) ───────
  public playCriticalAlert() {
    this.init();
    if (!this.ctx || !this.masterBus) return;
    const ctx = this.ctx;
    const masterBus = this.masterBus;
    const now = ctx.currentTime;

    // Deep bass thud
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(60, now);
    bassOsc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    bassGain.gain.setValueAtTime(0.25, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    bassOsc.connect(bassGain);
    bassGain.connect(masterBus);
    bassOsc.start(now);
    bassOsc.stop(now + 0.16);

    // High piercing stab
    [2400, 2800].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + 0.05 + i * 0.06);
      gain.gain.setValueAtTime(0.04, now + 0.05 + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05 + i * 0.06 + 0.05);
      osc.connect(gain);
      gain.connect(masterBus);
      osc.start(now + 0.05 + i * 0.06);
      osc.stop(now + 0.05 + i * 0.06 + 0.06);
    });
  }

  // ─── 7. Data Uplink (descending electronic tones, intel feed ready) ───────
  public playDataUplink() {
    this.init();
    if (!this.ctx || !this.masterBus) return;
    const ctx = this.ctx;
    const masterBus = this.masterBus;
    const now = ctx.currentTime;

    [2000, 1600, 1200, 800].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.05, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.06);
      osc.connect(gain);
      gain.connect(masterBus);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.07);
    });
  }

  // ─── 8. System Boot (6 ascending tones — played on app load / panel open) ─
  public playSystemBoot() {
    this.init();
    if (!this.ctx || !this.masterBus) return;
    const ctx = this.ctx;
    const masterBus = this.masterBus;
    const now = ctx.currentTime;

    [200, 320, 440, 560, 720, 960].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.06, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.09);
      osc.connect(gain);
      gain.connect(masterBus);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.1);
    });
  }

  // ─── 9. Panel Open (soft click + subtle tone) ─────────────────────────────
  public playPanelOpen() {
    this.init();
    if (!this.ctx || !this.masterBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.06);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.masterBus);
    osc.start(now);
    osc.stop(now + 0.13);
  }
}

export const audioService = new ArgusAudio();
