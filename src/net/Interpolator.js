// One remote kart's recent snapshots → its state at any render time. Snapshots are stamped with the
// host-clock time they were sampled (t); the game draws remote karts INTERP_DELAY in the past, so
// there is nearly always a snapshot either side to blend between. Past the newest one the kart
// coasts on its velocity and yaw rate for up to EXTRAPOLATE_MAX, then freezes where it got to (stale;
// so is a render time older than the oldest snapshot, which just holds that one).
// How far in the past adapts per kart: a kart whose snapshots arrive old (relayed through the host,
// or on a slow link) is drawn further back, so it still has a snapshot either side.
//   interp.push({ t, s, c, i, p, lap }, receivedAt) · interp.delay (s) ·
//   interp.sample(time) → { s, c, i, p, lap, stale } | null

import { wrapAngle, lerp } from '../core/math.js';
import {
  INTERP_BUFFER,
  EXTRAPOLATE_MAX,
  INTERP_DELAY,
  INTERP_MARGIN,
  AGE_SMOOTHING,
} from '../config/net.js';

const YAW = 2; // s: [x, z, yaw, vx, vz, steer, yawRate, slipAngle]

export class Interpolator {
  constructor({ size = INTERP_BUFFER, extrapolate = EXTRAPOLATE_MAX } = {}) {
    this.size = size;
    this.extrapolate = extrapolate;
    this.snaps = []; // oldest first
    this.age = null; // s: how old snapshots typically are when they arrive (host clock)
  }

  // How far behind the host clock to draw this kart.
  get delay() {
    return Math.max(INTERP_DELAY, (this.age ?? 0) + INTERP_MARGIN);
  }

  get newest() {
    return this.snaps[this.snaps.length - 1] ?? null;
  }

  // Late (or repeated) snapshots are ignored: the buffer only moves forward in time.
  push(snap, receivedAt = snap.t) {
    if (this.newest && snap.t <= this.newest.t) return false;
    const age = receivedAt - snap.t;
    this.age = this.age === null ? age : this.age + (age - this.age) * AGE_SMOOTHING;
    this.snaps.push(snap);
    if (this.snaps.length > this.size) this.snaps.shift();
    return true;
  }

  sample(time) {
    const { snaps } = this;
    if (!snaps.length) return null;
    if (time < snaps[0].t) return view(snaps[0], snaps[0].s, true); // held: nothing older yet
    const last = this.newest;
    if (time >= last.t) return coast(last, time - last.t, this.extrapolate);
    let k = snaps.length - 1;
    while (snaps[k - 1].t > time) k--;
    const a = snaps[k - 1];
    const b = snaps[k];
    const f = (time - a.t) / (b.t - a.t);
    const s = a.s.map((v, j) => (j === YAW ? v + wrapAngle(b.s[j] - v) * f : lerp(v, b.s[j], f)));
    s[YAW] = wrapAngle(s[YAW]);
    return {
      ...view(f < 0.5 ? a : b, s, false),
      c: a.c.map((v, j) => lerp(v, b.c[j], f)),
      p: lerp(a.p, b.p, f),
    };
  }
}

const view = (snap, s, stale) => ({ s, c: snap.c, i: snap.i, p: snap.p, lap: snap.lap, stale });

// Past the newest snapshot: straight-line coasting for at most `cap` seconds, then frozen (stale).
function coast(snap, ahead, cap) {
  const dt = Math.min(ahead, cap);
  const s = [...snap.s];
  s[0] += s[3] * dt;
  s[1] += s[4] * dt;
  s[YAW] = wrapAngle(s[YAW] + s[6] * dt);
  return view(snap, s, ahead > cap);
}
