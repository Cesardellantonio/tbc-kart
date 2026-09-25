// A pretend slow, lossy link, for testing how the game copes (dev ?netlag=ms&netloss=0..1, and the
// unit tests' LoopbackTransport). Our data channels are reliable and ordered, so on a real link a
// lost packet is not gone: it is resent about one round trip later, and everything sent after it
// waits behind it (head-of-line blocking). The shaper reproduces exactly that, per destination.

import { NETLAG_MAX, NETLOSS_MAX, RESEND_MIN } from '../config/net.js';
import { clamp } from '../core/math.js';

export class LinkShaper {
  // lag: s added one way to every message; loss: share of transmissions lost; rand: () => [0, 1)
  constructor({ lag = 0, loss = 0, rand = Math.random } = {}) {
    this.lag = lag;
    this.loss = loss;
    this.rand = rand;
    this.last = new Map(); // destination → arrival time of the last message sent there
  }

  get active() {
    return this.lag > 0 || this.loss > 0;
  }

  // When a message sent now (s, caller's clock) to destination `to` arrives.
  arrival(to, now) {
    let at = now + this.lag;
    const resend = Math.max(2 * this.lag, RESEND_MIN); // one more round trip per lost transmission
    for (let tries = 0; tries < 20 && this.rand() < this.loss; tries++) at += resend;
    at = Math.max(at, this.last.get(to) ?? -Infinity); // ordered: it can't overtake the one before
    this.last.set(to, at);
    return at;
  }

  forget(to) {
    this.last.delete(to);
  }
}

// The shaper the URL asks for (?netlag=150&netloss=0.03), or null when it asks for none.
export function shaperFromQuery(search = globalThis.location?.search ?? '') {
  const q = new URLSearchParams(search);
  const lag = clamp(Number(q.get('netlag')) || 0, 0, NETLAG_MAX) / 1000;
  const loss = clamp(Number(q.get('netloss')) || 0, 0, NETLOSS_MAX);
  return lag > 0 || loss > 0 ? new LinkShaper({ lag, loss }) : null;
}
