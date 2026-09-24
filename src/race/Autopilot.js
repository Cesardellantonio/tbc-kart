// Attract-mode driver for the title screen: pure-pursuit steering, speed from upcoming curvature.

import { AUTOPILOT } from '../config/race.js';
import { clamp, wrapAngle, yawFromDirection } from '../core/math.js';

export class Autopilot {
  constructor(path) {
    this.path = path;
    this.index = -1;
  }

  controls(state, speed) {
    const p = this.path;
    this.index = p.nearest(state.x, state.z, this.index);
    const target = p.wrap(this.index + Math.round((AUTOPILOT.lookAhead + speed * 0.3) / p.spacing));
    const heading = yawFromDirection(p.x[target] - state.x, p.z[target] - state.z);
    const error = wrapAngle(heading - state.yaw);

    // Slow down for the tightest curvature within braking range.
    let k = 0;
    const span = Math.round((8 + speed * 1.4) / p.spacing);
    for (let d = 0; d < span; d += 3) k = Math.max(k, Math.abs(p.curvature[p.wrap(this.index + d)]));
    const cornerSpeed = Math.sqrt(AUTOPILOT.latAccel / Math.max(k, 1e-4));
    const want = clamp(cornerSpeed, AUTOPILOT.minSpeed, AUTOPILOT.maxSpeed);
    return {
      throttle: speed < want ? 1 : 0,
      brake: speed > want + 1.2 ? 1 : 0,
      steer: clamp(error * 2.4, -1, 1),
      handbrake: false,
    };
  }
}
