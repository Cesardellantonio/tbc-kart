// WebAudio context + master bus (gain → compressor). Unlocks on the first user gesture, and goes
// quiet and suspends while the page is hidden: no frames run then, so every continuous voice
// (engines, tyres, kerb rumble) would otherwise hold its last level forever.

import { MASTER_VOLUME, LIFECYCLE } from '../config/audio.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.hidden = globalThis.document?.hidden ?? false;
    this._pending = [];
    this._noise = null;
    this._suspendTimer = 0;
    const unlock = () => this.unlock();
    for (const type of ['keydown', 'pointerdown', 'touchstart']) {
      window.addEventListener(type, unlock, { once: true, passive: true });
    }
    globalThis.document?.addEventListener('visibilitychange', () => this.setHidden(document.hidden));
  }

  unlock() {
    if (this.ctx) return void (this.hidden || this.ctx.resume?.());
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.ratio.value = 4;
    this.master = this.ctx.createGain();
    this.master.gain.value = this._level();
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
    if (this.master) this.master.gain.setTargetAtTime(this._level(), this.ctx.currentTime, 0.05);
    return this.muted;
  }

  // Page hidden: fade the master out, then suspend the context (a clean stop, no click). Shown
  // again: resume and fade back in — the voices pick up where the frozen race left them.
  setHidden(hidden) {
    this.hidden = hidden;
    if (!this.ctx) return;
    clearTimeout(this._suspendTimer);
    this.master.gain.setTargetAtTime(this._level(), this.ctx.currentTime, LIFECYCLE.fade);
    if (hidden) this._suspendTimer = setTimeout(() => this.hidden && this.ctx.suspend?.(), LIFECYCLE.suspendMs);
    else this.ctx.resume?.();
  }

  _level() {
    return this.muted || this.hidden ? 0 : MASTER_VOLUME;
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
