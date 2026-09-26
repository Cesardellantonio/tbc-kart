// The karts someone else drives, as this browser sees them: one Interpolator per kart id, fed with
// the snapshots that arrive, read back at render time.

import { Interpolator } from './Interpolator.js';

export class RemoteKarts {
  constructor() {
    this.interps = new Map(); // kart id → Interpolator
  }

  // k: { id, t, s, c, i, p, lap } sampled at host time t; receivedAt: host time it got here.
  push(k, receivedAt) {
    if (!this.interps.has(k.id)) this.interps.set(k.id, new Interpolator());
    this.interps.get(k.id).push(k, receivedAt);
  }

  drop(id) {
    this.interps.delete(id);
  }

  // Map id → { s, c, i, p, lap, stale, t }: each kart at host time `time`, or (no time) at its own
  // render time now − Interpolator.delay. cap: how far past its newest snapshot a kart may coast.
  states(now, time, cap) {
    const out = new Map();
    for (const [id, interp] of this.interps) {
      const t = time ?? now - interp.delay;
      const state = interp.sample(t, cap);
      if (state) out.set(id, { ...state, t });
    }
    return out;
  }
}
