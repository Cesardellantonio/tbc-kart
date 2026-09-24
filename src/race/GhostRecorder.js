// Records the lap in progress as flat [time, x, z, yaw] samples so a best lap can become a ghost.

import { GHOST_STEP } from '../config/race.js';

const r = (v, d) => Math.round(v * d) / d;

export class GhostRecorder {
  constructor() {
    this.reset();
  }

  reset() {
    this.lap = -1;
    this.frames = [];
    this._next = 0;
  }

  // Starts a fresh recording whenever the lap number changes.
  update(lap, lapTime, s) {
    if (lap !== this.lap) [this.lap, this.frames, this._next] = [lap, [], 0];
    if (lap < 1 || lapTime < this._next) return;
    this.frames.push(r(lapTime, 1000), r(s.x, 100), r(s.z, 100), r(s.yaw, 1000));
    this._next = Math.max(this._next + GHOST_STEP, lapTime - GHOST_STEP); // steady rate, no drift
  }

  // The lap just completed (call from the 'lap' event, before the next update()).
  take() {
    return this.frames.length >= 8 ? this.frames.slice() : null;
  }
}
