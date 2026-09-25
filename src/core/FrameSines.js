// A few sines at multiples of one frequency, sampled once per frame without aliasing (pure). A sine
// above half the frame rate folds down when sampled per frame — at 30 fps a 27 Hz kerb rib reads as
// a 3 Hz wobble — so each partial's frequency is capped at VIBE.nyquist × a smoothed frame rate and
// advances its own phase. Below the cap it is the exact sine.

import { VIBE } from '../config/camera.js';

const TAU = Math.PI * 2;

export class FrameSines {
  // mults: frequency multiple of each partial; offsets: its phase offset (rad).
  constructor(mults, offsets = mults.map(() => 0), cfg = VIBE) {
    this.mults = mults;
    this.offsets = offsets;
    this.cfg = cfg;
    this.fps = 60; // smoothed frame rate
    this.phase = mults.map(() => 0);
    this.value = mults.map(() => 0); // sin of each partial, -1..1
  }

  // hz: fundamental; dt: this frame's step (s). Returns this.value.
  update(hz, dt) {
    if (!(dt > 0)) return this.value;
    this.fps += (1 / dt - this.fps) * this.cfg.fpsSmoothing;
    const cap = this.cfg.nyquist * this.fps;
    for (let i = 0; i < this.mults.length; i++) {
      this.phase[i] = (this.phase[i] + Math.min(hz * this.mults[i], cap) * dt * TAU) % TAU;
      this.value[i] = Math.sin(this.phase[i] + this.offsets[i]);
    }
    return this.value;
  }
}
