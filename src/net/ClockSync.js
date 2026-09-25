// A client's estimate of the host's clock, from ping / pong round trips (NTP's idea, simplified).
// A ping leaves at local t0, the host stamps th, the pong lands at local t1: if the trip was symmetric
// the host read th at local (t0 + t1) / 2, so offset = th − (t0 + t1) / 2. Queues and jitter only
// ever make a trip longer, and a longer trip is likelier to be lopsided, so only the samples with the
// shortest round trips count: offset = median of the best CLOCK_BEST of the last CLOCK_WINDOW.
//   clock.sample(t0, th, t1) · clock.ready · clock.offset · clock.rtt · clock.hostNow(localNow)

import { CLOCK_WINDOW, CLOCK_BEST } from '../config/net.js';

const median = (values) => {
  const v = [...values].sort((a, b) => a - b);
  const mid = v.length >> 1;
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};

export class ClockSync {
  constructor({ window = CLOCK_WINDOW, best = CLOCK_BEST } = {}) {
    this.window = window;
    this.best = best;
    this.samples = []; // [{ rtt, offset }], oldest first
    this.offset = 0; // s to add to the local clock to read the host's
    this.rtt = 0; // s, the typical round trip among the best samples
  }

  get ready() {
    return this.samples.length > 0;
  }

  sample(t0, th, t1) {
    const rtt = t1 - t0;
    if (!(rtt >= 0)) return; // a pong for a ping from before a clock reset
    this.samples.push({ rtt, offset: th - (t0 + t1) / 2 });
    if (this.samples.length > this.window) this.samples.shift();
    const best = [...this.samples].sort((a, b) => a.rtt - b.rtt).slice(0, this.best);
    this.offset = median(best.map((s) => s.offset));
    this.rtt = median(best.map((s) => s.rtt));
  }

  hostNow(localNow) {
    return localNow + this.offset;
  }
}
