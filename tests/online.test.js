// The game side of an online race, without a browser: the roster becoming the timing field, the
// host's classification and relayed flags written onto it, and the race session following the
// room's shared clock (so every peer's lights go out at the same host time).

import { describe, it, expect } from 'vitest';
import { onlineDrivers, applyResults, applyFlag } from '../src/app/onlineGrid.js';
import { RaceField } from '../src/race/RaceField.js';
import { RaceSession, randomHold } from '../src/race/RaceSession.js';
import { buildRoster } from '../src/net/roster.js';
import { EventBus } from '../src/core/events.js';
import { seededRandom } from '../src/core/math.js';
import { RIVALS, LIGHT_COUNT, LIGHT_INTERVAL, LIGHTS_HOLD } from '../src/config/race.js';

const PLAYERS = [
  { id: 'p0', name: 'Cesar', code: 'CES', livery: 0xffc21a, number: '07', host: true },
  { id: 'p1', name: 'Marta', code: 'MAR', livery: 0xf4f6fb, number: '2', host: false },
];
const roster = buildRoster(PLAYERS, seededRandom(3));
const field = (you) => new RaceField(100, 0, 3, onlineDrivers(roster, you));

describe('online timing field', () => {
  it('lists every roster kart with its code and colour, you as the player, AI with its profile', () => {
    const drivers = onlineDrivers(roster, 'p1');
    expect(drivers.map((d) => d.id)).toEqual(['p0', 'p1', 'a0', 'a1', 'a2', 'a3']);
    expect(drivers.filter((d) => d.isPlayer).map((d) => d.id)).toEqual(['p1']);
    expect(drivers[1]).toMatchObject({ code: 'MAR', name: 'Marta', color: 0xf4f6fb });
    expect(drivers[2].profile).toBe(RIVALS[0]);
    expect(drivers[0].profile).toBeUndefined();
  });

  it("takes the host's final order and times, DNF included, and says it is final", () => {
    const f = field('p0');
    const entries = [
      { id: 'a1', time: 60.2, best: 11.1, dnf: false },
      { id: 'p0', time: 61, best: 11.4, dnf: false },
      { id: 'a0', time: null, best: null, dnf: false },
      { id: 'a2', time: null, best: null, dnf: false },
      { id: 'a3', time: null, best: null, dnf: false },
      { id: 'p1', time: null, best: null, dnf: true },
    ];
    applyResults(f, entries);
    expect(f.final).toBe(true);
    expect(f.order.map((e) => e.id)).toEqual(entries.map((e) => e.id));
    expect(f.position(f.player)).toBe(2);
    expect(f.order[0]).toMatchObject({ finishTime: 60.2, bestLap: 11.1 });
    expect(f.order.at(-1).dnf).toBe(true);
  });

  it("puts a relayed flag's exact time on that kart", () => {
    const f = field('p1');
    applyFlag(f, { id: 'p0', time: 58.25, best: 10.9 });
    applyFlag(f, { id: 'zz', time: 1, best: 1 }); // unknown: ignored
    expect(f.entries[0]).toMatchObject({ finishTime: 58.25, bestLap: 10.9 });
  });
});

describe('race session on a shared clock', () => {
  const GO = (hold) => LIGHT_COUNT * LIGHT_INTERVAL + hold;

  it('draws a hold inside LIGHTS_HOLD', () => {
    const r = seededRandom(9);
    for (let k = 0; k < 50; k++) {
      const h = randomHold(r);
      expect(h).toBeGreaterThanOrEqual(LIGHTS_HOLD[0]);
      expect(h).toBeLessThanOrEqual(LIGHTS_HOLD[1]);
    }
  });

  it('goes green at the shared GO time whatever the frame rate, with the race clock counted from it', () => {
    const hold = 0.8;
    for (const frame of [1 / 144, 1 / 60, 1 / 23, 0.05]) {
      const bus = new EventBus();
      let goAt = null;
      let t = -1; // the host's START lead: nothing lights before the countdown begins
      bus.on('go', () => (goAt = t));
      const s = new RaceSession(100, 0, bus, { best: null, splits: null }, 3);
      s.follow(() => t);
      s.startCountdown('online', hold);
      // frames arrive late and uneven, and the summed dt would drift: only elapsed() counts
      for (let k = 0; t < GO(hold) + 1; k++) {
        t += frame * (k % 3 === 0 ? 1.7 : 0.8);
        s.update(0.001, 0);
        if (t < 0) expect(s.lights).toBe(0);
      }
      expect(goAt).toBeGreaterThanOrEqual(GO(hold));
      expect(goAt - GO(hold)).toBeLessThan(frame * 1.8); // the first frame at or past it
      expect(s.clock).toBeCloseTo(t - GO(hold), 9); // not "time since the frame that saw GO"
      s.finish(); // after your flag the clock runs on (the rest of the field is still timed)
      for (let k = 0; k < 30; k++) (t += frame), s.update(0.001, 0);
      expect(s.clock).toBeCloseTo(t - GO(hold), 9);
    }
  });

  it('keeps frame time when nothing is followed (single player unchanged)', () => {
    const s = new RaceSession(100, 0, new EventBus(), { best: null, splits: null }, 3);
    s.startCountdown('race', 0.5);
    for (let k = 0; k < 600 && s.state === 'countdown'; k++) s.update(1 / 60, 0);
    expect(s.state).toBe('racing');
    expect(s.clock).toBe(0);
    s.update(0.25, 0);
    expect(s.clock).toBeCloseTo(0.25, 9);
  });
});
