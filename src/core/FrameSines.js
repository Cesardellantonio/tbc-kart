// A few sines at multiples of one frequency, sampled once per frame without aliasing (pure). A sine
// above half the frame rate folds down when sampled per frame — at 30 fps a 27 Hz kerb rib reads as
// a 3 Hz wobble — so each partial's frequency is capped at its own share (`ceil`) of a smoothed frame
// rate and advances its own phase. Below the cap it is the exact sine.
// Give partials that are summed together distinct ceilings, in the same order as their multiples: then
// they never collapse onto one frequency (where their sum's strength would hang on a leftover phase
// difference). Ceilings that aren't simple fractions keep a capped partial from repeating every few frames.

import { VIBE } from '../config/camera.js';

const TAU = Math.PI * 2;

export class FrameSines {
  // mults: frequency multiple of each partial; offsets: its phase offset (rad);
  // ceil: highest frequency of each partial as a share of the frame rate (all ≤ ~0.4).
  constructor(mults, offsets = mults.map(() => 0), ceil = mults.map(() => VIBE.nyquist), cfg = VIBE) {
    this.mults = mults;
    this.offsets = offsets;
    this.ceil = ceil;
    this.cfg = cfg;
    this.fps = 60; // smoothed frame rate
    this.phase = mults.map(() => 0);
    this.hz = mults.map(() => 0); // frequency each partial ran at last frame
    this.value = mults.map(() => 0); // sin of each partial, -1..1
  }

  // hz: fundamental; dt: this frame's step (s). Returns this.value.
  update(hz, dt) {
    if (!(dt > 0)) return this.value;
    this.fps += (1 / dt - this.fps) * this.cfg.fpsSmoothing;
    for (let i = 0; i < this.mults.length; i++) {
      this.hz[i] = Math.min(hz * this.mults[i], this.ceil[i] * this.fps);
      this.phase[i] = (this.phase[i] + this.hz[i] * dt * TAU) % TAU;
      this.value[i] = Math.sin(this.phase[i] + this.offsets[i]);
    }
    return this.value;
  }
}
