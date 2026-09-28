// Race replay recording (pure): every kart's pose and what its model, effects and engine need, sampled
// at REPLAY.rate Hz from the start lights to when you watch, plus the start gantry's lights. Sampled back
// with linear interpolation (angles the short way round).

import { REPLAY } from '../config/race.js';
import { wrapAngle } from '../core/math.js';

// Per kart per frame. yaw (index 2) interpolates as an angle.
export const FIELDS = ['x', 'z', 'yaw', 'steer', 'vx', 'vz', 'forwardSpeed', 'latAccel', 'longAccel', 'throttle', 'brake', 'slip', 'rpm'];
const K = FIELDS.length;
const LIGHT_MODES = ['off', 'red', 'go'];

export class ReplayRecorder {
  constructor(rate = REPLAY.rate, maxSeconds = REPLAY.maxSeconds) {
    this.step = 1 / rate;
    this.maxFrames = Math.ceil(maxSeconds * rate);
    this.reset(0);
  }

  // karts: how many karts each frame holds (fixed for a recording).
  reset(karts) {
    this.karts = karts;
    this.stride = 3 + karts * K; // time, lights, light mode, then the karts
    this.data = new Float32Array(Math.max(1, this.stride * 64));
    this.frames = 0;
    this.time = 0;
    this._next = 0;
  }

  get duration() {
    return this.frames ? this.data[(this.frames - 1) * this.stride] : 0;
  }

  // Advance the recording clock by dt and store a frame when one is due. karts: [{ state, telemetry }].
  record(dt, karts, lights = 0, lightsMode = 'off') {
    this.time += dt;
    if (this.time < this._next || this.frames >= this.maxFrames || karts.length !== this.karts) return false;
    this._next = Math.max(this._next + this.step, this.time - this.step);
    if ((this.frames + 1) * this.stride > this.data.length) {
      const grown = new Float32Array(this.data.length * 2);
      grown.set(this.data);
      this.data = grown;
    }
    const o = this.frames * this.stride;
    const d = this.data;
    d[o] = this.time;
    d[o + 1] = lights;
    d[o + 2] = Math.max(0, LIGHT_MODES.indexOf(lightsMode));
    karts.forEach(({ state: s, telemetry: t }, k) => {
      const b = o + 3 + k * K;
      [d[b], d[b + 1], d[b + 2], d[b + 3], d[b + 4], d[b + 5]] = [s.x, s.z, s.yaw, s.steer ?? 0, s.vx ?? 0, s.vz ?? 0];
      [d[b + 6], d[b + 7], d[b + 8], d[b + 9], d[b + 10], d[b + 11], d[b + 12]] = [
        t.forwardSpeed ?? 0, t.latAccel ?? 0, t.longAccel ?? 0, t.throttle ?? 0, t.brake ?? 0, t.slip ?? 0, t.rpm ?? 0,
      ];
    });
    this.frames++;
    return true;
  }

  // Frame index at or before time t (binary search).
  frameAt(t) {
    let [lo, hi] = [0, this.frames - 1];
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.data[mid * this.stride] <= t) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  // Kart k at time t into out (an object with the FIELDS keys). Returns out.
  sample(t, k, out = {}) {
    if (!this.frames) return out;
    const i = this.frameAt(t);
    const j = Math.min(i + 1, this.frames - 1);
    const [a, b] = [i * this.stride, j * this.stride];
    const span = this.data[b] - this.data[a];
    const u = span > 0 ? Math.min(1, Math.max(0, (t - this.data[a]) / span)) : 0;
    const [pa, pb] = [a + 3 + k * K, b + 3 + k * K];
    for (let f = 0; f < K; f++) {
      const [va, vb] = [this.data[pa + f], this.data[pb + f]];
      out[FIELDS[f]] = f === 2 ? va + wrapAngle(vb - va) * u : va + (vb - va) * u;
    }
    return out;
  }

  // The start gantry at time t: { lights, lightsMode }.
  lightsAt(t) {
    const o = this.frameAt(t) * this.stride;
    return { lights: this.data[o + 1], lightsMode: LIGHT_MODES[this.data[o + 2]] ?? 'off' };
  }
}
