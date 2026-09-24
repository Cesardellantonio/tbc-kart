// Translucent replay of the best lap, interpolated from GhostRecorder samples by lap time.

import { KartModel } from './KartModel.js';
import { wrapAngle } from '../core/math.js';

export class Ghost {
  constructor() {
    this.model = new KartModel({ ghost: true });
    this.frames = null;
    this.object3d.visible = false;
    this._i = 0;
    this._state = { x: 0, z: 0, yaw: 0, steer: 0 };
    this._tel = { forwardSpeed: 0, latAccel: 0, longAccel: 0 };
  }

  get object3d() {
    return this.model.root;
  }

  set(frames) {
    this.frames = frames && frames.length >= 8 ? frames : null;
    this._i = 0;
  }

  // lapTime: seconds into the current lap; active: show it at all (time attack, lap under way).
  update(lapTime, active, dt) {
    const f = this.frames;
    const count = f ? f.length / 4 : 0;
    const show = active && count > 1 && lapTime <= f[(count - 1) * 4];
    this.object3d.visible = show;
    if (!show) return void (this._i = 0);
    if (lapTime < f[this._i * 4]) this._i = 0;
    while (this._i < count - 2 && f[(this._i + 1) * 4] <= lapTime) this._i++;
    const o = this._i * 4;
    const u = Math.min(1, Math.max(0, (lapTime - f[o]) / (f[o + 4] - f[o] || 1)));
    const s = this._state;
    const [px, pz] = [s.x, s.z];
    s.x = f[o + 1] + (f[o + 5] - f[o + 1]) * u;
    s.z = f[o + 2] + (f[o + 6] - f[o + 2]) * u;
    s.yaw = f[o + 3] + wrapAngle(f[o + 7] - f[o + 3]) * u;
    this._tel.forwardSpeed = dt > 0 ? Math.min(25, Math.hypot(s.x - px, s.z - pz) / dt) : 0;
    this.model.update(s, this._tel, dt);
  }
}
