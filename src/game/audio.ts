/**
 * Procedural Web Audio sound engine for Nour Al-Maghrib:
 * - Soft ambient courtyard night breeze + distant fountain murmur
 * - Modal Hijaz/Andalusian oud-like plucked chime on interactions & mission clear
 * - Subtle zellige tile footsteps synced to distance walked
 */

class MoroccanAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private enabled = true;
  private ambienceStarted = false;

  private ensureContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.42;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(enabled ? 0.42 : 0, this.ctx.currentTime, 0.08);
    }
  }

  public startAmbience() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.ambienceStarted) return;
    this.ambienceStarted = true;

    // Gentle filtered pink-ish noise simulating the octagonal marble fountain water
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2) * 0.16;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 680;
    filter.Q.value = 0.7;

    this.ambienceGain = ctx.createGain();
    this.ambienceGain.gain.value = 0.14;

    noise.connect(filter);
    filter.connect(this.ambienceGain);
    this.ambienceGain.connect(this.masterGain);
    noise.start();
  }

  public playUiTick() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520 + Math.random() * 45, now);
    osc.frequency.exponentialRampToValueAtTime(290, now + 0.06);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playFootstep() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const baseFreq = 115 + (Math.random() - 0.5) * 22;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.07);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playObjectiveChime() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    // Hijaz-inspired warm plucked notes (D4, Eb4, F#4, A4)
    const freqs = [293.66, 369.99, 440.0, 587.33];
    freqs.forEach((f, idx) => {
      const start = now + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.14, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.65);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.7);
    });
  }

  public playMissionFanfare() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const freqs = [293.66, 369.99, 440.0, 587.33, 739.99];
    freqs.forEach((f, idx) => {
      const start = now + idx * 0.11;
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      overtone.type = 'sine';
      osc.frequency.setValueAtTime(f, start);
      overtone.frequency.setValueAtTime(f * 2, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.15);
      osc.connect(gain);
      overtone.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      overtone.start(start);
      osc.stop(start + 1.2);
      overtone.stop(start + 1.2);
    });
  }
}

export const moroccanAudio = new MoroccanAudioEngine();
