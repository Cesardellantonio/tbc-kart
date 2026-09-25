// Attract-mode driver for the title screen: pure-pursuit steering along the centreline, speed from
// the same braking plan the rivals use (race/speedPlan.js).

import { AUTOPILOT } from '../config/race.js';
import { speedControl } from './speedControl.js';
import { pursuitSteer } from './pursuit.js';
import { drivingPlan, plannedSpeed } from './speedPlan.js';

export class Autopilot {
  constructor(path) {
    this.setPath(path);
  }

  setPath(path) {
    this.path = path;
    this.index = -1;
    this.plan = path && drivingPlan(path, new Float32Array(path.count)); // along the centreline
  }

  // maxSpeed caps the pace (the cool-down lap after the flag).
  controls(state, speed, maxSpeed = AUTOPILOT.maxSpeed) {
    const p = this.path;
    this.index = p.nearest(state.x, state.z, this.index);
    const target = p.wrap(this.index + Math.round((AUTOPILOT.lookAhead + speed * AUTOPILOT.lookSpeed) / p.spacing));
    const want = plannedSpeed(this.plan, p, this.index, speed, { ahead: AUTOPILOT.planAhead, maxSpeed });
    const steer = pursuitSteer(state, { x: p.x[target], z: p.z[target] }, speed);
    return { ...speedControl(speed, want, steer, state.slipAngle), steer, handbrake: false };
  }
}
