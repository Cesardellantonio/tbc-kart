// An in-memory stand-in for the PeerJS transport, for tests: the same API and events as Transport,
// on a manual clock. Messages are JSON round-tripped (as on the wire) and delivered when the test
// calls net.advance(dt), after each sender's LinkShaper latency / loss. Every event is delivered
// later, never inside the call that caused it — as with the real network.
//   const net = new LoopbackNet(); const a = net.transport({ lag: 0.05, loss: 0.02, rand });
//   a.host('K7QX2'); b.join('K7QX2'); net.advance(0.1); …  net.now() is the clock (s).

import { EventBus } from '../core/events.js';
import { LinkShaper } from './linkShaper.js';
import { peerIdFor } from './roomCode.js';

export class LoopbackNet {
  constructor() {
    this.t = 0;
    this.queue = []; // [{ at, n, fn }]
    this.n = 0;
    this.endpoints = new Map(); // peer id → LoopbackTransport
    this.now = () => this.t;
  }

  transport(shaping) {
    return new LoopbackTransport(this, shaping);
  }

  post(at, fn) {
    this.queue.push({ at, n: this.n++, fn });
  }

  advance(dt = 0) {
    this.t += dt;
    for (;;) {
      const due = this.queue.filter((q) => q.at <= this.t).sort((a, b) => a.at - b.at || a.n - b.n);
      if (!due.length) return;
      this.queue = this.queue.filter((q) => q.at > this.t);
      for (const q of due) q.fn();
    }
  }
}

export class LoopbackTransport {
  constructor(net, shaping = {}) {
    this.net = net;
    this.shaper = new LinkShaper(shaping);
    this.bus = new EventBus();
    this.links = new Set(); // peer ids this end is connected to
    this.id = null;
    this.dead = false;
  }

  on(type, handler) {
    return this.bus.on(type, handler);
  }

  _later(type, payload, delay = this.shaper.lag) {
    this.net.post(this.net.t + delay, () => !this.dead && this.bus.emit(type, payload));
  }

  host(code) {
    const id = peerIdFor(code);
    if (this.net.endpoints.has(id)) return this._later('error', 'taken');
    this.id = id;
    this.net.endpoints.set(id, this);
    this._later('open', id);
  }

  join(code) {
    const host = this.net.endpoints.get(peerIdFor(code));
    if (!host) return this._later('error', 'not-found');
    this.id = `c${this.net.n++}`;
    this.net.endpoints.set(this.id, this);
    this.links.add(host.id);
    host.links.add(this.id);
    host._later('peer', this.id, this.shaper.lag);
    this._later('open', host.id, this.shaper.lag + host.shaper.lag);
  }

  send(to, message) {
    const peer = this.net.endpoints.get(to);
    if (this.dead || !peer || !this.links.has(to)) return;
    const data = JSON.parse(JSON.stringify(message));
    const at = this.shaper.arrival(to, this.net.t);
    this.net.post(
      at,
      () =>
        !peer.dead && peer.links.has(this.id) && peer.bus.emit('message', { from: this.id, data })
    );
  }

  broadcast(message) {
    for (const to of this.links) this.send(to, message);
  }

  // Close one connection (host: kick a client); both ends hear 'close'.
  drop(to) {
    const peer = this.net.endpoints.get(to);
    if (!this.links.delete(to)) return;
    this._later('close', to, 0);
    if (peer?.links.delete(this.id)) peer._later('close', this.id);
  }

  close() {
    for (const to of [...this.links]) this.drop(to);
    if (this.id) this.net.endpoints.delete(this.id);
  }

  // Test hook: this end goes silent without a goodbye (a crashed tab or a pulled cable).
  vanish() {
    this.dead = true;
  }
}
