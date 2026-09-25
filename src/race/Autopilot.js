// Attract-mode driver for the title screen: pure-pursuit steering, speed from upcoming curvature.

import { AUTOPILOT } from '../config/race.js';
import { clamp } from '../core/math.js';
import { speedControl } from './speedControl.js';
import { pursuitSteer } from './pursuit.js';

export class Autopilot {
  constructor(path) {
    this.setPath(path);
  }

  setPath(path) {
    this.path = path;
    this.index = -1;
  }

  // maxSpeed caps the pace (the cool-down lap after the flag).
  controls(state, speed, maxSpeed = AUTOPILOT.maxSpeed) {
    const p = this.path;
    this.index = p.nearest(state.x, state.z, this.index);
    const target = p.wrap(this.index + Math.round((AUTOPILOT.lookAhead + speed * AUTOPILOT.lookSpeed) / p.spacing));

    // Slow down for the tightest curvature within braking range.
    let k = 0;
    const span = Math.round((8 + speed * 1.4) / p.spacing);
    for (let d = 0; d < span; d += 3) k = Math.max(k, Math.abs(p.curvature[p.wrap(this.index + d)]));
    const cornerSpeed = Math.sqrt(AUTOPILOT.latAccel / Math.max(k, 1e-4));
    const want = clamp(cornerSpeed, Math.min(AUTOPILOT.minSpeed, maxSpeed), maxSpeed);
    return {
      ...speedControl(speed, want),
      steer: pursuitSteer(state, { x: p.x[target], z: p.z[target] }, speed),
      handbrake: false,
    };
  }
}
