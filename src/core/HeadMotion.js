// Cockpit head motion: the driver's head is a small damped spring pushed around by g-forces — it sways
// to the outside of a corner and tilts with it, surges forward and nods under braking (back and up
// on the throttle), and the eyes look a little into the corner with the steering.

import { HEAD } from '../config/camera.js';
import { clamp, forwardFromYaw, rightFromYaw } from './math.js';

const KEYS = ['sway', 'surge', 'nod', 'roll', 'look'];

export class HeadMotion {
  constructor() {
    this.x = {};
    this.v = {};
    this.reset();
  }

  reset() {
    for (const k of KEYS) this.x[k] = this.v[k] = 0;
  }

  _spring(key, target, dt) {
    const a = HEAD.stiffness * (target - this.x[key]) - HEAD.damping * this.v[key];
    this.v[key] += a * dt; // semi-implicit Euler: stable for dt ≤ 0.05 at these rates
    this.x[key] += this.v[key] * dt;
    return this.x[key];
  }

  // Moves target.pos / target.look (from cameraModes.followTarget) and sets target.roll (rad).
  apply(state, tel, dt, lookAhead, lookHeight, target) {
    const g = HEAD.gClamp;
    const lat = clamp(tel.latAccel || 0, -g, g); // + = accelerating to the left (turning left)
    const lon = clamp(tel.longAccel || 0, -g, g); // + = speeding up
    const pace = clamp((tel.speed || 0) / 6, 0, 1);
    if (dt > 0) {
      const h = Math.min(dt, 0.05);
      this._spring('sway', clamp(lat * HEAD.sway, -HEAD.swayMax, HEAD.swayMax), h);
      this._spring('surge', clamp(-lon * HEAD.surge, -HEAD.surgeMax, HEAD.surgeMax), h);
      this._spring('nod', clamp(lon * HEAD.nod, -HEAD.nodMax, HEAD.nodMax), h);
      this._spring('roll', clamp(-lat * HEAD.roll, -HEAD.rollMax, HEAD.rollMax), h);
      this._spring('look', clamp(tel.steer || 0, -1, 1) * HEAD.lookInto * pace, h);
    }
    const { sway, surge, nod, roll, look } = this.x;
    const f = forwardFromYaw(state.yaw);
    const r = rightFromYaw(state.yaw);
    const p = target.pos;
    p.x += r.x * sway + f.x * surge;
    p.z += r.z * sway + f.z * surge;
    p.y -= Math.max(0, surge) * 0.4; // head dips as it pitches forward
    const aim = forwardFromYaw(state.yaw + look);
    target.look.set(p.x + aim.x * lookAhead, lookHeight + nod, p.z + aim.z * lookAhead);
    target.roll = roll;
    return target;
  }
}
