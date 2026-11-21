// Emberfox — audio.js: synthesized sound, no audio files.
//
// Everything is a WebAudio oscillator or filtered noise burst, built
// when the player first interacts (browsers block audio before a
// gesture). Footsteps patter softly, a spotted guard stings, a gem
// chimes, a caught fox buzzes low, and clearing a level plays a small
// rising arpeggio. M toggles mute.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.lastStepAt = 0;
  }

  // Call from any user gesture; safe to call repeatedly.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  tone(freq, seconds, type = 'sine', volume = 0.2, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const start = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  // A short burst of filtered noise: footsteps and the coin clink.
  noiseBurst(seconds, volume, cutoff, delay = 0) {
    if (!this.ctx || this.muted) return;
    const start = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(start);
  }

  step(sneaking) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (now - this.lastStepAt < 90) return;
    this.lastStepAt = now;
    this.noiseBurst(0.05, sneaking ? 0.05 : 0.12, sneaking ? 500 : 900);
  }

  coin() {
    this.noiseBurst(0.07, 0.25, 5200);
    this.tone(2093, 0.12, 'triangle', 0.12, null, 0.03);
  }

  gem() {
    this.tone(880, 0.12, 'sine', 0.18);
    this.tone(1318, 0.18, 'sine', 0.16, null, 0.07);
  }

  alarm() {
    this.tone(220, 0.22, 'sawtooth', 0.16, 330);
    this.tone(330, 0.22, 'sawtooth', 0.14, 440, 0.14);
  }

  caught() {
    this.tone(160, 0.5, 'sawtooth', 0.2, 55);
  }

  levelClear() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.16, null, i * 0.09));
  }

  gameWin() {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.15, null, i * 0.1));
  }
}
