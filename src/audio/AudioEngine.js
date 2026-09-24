// WebAudio context + master bus (gain → compressor). Unlocks on the first user gesture.

import { MASTER_VOLUME } from '../config/audio.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._pending = [];
    this._noise = null;
    const unlock = () => this.unlock();
    for (const type of ['keydown', 'pointerdown', 'touchstart']) {
      window.addEventListener(type, unlock, { once: true, passive: true });
    }
  }

  unlock() {
    if (this.ctx) return void this.ctx.resume?.();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.ratio.value = 4;
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    this.master.connect(compressor).connect(this.ctx.destination);
    for (const fn of this._pending) fn(this.ctx, this.master);
    this._pending.length = 0;
  }

  // Run fn(ctx, output) as soon as audio is available.
  onReady(fn) {
    if (this.ctx) fn(this.ctx, this.master);
    else this._pending.push(fn);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : MASTER_VOLUME, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  // Two seconds of white noise, shared by every noisy effect.
  noise() {
    if (!this._noise) {
      const len = this.ctx.sampleRate * 2;
      this._noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this._noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return this._noise;
  }
}
