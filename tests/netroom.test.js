// Online play over an in-memory network (LoopbackTransport, simulated time): the room's lobby rules
// (unique names and codes, liveries, the six-player cap, other versions, mid-race joins, leaving and
// going silent), the START roster, and a race with latency and loss (both directions at ~20 Hz,
// remote karts where their owners put them, one agreed classification, a dropped client, host gone).

import { describe, it, expect } from 'vitest';
import { LoopbackNet } from '../src/net/LoopbackTransport.js';
import { Room } from '../src/net/Room.js';
import { NetRace } from '../src/net/NetRace.js';
import { msg } from '../src/net/protocol.js';
import { peerIdFor } from '../src/net/roomCode.js';
import { seededRandom } from '../src/core/math.js';
import {
  HOST_LIVERY,
  HUMAN_LIVERIES,
  SILENCE_TIMEOUT,
  START_LEAD,
  RESULTS_GRACE,
} from '../src/config/net.js';
import { MAX_PLAYERS } from '../src/config/lobby.js';
import { RIVALS } from '../src/config/race.js';

const FRAME = 1 / 60;

function world(shaping = {}) {
  const net = new LoopbackNet();
  const rooms = [];
  let seed = 1;
  const room = (skew = 0) => {
    const rand = seededRandom(seed++);
    const r = new Room({
      makeTransport: () => net.transport({ ...shaping, rand }),
      now: () => net.now() + skew,
      rand,
    });
    rooms.push(r);
    return r;
  };
  const run = (seconds, each = () => {}) => {
    for (let n = Math.round(seconds / FRAME); n > 0; n--) {
      net.advance(FRAME);
      for (const r of rooms) r.update();
      each();
    }
  };
  const host = (name = 'Cesar') => {
    const h = room();
    h.create(name, { track: 'monza', level: 'club' });
    run(0.2);
    return h;
  };
  const join = (h, name, skew) => {
    const c = room(skew);
    c.join(h.state.room, name);
    run(0.5);
    return c;
  };
  return { net, rooms, room, run, host, join };
}

describe('online room', () => {
  it('lets friends join, with unique names, codes and liveries, and everyone sees the same lobby', () => {
    const w = world();
    const host = w.host('Max');
    const clients = ['Max', 'max', 'Émile'].map((n) => w.join(host, n));
    const names = host.state.players.map((p) => p.name);
    expect(names).toEqual(['Max', 'Max 2', 'max 3', 'Émile']); // as typed, plus a number
    expect(host.state.players.map((p) => p.code)).toEqual(['MAX', 'MA2', 'MA3', 'EMI']);
    expect(host.state.players.map((p) => p.id)).toEqual(['p0', 'p1', 'p2', 'p3']);
    expect(host.state.players[0]).toMatchObject({
      host: true,
      livery: HOST_LIVERY.body,
      number: '07',
    });
    expect(host.state.players.slice(1).map((p) => p.livery)).toEqual(
      HUMAN_LIVERIES.slice(0, 3).map((l) => l.body)
    );
    clients.forEach((c, k) => {
      expect(c.state).toMatchObject({
        phase: 'room',
        isHost: false,
        you: `p${k + 1}`,
        room: host.state.room,
      });
      expect(c.state.players).toEqual(host.state.players);
      expect(c.state.track).toBe('monza');
    });
    host.setLobby({ track: 'spa', level: 'pro' });
    w.run(0.1);
    for (const c of clients) expect(c.state).toMatchObject({ track: 'spa', level: 'pro' });
  });

  it('refuses a seventh driver: the room is full', () => {
    const w = world();
    const host = w.host();
    for (let n = 1; n < MAX_PLAYERS; n++) w.join(host, `D${n}`);
    expect(host.state.players).toHaveLength(MAX_PLAYERS);
    const late = w.join(host, 'Late');
    expect(late.state).toMatchObject({ phase: 'error', error: 'full' });
    expect(host.state.players).toHaveLength(MAX_PLAYERS);
  });

  it('refuses a client speaking another protocol version, and a client leaves a host that does', () => {
    const w = world();
    const host = w.host();
    const raw = w.net.transport();
    const got = [];
    raw.on('open', (id) => raw.send(id, msg.hello('Old', 99)));
    raw.on('message', ({ data }) => got.push(data));
    raw.join(host.state.room);
    w.run(0.5);
    expect(got).toEqual([{ type: 'refuse', reason: 'version' }]);
    expect(host.state.players).toHaveLength(1);

    const fake = w.net.transport(); // a "host" from the future
    fake.host('FUTR2');
    const lobby = { players: host.state.players, track: 'spa', level: 'pro' };
    fake.on('message', ({ from, data }) => {
      if (data.type === 'hello') fake.send(from, { ...msg.welcome('p1', 'FUTR2', lobby), v: 99 });
    });
    const c = w.room();
    c.join('FUTR2', 'New');
    w.run(0.5);
    expect(c.state).toMatchObject({ phase: 'error', error: 'version' });
  });

  it('refuses to seat anyone mid-race, and seats them again once the race is over', () => {
    const w = world();
    const host = w.host();
    w.join(host, 'Ann');
    host.start({ laps: 3, hold: 0.5 });
    const late = w.join(host, 'Bob');
    expect(late.state).toMatchObject({ phase: 'error', error: 'racing' });
    host.endRace();
    late.join(host.state.room, 'Bob');
    w.run(0.5);
    expect(late.state.phase).toBe('room');
  });

  it('reports a room code nobody holds, and a code already taken', () => {
    const w = world();
    const c = w.room();
    c.join('ZZZZZ', 'Lost');
    w.run(0.2);
    expect(c.state).toMatchObject({ phase: 'error', error: 'not-found' });
    w.net.transport().host('AAAAA');
    const b = w.room();
    b.rand = () => 0; // so it draws the code AAAAA, already held
    b.create('B', { track: 'monza', level: 'club' });
    w.run(0.2);
    expect(b.state).toMatchObject({ phase: 'error', error: 'taken' });
  });

  it('drops a player who leaves or goes silent, and tells everyone', () => {
    const w = world();
    const host = w.host();
    const [ann, bob, cat] = ['Ann', 'Bob', 'Cat'].map((n) => w.join(host, n));
    const left = [];
    host.on('left', (id) => left.push(`host:${id}`));
    ann.on('left', (id) => left.push(`ann:${id}`));
    bob.leave();
    w.run(0.2);
    expect(bob.state.phase).toBe('choose');
    expect(host.state.players.map((p) => p.name)).toEqual(['Cesar', 'Ann', 'Cat']);
    expect(ann.state.players).toEqual(host.state.players);
    cat.transport.vanish(); // a closed laptop: no goodbye
    w.run(SILENCE_TIMEOUT - 0.5);
    expect(host.state.players).toHaveLength(3);
    w.run(1);
    expect(host.state.players.map((p) => p.name)).toEqual(['Cesar', 'Ann']);
    expect(left).toEqual(['host:p2', 'ann:p2', 'host:p3', 'ann:p3']);
    const seat = w.join(host, 'Dan'); // the freed id and livery go to the next one in
    expect(seat.state.you).toBe('p2');
  });

  it("closes the room for everyone when the host leaves; a silent host is a lost connection", () => {
    const w = world();
    const host = w.host();
    const ann = w.join(host, 'Ann');
    const closed = [];
    ann.on('closed', (r) => closed.push(r));
    host.leave();
    w.run(0.2);
    expect(ann.state).toMatchObject({ phase: 'error', error: 'closed' });
    const host2 = w.host();
    const bob = w.join(host2, 'Bob');
    host2.transport.vanish(); // no goodbye: we can't know the host left, only that it went quiet
    w.run(SILENCE_TIMEOUT + 0.5);
    expect(bob.state).toMatchObject({ phase: 'error', error: 'lost' });
    expect(closed).toEqual(['closed']);
  });

  it("tells a client the host dropped that the connection was lost, not that the host left", () => {
    const w = world();
    const host = w.host();
    const ann = w.join(host, 'Ann');
    const bob = w.join(host, 'Bob');
    const [annPeer] = [...host.peers].find(([, id]) => id === 'p1');
    host.transport.drop(annPeer); // what the host does to a client it stopped hearing
    w.run(0.2);
    expect(ann.state).toMatchObject({ phase: 'error', error: 'lost' });
    expect(bob.state.phase).toBe('room');
    expect(host.state.players.map((p) => p.name)).toEqual(['Cesar', 'Bob']);
  });

  it('keeps a client whose frames stopped (a background tab): its room steps on a 1 s timer', () => {
    const w = world();
    const host = w.host();
    const ann = w.join(host, 'Ann');
    const others = w.rooms.filter((r) => r !== ann);
    for (let t = 0; t < 4 * SILENCE_TIMEOUT; t += FRAME) {
      w.net.advance(FRAME);
      for (const r of others) r.update();
      if (Math.floor(t) !== Math.floor(t + FRAME)) ann.update(); // a throttled timer: once a second
    }
    expect(ann.state.phase).toBe('room');
    expect(host.state.players.map((p) => p.name)).toEqual(['Cesar', 'Ann']);
  });

  it("won't let a human take an AI rival's name (the rival may join the grid)", () => {
    const w = world();
    const host = w.host();
    w.join(host, RIVALS[0].name);
    expect(host.state.players[1].name).toBe(`${RIVALS[0].name} 2`);
    const roster = host.start({ laps: 3, hold: 0.5 }).roster;
    expect(new Set(roster.map((e) => e.name)).size).toBe(roster.length);
  });

  it('starts everyone on one roster: humans and AI rivals, six distinct grid slots', () => {
    const w = world();
    const host = w.host();
    const clients = ['Ann', 'Bob', 'Cat'].map((n) => w.join(host, n));
    const starts = [];
    for (const r of [host, ...clients]) r.on('start', (s) => starts.push(s));
    const start = host.start({ laps: 5, hold: 0.7 });
    w.run(0.2);
    expect(starts).toHaveLength(4);
    for (const s of starts) expect(s).toEqual(start);
    expect(start.roster.map((e) => e.id)).toEqual(['p0', 'p1', 'p2', 'p3', 'a0', 'a1']);
    expect(start.roster.filter((e) => e.kind === 'ai').map((e) => e.code)).toEqual(
      RIVALS.slice(0, 2).map((r) => r.code)
    );
    expect(new Set(start.roster.map((e) => e.slot)).size).toBe(MAX_PLAYERS);
    expect(new Set(start.roster.map((e) => e.code)).size).toBe(MAX_PLAYERS);
    expect(start.countdownAt).toBeCloseTo(w.net.now() - 0.2 + START_LEAD, 6);
    expect(host.start({ laps: 5, hold: 0.7 })).toBe(null); // not twice
  });

  it('syncs each client to the host clock through pings', () => {
    const w = world({ lag: 0.04 });
    const host = w.host();
    const ann = w.join(host, 'Ann', -123.4); // Ann's clock reads 123.4 s behind
    w.run(3);
    expect(Math.abs(ann.hostNow() - host.hostNow())).toBeLessThan(0.002);
    expect(ann.clock.rtt).toBeGreaterThanOrEqual(0.08); // 2 × 40 ms, plus up to a frame each end
    expect(ann.clock.rtt).toBeLessThan(0.08 + 2 * FRAME + 1e-9);
  });
});

// Every human drives a kart whose truth is a function of host time, so any remote view can be checked.
const truth = (k, t) => ({
  s: [10 * t, 4 * k, 0.1 * k, 10, 0, 0, 0, 0],
  c: [1, 0],
  i: 7,
  p: 100 * t,
  lap: 1,
});

function raceWorld(shaping) {
  const w = world(shaping);
  const host = w.host();
  const clients = ['Ann', 'Bob'].map((n) => w.join(host, n, 7.5 * (n === 'Ann' ? 1 : -1)));
  w.run(1); // ping burst: clocks good before START
  const rooms = [host, ...clients];
  const races = [];
  for (const r of rooms) r.on('start', (start) => races.push(new NetRace({ room: r, start })));
  host.start({ laps: 3, hold: 0.5 });
  w.run(0.5);
  const counts = new Map(rooms.map((r) => [r, { kart: 0, snap: 0 }]));
  for (const r of rooms)
    r.on('race', ({ msg: m }) => m.type in counts.get(r) && counts.get(r)[m.type]++);
  const alive = new Set([0, 1, 2]);
  const drive = (seconds) =>
    w.run(seconds, () => {
      races.forEach((race, k) => {
        if (!alive.has(k)) return;
        const t = rooms[k].hostNow();
        const ai = k === 0 ? ['a0', 'a1', 'a2'].map((id, j) => ({ id, ...truth(3 + j, t) })) : [];
        race.update(FRAME, { own: truth(k, t), ai });
      });
    });
  return { w, host, clients, rooms, races, counts, alive, drive };
}

describe('online race', () => {
  it('sends ~20 Hz both ways and shows remote karts where their owners put them, with lag and loss', () => {
    const r = raceWorld({ lag: 0.06, loss: 0.03 });
    r.drive(10);
    const hostIn = r.counts.get(r.host);
    expect(hostIn.kart / 2 / 10).toBeGreaterThan(18); // from each of two clients
    expect(hostIn.kart / 2 / 10).toBeLessThan(21);
    for (const c of r.clients) {
      expect(r.counts.get(c).snap / 10).toBeGreaterThan(18);
      expect(r.counts.get(c).snap / 10).toBeLessThan(21);
    }
    r.races.forEach((race, k) => {
      const seen = race.remoteStates();
      const expected = ['p0', 'p1', 'p2', 'a0', 'a1', 'a2'].filter(
        (id) => id !== `p${k}` && (k === 0 ? id[0] === 'p' : true)
      );
      expect([...seen.keys()].sort()).toEqual(expected.sort());
      for (const [id, s] of seen) {
        const owner = id[0] === 'p' ? Number(id[1]) : 3 + Number(id[1]);
        expect(Math.abs(s.s[0] - truth(owner, s.t).s[0]), `${k} sees ${id}`).toBeLessThan(0.05);
        expect(s.s[1]).toBeCloseTo(4 * owner, 6);
        expect(s.stale).toBe(false);
      }
    });
  });

  it('agrees one classification everywhere once every kart has finished', () => {
    const r = raceWorld({ lag: 0.05, loss: 0.02 });
    r.drive(2);
    r.races[0].aiFinish('a1', 59.5, 19.2);
    r.races[1].finish(60.1, 19.5);
    r.drive(0.5);
    r.races[0].finish(61.2, 19.9);
    r.drive(0.5);
    expect(r.races[0].results).toBe(null);
    r.races[2].finish(62, 20.1);
    r.drive(1);
    expect(r.races[0].results).toBe(null); // two AI karts are still out (within RESULTS_GRACE)
    r.races[0].aiFinish('a2', 63.4, 20.2);
    r.races[0].aiFinish('a0', 64, 20.6);
    r.drive(1);
    const [h, a, b] = r.races.map((race) => race.results);
    expect(h.map((e) => e.id)).toEqual(['a1', 'p1', 'p0', 'p2', 'a2', 'a0']);
    expect(h[1]).toEqual({ id: 'p1', time: 60.1, best: 19.5, dnf: false });
    expect(a).toEqual(h);
    expect(b).toEqual(h);
    const events = r.races[1].poll();
    expect(events.filter((e) => e.type === 'finish').map((e) => e.id)).toEqual(['a1', 'p0', 'p2', 'a2', 'a0']);
    expect(events.filter((e) => e.type === 'results')).toHaveLength(1);
  });

  it('settles RESULTS_GRACE after the first human finishes, even if others are still racing', () => {
    const r = raceWorld({ lag: 0.03 });
    r.drive(1);
    r.races[2].finish(50, 18);
    r.drive(RESULTS_GRACE - 1);
    expect(r.races[0].results).toBe(null);
    r.drive(1.5);
    expect(r.races[1].results.map((e) => e.id)[0]).toBe('p2');
    expect(r.races[1].results.find((e) => e.id === 'p0').time).toBe(null);
  });

  it('a dropped client disappears for everyone and is classified DNF', () => {
    const r = raceWorld({ lag: 0.05, loss: 0.02 });
    r.drive(2);
    r.clients[1].transport.vanish();
    r.alive.delete(2);
    r.drive(SILENCE_TIMEOUT + 0.5);
    expect(r.races[0].poll().some((e) => e.type === 'left' && e.id === 'p2')).toBe(true);
    expect(r.races[1].poll().some((e) => e.type === 'left' && e.id === 'p2')).toBe(true);
    expect(r.races[1].remoteStates().has('p2')).toBe(false);
    r.races[0].finish(70, 20);
    r.races[1].finish(71, 20);
    for (const id of ['a0', 'a1', 'a2']) r.races[0].aiFinish(id, 72, 21);
    r.drive(0.5);
    const results = r.races[1].results;
    expect(results.at(-1)).toEqual({ id: 'p2', time: null, best: null, dnf: true });
    expect(results.slice(0, 2).map((e) => e.id)).toEqual(['p0', 'p1']);
  });

  it('tells the clients when the host is gone: left, or lost', () => {
    const r = raceWorld({ lag: 0.05 });
    r.drive(2);
    r.host.transport.vanish();
    r.alive.delete(0);
    r.drive(SILENCE_TIMEOUT + 0.5);
    for (const race of r.races.slice(1)) {
      expect(race.poll()).toContainEqual({ type: 'host-gone', reason: 'lost' });
    }
    const q = raceWorld({ lag: 0.05 });
    q.drive(2);
    q.host.leave();
    q.alive.delete(0);
    q.drive(0.5);
    for (const race of q.races.slice(1)) {
      expect(race.poll()).toContainEqual({ type: 'host-gone', reason: 'closed' });
    }
  });

  it('a host without frames still relays the humans to each other, and they hear it is away', () => {
    const r = raceWorld({ lag: 0.05 });
    r.drive(2);
    for (const race of r.races) race.poll();
    r.alive.delete(0); // the host's tab goes to the background: no race.update, its room on a timer
    const seen = [];
    for (let t = 0; t < 5; t += FRAME) {
      r.w.net.advance(FRAME);
      for (const room of r.clients) room.update();
      if (Math.floor(t) !== Math.floor(t + FRAME)) r.host.update();
      r.races.slice(1).forEach((race, k) => {
        const now = r.clients[k].hostNow();
        race.update(FRAME, { own: truth(k + 1, now) });
      });
      const bob = r.races[1].remoteStates().get('p2'); // Bob's kart as Ann draws it
      const lagBehind = r.clients[0].hostNow() - bob.t;
      if (t > 2) seen.push(!bob.stale && lagBehind < 0.5 && Math.abs(bob.s[0] - 10 * bob.t) < 1);
    }
    expect(seen.every(Boolean)).toBe(true); // Bob keeps moving on Ann's screen, where he really is
    expect(r.races[1].remoteStates().get('p0').stale).toBe(true); // the host's own kart stands
    expect(r.races[1].poll()).toContainEqual({ type: 'host-away', away: true });
    expect(r.host.state.players).toHaveLength(3); // nobody dropped
    r.alive.add(0);
    r.drive(1);
    expect(r.races[1].poll()).toContainEqual({ type: 'host-away', away: false });
  });
});
