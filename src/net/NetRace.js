// One online race, START to results, over a Room. Each human owns its kart (local physics) and sends
// it to the host KART_RATE times a second; the host sends each client every other kart — humans and
// the AI rivals it runs — SNAP_RATE times a second. Flags go to the host, which relays them and
// declares the final classification. No THREE, no Game: the integration hands states in and reads
// states and events out, once a frame.
//   const race = new NetRace({ room, start })   start: the room's 'start' message
//   race.update(dt, { own, ai })  own: { s, c, i, p, lap } your kart (null: nothing to send)
//                                 ai (host only): [{ id, s, c, i, p, lap }] the rivals it runs
//   race.remoteStates(time?, cap?) → Map id → { s, c, i, p, lap, stale, t }: every other kart at host
//                              time `time`, or by default each at its own render time t (RemoteKarts);
//                              cap: coasting limit past the newest snapshot (default EXTRAPOLATE_MAX)
//   race.finish(time, best)  your flag (race-clock s) · race.aiFinish(id, time, best) (host)
//   race.poll() → events since the last poll: { type: 'finish', id, time, best } (another kart) ·
//     { type: 'left', id } · { type: 'results', entries: [{ id, time|null, best|null, dnf }] } in
//     final order · { type: 'host-gone', reason } ('closed' | 'lost') · client: { type: 'host-away',
//     away } when the host's own kart stops coming (its frames stopped) and when it comes back
// A host with no frames (a background tab) relays each client's kart to the others as it arrives.
//   race.results (final entries, or null) · race.you · race.roster · race.dispose()
// s: [x, z, yaw, vx, vz, steer, yawRate, slipAngle], c: [throttle, brake] (config/net.js).

import { msg } from './protocol.js';
import { RemoteKarts } from './RemoteKarts.js';
import { FinishBook } from './raceResults.js';
import { stateOf, Ticker } from './kartState.js';
import { KART_RATE, SNAP_RATE, RESULTS_GRACE, RELAY_STALL, HOST_STALL } from '../config/net.js';

export class NetRace {
  constructor({ room, start }) {
    Object.assign(this, { room, roster: start.roster, you: room.state.you, isHost: room.isHost });
    this.book = this.isHost ? new FinishBook(this.roster, RESULTS_GRACE) : null;
    this.remote = new RemoteKarts();
    this.latest = new Map(); // host: id → newest state of every kart, sent on in snaps
    this.ticker = new Ticker(this.isHost ? SNAP_RATE : KART_RATE);
    this.events = [];
    this.results = null;
    this.lastFrame = this.hostSeen = room.hostNow(); // host: its last update; client: last host kart
    this.away = false; // client: the host's kart has stopped coming
    this.offs = [
      room.on('race', ({ msg: m }) => this.receive(m)),
      room.on('left', (id) => this.drop(id)),
      room.on('closed', (reason) => this.events.push({ type: 'host-gone', reason })),
    ];
  }

  update(dt, { own = null, ai = [] } = {}) {
    const now = (this.lastFrame = this.room.hostNow());
    if (!this.isHost) {
      if (own && this.ticker.due(dt)) this.room.send(msg.kart(stateOf(this.you, now, own)));
      const away = now - this.hostSeen > HOST_STALL;
      if (away !== this.away) this.events.push({ type: 'host-away', away: (this.away = away) });
      return;
    }
    if (own) this.latest.set(this.you, stateOf(this.you, now, own));
    for (const k of ai) this.latest.set(k.id, stateOf(k.id, now, k));
    if (this.ticker.due(dt)) {
      for (const [, id] of this.room.peers) {
        if (id)
          this.room.sendTo(
            id,
            msg.snap(
              now,
              [...this.latest.values()].filter((k) => k.id !== id)
            )
          );
      }
    }
    if (!this.results && this.book.due(now)) this.settle();
  }

  receive(m) {
    const now = this.room.hostNow();
    if (m.type === 'kart') {
      const { type, ...k } = m;
      this.latest.set(k.id, k);
      this.remote.push(k, now);
      if (now - this.lastFrame > RELAY_STALL) this.relay(k, now);
    } else if (m.type === 'snap') {
      for (const k of m.karts) if (k.id !== this.you) this.remote.push(k, now);
      if (m.karts.some((k) => k.id === 'p0')) this.hostSeen = now; // the host (always p0) is live
    } else if (m.type === 'finish') {
      this.flag(m.id, m.time, m.best);
    } else if (m.type === 'results' && !this.results) {
      this.results = m.entries;
      this.events.push({ type: 'results', entries: m.entries });
    }
  }

  // Host without frames: this client's kart straight on to everyone else, as a snap of one.
  relay(k, now) {
    for (const [, id] of this.room.peers)
      if (id && id !== k.id) this.room.sendTo(id, msg.snap(now, [k]));
  }

  remoteStates(time, cap) {
    return this.remote.states(this.room.hostNow(), time, cap);
  }

  finish(time, best) {
    if (this.isHost) this.flag(this.you, time, best);
    else this.room.send(msg.finish(this.you, time, best));
  }

  aiFinish(id, time, best) {
    if (this.isHost) this.flag(id, time, best);
  }

  // A flag: the host books it and tells everyone; a client hears it from the host.
  flag(id, time, best) {
    if (this.isHost && !this.book.record(id, time, best, this.room.hostNow())) return;
    if (this.isHost) this.room.broadcast(msg.finish(id, time, best));
    if (id !== this.you) this.events.push({ type: 'finish', id, time, best });
  }

  settle() {
    this.results = this.book.entries((id) => this.latest.get(id)?.p ?? -Infinity);
    this.room.broadcast(msg.results(this.results));
    this.events.push({ type: 'results', entries: this.results });
  }

  drop(id) {
    this.remote.drop(id);
    this.latest.delete(id);
    this.book?.leave(id);
    this.events.push({ type: 'left', id });
  }

  poll() {
    return this.events.splice(0);
  }

  dispose() {
    for (const off of this.offs) off();
  }
}
