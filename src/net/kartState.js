// What goes on the wire about one kart, and how often. stateOf() stamps a kart's state with the
// host-clock time it was sampled, wraps the yaw, clamps every value into what protocol.parse accepts
// (a kart that spun up a wild yaw rate must not get its own updates dropped) and rounds it (fewer
// JSON digits, still far finer than anyone could see).

import { clamp, wrapAngle } from '../core/math.js';
import { STATE_MAX } from './messages.js';

// Decimal places kept (dividing by a power of ten keeps the JSON short: 0.3, not 0.30000000000000004)
const round = (v, places) => Math.round(v * 10 ** places) / 10 ** places;
const S_PLACES = [3, 3, 4, 3, 3, 4, 3, 4]; // mm, mm, rad, mm/s, mm/s, rad, mrad/s, rad
const T_PLACES = 4; // 0.1 ms
const C_PLACES = 2; // throttle / brake share
const P_PLACES = 2; // centreline samples

// k: { s, c, i, p, lap } (extra fields ignored) → { id, t, s, c, i, p, lap }
export function stateOf(id, t, k) {
  const s = k.s.map((v, j) =>
    round(clamp(j === 2 ? wrapAngle(v) : v, -STATE_MAX[j], STATE_MAX[j]), S_PLACES[j])
  );
  return {
    id,
    t: round(t, T_PLACES),
    s,
    c: k.c.map((v) => round(clamp(v, -1, 1), C_PLACES)),
    i: clamp(Math.round(k.i), 0, 100000),
    p: round(clamp(k.p, -1e6, 1e6), P_PLACES),
    lap: clamp(Math.round(k.lap), 0, 999),
  };
}

// Fires `rate` times a second of summed frame time, without bunching up after a long frame.
export class Ticker {
  constructor(rate) {
    this.period = 1 / rate;
    this.acc = this.period; // the first frame sends at once
  }

  due(dt) {
    this.acc += dt;
    if (this.acc < this.period) return false;
    this.acc = Math.min(this.acc - this.period, this.period);
    return true;
  }
}
