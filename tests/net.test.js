// Online play, the pure pieces: room codes, message validation (a peer's message is untrusted input),
// the client's estimate of the host clock, and snapshot interpolation of remote karts.

import { describe, it, expect } from 'vitest';
import { makeCode, isCode, peerIdFor, codeFromPeerId } from '../src/net/roomCode.js';
import { msg, parse } from '../src/net/protocol.js';
import { ClockSync } from '../src/net/ClockSync.js';
import { Interpolator } from '../src/net/Interpolator.js';
import { stateOf, Ticker } from '../src/net/kartState.js';
import { CODE_ALPHABET, CODE_LENGTH } from '../src/config/lobby.js';
import {
  PROTOCOL_VERSION,
  MAX_MESSAGE,
  EXTRAPOLATE_MAX,
  INTERP_DELAY,
  CLOCK_READY,
} from '../src/config/net.js';
import { seededRandom } from '../src/core/math.js';

describe('room codes', () => {
  it('uses the lobby card alphabet and length', () => {
    const rand = seededRandom(7);
    for (let n = 0; n < 200; n++) {
      const code = makeCode(rand);
      expect(code).toHaveLength(CODE_LENGTH);
      expect([...code].every((c) => CODE_ALPHABET.includes(c))).toBe(true);
      expect(isCode(code)).toBe(true);
    }
  });
  it('refuses look-alike characters, lower case and wrong lengths', () => {
    for (const bad of [
      'K7QXI',
      'K7QX0',
      'O7QX2',
      'K1QX2',
      'k7qx2',
      'K7QX',
      'K7QX22',
      '',
      null,
      12345,
    ]) {
      expect(isCode(bad)).toBe(false);
    }
  });
  it('maps a code to the host peer id and back', () => {
    expect(peerIdFor('K7QX2')).toBe('tbckart-K7QX2');
    expect(codeFromPeerId('tbckart-K7QX2')).toBe('K7QX2');
    expect(codeFromPeerId('tbckart-K7QX1')).toBe(null);
    expect(codeFromPeerId('someone-K7QX2')).toBe(null);
  });
});

const S = [12.5, -3.25, 0.5, 10, -1, 0.1, 0.4, 0.05];
const KART = { id: 'p1', t: 101.5, s: S, c: [1, 0], i: 120, p: 820.5, lap: 2 };
const LOBBY = {
  players: [{ id: 'p0', name: 'Cesar', livery: 0xffc21a, number: '07', code: 'CES', host: true }],
  track: 'monza',
  level: 'club',
};
const ROSTER = [
  { id: 'p0', kind: 'human', name: 'Cesar', code: 'CES', livery: 1, number: '07', slot: 3 },
  {
    id: 'a0',
    kind: 'ai',
    name: 'M. Rossi',
    code: 'ROS',
    livery: 2,
    number: '11',
    slot: 0,
    rival: 0,
  },
];
const GOOD = [
  msg.hello('Max V'),
  msg.welcome('p2', 'K7QX2', LOBBY),
  msg.refuse('full'),
  msg.lobby(LOBBY),
  msg.ping(12.5),
  msg.pong(12.5, 99.1),
  msg.start({ track: 'spa', level: 'pro', laps: 5, roster: ROSTER, countdownAt: 100, hold: 0.8 }),
  msg.kart(KART),
  msg.snap(101.6, [KART, { ...KART, id: 'a3' }]),
  msg.finish('p1', 140.25, 27.8),
  msg.finish('a0', 141, null),
  msg.results([
    { id: 'p1', time: 140.25, best: 27.8, dnf: false },
    { id: 'p2', time: null, best: null, dnf: true },
  ]),
  msg.left('p3'),
  msg.bye('closed'),
  msg.bye(),
];

describe('protocol', () => {
  it('accepts every well-formed message, as an object or as JSON text', () => {
    for (const m of GOOD) {
      expect(parse(m), m.type).toEqual(m);
      expect(parse(JSON.stringify(m)), m.type).toEqual(m);
    }
    expect(msg.hello('x').v).toBe(PROTOCOL_VERSION);
  });

  const bad = {
    'unknown type': { type: 'teleport', x: 1 },
    'no type': { name: 'x' },
    'a stray key': { ...msg.ping(1), admin: true },
    'a __proto__ key': JSON.parse('{"type":"ping","t0":1,"__proto__":{"x":1}}'),
    NaN: msg.ping(NaN),
    'Infinity in a state': msg.kart({ ...KART, s: [...S.slice(0, 7), Infinity] }),
    'a short state': msg.kart({ ...KART, s: S.slice(0, 7) }),
    'a long state': msg.kart({ ...KART, s: [...S, 0] }),
    'a string for a number': msg.kart({ ...KART, s: S.map(String) }),
    'a far-off position': msg.kart({ ...KART, s: [1e6, ...S.slice(1)] }),
    'controls out of range': msg.kart({ ...KART, c: [3, 0] }),
    'a fractional lap': msg.kart({ ...KART, lap: 1.5 }),
    'a negative sample index': msg.kart({ ...KART, i: -1 }),
    'an unknown kart id': msg.kart({ ...KART, id: 'p9' }),
    'markup in a name': msg.hello('<img src=x>'),
    'an empty name': msg.hello(''),
    'a 13-character name': msg.hello('ABCDEFGHIJKLM'),
    'an unknown level': msg.lobby({ ...LOBBY, level: 'god' }),
    'a bad room code': msg.welcome('p1', 'K7QX1', LOBBY),
    'an unknown refusal': msg.refuse('banned'),
    'seven karts in a snap': msg.snap(1, Array(7).fill(KART)),
    'an AI in the lobby': msg.lobby({ ...LOBBY, players: [{ ...LOBBY.players[0], id: 'a0' }] }),
    'an empty roster': msg.start({
      track: 'spa',
      level: 'pro',
      laps: 5,
      roster: [],
      countdownAt: 1,
      hold: 1,
    }),
    'zero laps': msg.start({
      track: 'spa',
      level: 'pro',
      laps: 0,
      roster: ROSTER,
      countdownAt: 1,
      hold: 1,
    }),
    'a negative finish time': msg.finish('p1', -1, null),
    'an array': [msg.ping(1)],
    null: null,
    'a number': 42,
  };
  for (const [what, m] of Object.entries(bad)) {
    it(`drops a message with ${what}`, () => expect(parse(m)).toBe(null));
  }
  it('drops text that is not JSON, and anything over MAX_MESSAGE before parsing it', () => {
    expect(parse('{"type":"ping",')).toBe(null);
    expect(parse('ping')).toBe(null);
    const big = JSON.stringify({ ...msg.ping(1), pad: 'x'.repeat(MAX_MESSAGE) });
    expect(parse(big)).toBe(null);
    expect(parse(JSON.parse(big))).toBe(null);
  });
  it('a full snap of six karts stays well under MAX_MESSAGE', () => {
    const wild = {
      s: S.map((v) => v * 1.23456789),
      c: [0.123456, 0.9876],
      i: 1234,
      p: 98765.4321,
      lap: 4,
    };
    const karts = ['p0', 'p1', 'p2', 'a0', 'a1', 'a2'].map((id) => stateOf(id, 12345.678912, wild));
    const snap = msg.snap(12345.6789, karts);
    expect(parse(snap)).toEqual(snap);
    expect(JSON.stringify(snap).length).toBeLessThan(MAX_MESSAGE / 4);
  });
  it('stateOf wraps the yaw and clamps a wild value so the host never drops your kart', () => {
    const k = stateOf('p1', 5, {
      s: [1, 2, 7, 200, 0, 0, -500, 0],
      c: [2, -0.5],
      i: 3.4,
      p: 7,
      lap: 1,
    });
    expect(k.s[2]).toBeCloseTo(7 - 2 * Math.PI, 3);
    expect(k.s[3]).toBe(100);
    expect(k.s[6]).toBe(-100);
    expect(k.c).toEqual([1, -0.5]);
    expect(parse(msg.kart(k))).not.toBe(null);
  });
});

describe('send rate ticker', () => {
  it('fires at the rate over uneven frames, and does not burst after a hitch', () => {
    const ticker = new Ticker(20);
    const rand = seededRandom(3);
    let fired = 0;
    for (let t = 0; t < 10; ) {
      const dt = 1 / 144 + rand() / 40;
      t += dt;
      fired += ticker.due(dt) ? 1 : 0;
    }
    expect(fired).toBeGreaterThanOrEqual(195);
    expect(fired).toBeLessThanOrEqual(201);
    ticker.due(1); // a one-second hitch…
    expect(ticker.due(1 / 60)).toBe(true); // …owes at most one more send
    expect(ticker.due(1 / 60)).toBe(false);
  });
});

describe('clock sync', () => {
  // A ping every second over a link with a fixed base delay plus exponential queueing jitter,
  // independently each way; the client's clock is `skew` seconds behind the host's.
  function simulate(seed, { skew, base, jitter, pings = 16 }) {
    const rand = seededRandom(seed);
    const exp = (mean) => -mean * Math.log(1 - rand());
    const clock = new ClockSync();
    for (let n = 0; n < pings; n++) {
      const t0 = 50 + n;
      const up = base + exp(jitter);
      const down = base + exp(jitter);
      clock.sample(t0, t0 + up + skew, t0 + up + down);
    }
    return clock;
  }
  it('finds the host clock within 10 ms under skew and jitter', () => {
    let worst = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const skew = (seed % 2 ? 1 : -1) * seed * 13.37;
      const clock = simulate(seed, { skew, base: 0.03, jitter: 0.02 });
      worst = Math.max(worst, Math.abs(clock.offset - skew));
      expect(clock.hostNow(10)).toBeCloseTo(10 + clock.offset, 9);
    }
    expect(worst).toBeLessThan(0.01);
  });
  it('shrugs off a few very late pongs', () => {
    const clock = new ClockSync();
    for (let n = 0; n < 10; n++) clock.sample(n, n + 5.02, n + 0.04);
    clock.sample(10, 10 + 5 + 0.8, 10 + 0.85); // one pong stuck behind a lost packet
    expect(clock.offset).toBeCloseTo(5, 6);
    expect(clock.rtt).toBeCloseTo(0.04, 6);
  });
  it('is not ready until it has CLOCK_READY samples', () => {
    const clock = new ClockSync();
    for (let n = 0; n < CLOCK_READY; n++) {
      expect(clock.ready).toBe(false);
      clock.sample(n, n + 2, n + 0.1);
    }
    expect(clock.ready).toBe(true);
  });
});

describe('interpolation', () => {
  const snap = (t, s, extra = {}) => ({ t, s, c: [1, 0], i: 10, p: 10 * t, lap: 1, ...extra });
  const moving = (t) => snap(t, [10 * t, 5, 0.2, 10, 0, 0, 0, 0]);

  it('blends between the two snapshots around the render time', () => {
    const interp = new Interpolator();
    interp.push(moving(1));
    interp.push(moving(1.05));
    const s = interp.sample(1.02);
    expect(s.s[0]).toBeCloseTo(10.2, 9);
    expect(s.p).toBeCloseTo(10.2, 9);
    expect(s.stale).toBe(false);
  });
  it('turns the short way round through ±π', () => {
    const interp = new Interpolator();
    interp.push(snap(0, [0, 0, Math.PI - 0.1, 0, 0, 0, 0, 0]));
    interp.push(snap(0.1, [0, 0, -Math.PI + 0.1, 0, 0, 0, 0, 0]));
    const quarter = interp.sample(0.025).s[2];
    const half = interp.sample(0.05).s[2];
    expect(quarter).toBeCloseTo(Math.PI - 0.05, 9);
    expect(Math.abs(half)).toBeCloseTo(Math.PI, 9);
    expect(interp.sample(0.075).s[2]).toBeCloseTo(-Math.PI + 0.05, 9);
  });
  it('coasts past the newest snapshot for EXTRAPOLATE_MAX, then freezes', () => {
    const interp = new Interpolator();
    interp.push(snap(0, [0, 0, 0, 10, -2, 0, 1, 0]));
    const soon = interp.sample(0.1);
    // along the arc: 1 rad/s of yaw turns the velocity (10, -2) left by 0.1 rad over the 0.1 s
    const [sa, ca] = [Math.sin(0.1), 1 - Math.cos(0.1)];
    expect(soon.s[0]).toBeCloseTo(10 * sa - 2 * ca, 9);
    expect(soon.s[1]).toBeCloseTo(-2 * sa - 10 * ca, 9);
    expect(soon.s[2]).toBeCloseTo(0.1, 9);
    expect(Math.hypot(soon.s[3], soon.s[4])).toBeCloseTo(Math.hypot(10, -2), 9);
    expect(soon.stale).toBe(false);
    const straight = new Interpolator();
    straight.push(snap(0, [0, 0, 0, 10, 0, 0, 0, 0]));
    const late = straight.sample(2);
    expect(late.s[0]).toBeCloseTo(10 * EXTRAPOLATE_MAX, 9);
    expect(late.stale).toBe(true);
    expect(straight.sample(5).s).toEqual(late.s); // frozen
  });
  it('ignores late or repeated snapshots and holds the oldest before the buffer starts', () => {
    const interp = new Interpolator({ size: 4 });
    for (const t of [1, 1.05, 1.02, 1.05, 1.1]) interp.push(moving(t));
    expect(interp.snaps.map((s) => s.t)).toEqual([1, 1.05, 1.1]);
    expect(interp.sample(0)).toMatchObject({ stale: true }); // held, not blended
    expect(interp.sample(0).s[0]).toBe(10);
    for (const t of [1.15, 1.2, 1.25]) interp.push(moving(t));
    expect(interp.snaps).toHaveLength(4);
    expect(interp.sample(null)).not.toBe(null);
    expect(new Interpolator().sample(1)).toBe(null);
  });
  it('draws a kart whose snapshots arrive old further in the past', () => {
    const near = new Interpolator();
    const far = new Interpolator();
    for (let n = 0; n < 60; n++) {
      near.push(moving(n / 20), n / 20 + 0.03);
      far.push(moving(n / 20), n / 20 + 0.3);
    }
    expect(near.delay).toBe(INTERP_DELAY);
    expect(far.delay).toBeGreaterThan(0.3);
    expect(far.delay).toBeLessThan(0.4);
  });
  it('draws a kart whose snapshots arrive unevenly far enough back to cover most late ones', () => {
    const interp = new Interpolator();
    const rand = seededRandom(5);
    const ages = [];
    for (let n = 0; n < 400; n++) {
      const age = 0.18 + (rand() < 0.05 ? 0.3 * rand() : 0.02 * rand()); // now and then held up
      ages.push(age);
      interp.push(moving(n / 20), n / 20 + age);
    }
    const covered = ages.slice(200).filter((a) => a <= interp.delay + EXTRAPOLATE_MAX).length / 200;
    expect(interp.delay).toBeGreaterThan(0.25);
    expect(interp.delay).toBeLessThan(0.45);
    expect(covered).toBe(1);
  });
});
