// Computer drivers: the braking speed plan, overtaking memory, pack pull and grid, pedal shaping,
// and what they add up to on track (pace follows skill, not a driver's preferred line).

import { describe, it, expect } from 'vitest';
import { speedPlan, plannedSpeed } from '../src/race/speedPlan.js';
import { passing } from '../src/race/passing.js';
import { catchUpPace, rivalSlots } from '../src/race/pack.js';
import { lockCap, slipCap } from '../src/race/speedControl.js';
import { racingLine } from '../src/race/racingLine.js';
import { pathOf } from '../src/track/validate.js';
import { simulateRace } from '../tools/simulate.js';
import { AI } from '../src/config/race.js';
import { seededRandom } from '../src/core/math.js';
import { TRACKS } from '../src/tracks/index.js';
import tbc from '../src/tracks/tbc.js';

describe('speed plan', () => {
  const path = pathOf(tbc);
  const line = racingLine(path, AI);
  const opts = { latAccel: 10, decel: 5.5, chord: 6, maxSpeed: 16 };
  const plan = speedPlan(path, line, opts);

  it('slows for corners, never asks for more braking than planned, and is shared per line', () => {
    expect(Math.min(...plan)).toBeLessThan(9);
    expect(Math.max(...plan)).toBeCloseTo(16, 3);
    for (let i = 0; i < path.count; i++) {
      const next = plan[path.wrap(i + 1)];
      expect(plan[i] ** 2 - next ** 2).toBeLessThanOrEqual(2 * opts.decel * path.spacing * 1.5 + 1e-3);
    }
    expect(speedPlan(path, line, opts)).toBe(plan);
  });

  it('reads the plan ahead of the kart and scales it with skill', () => {
    const i = plan.indexOf(Math.min(...plan));
    const at = (index, o) => plannedSpeed(plan, path, index, 10, { ahead: 0.25, maxSpeed: 99, ...o });
    const before = path.wrap(i - Math.round(2.5 / path.spacing)); // 10 m/s × 0.25 s short of the apex
    expect(at(before)).toBeCloseTo(plan[i], 5);
    expect(at(before, { skill: 1.1 })).toBeCloseTo(plan[i] * Math.sqrt(1.1), 5);
    expect(at(before, { maxSpeed: 3 })).toBe(3);
  });
});

describe('overtaking', () => {
  const slow = (ahead, lateral, speed = 10) => ({ ahead, lateral, speed });

  it('tucks in for the slipstream, then pulls out and keeps the target and side through the pass', () => {
    const memo = { target: -1, side: 0 };
    expect(passing(memo, [slow(8.5, 0.3)], 0, 12).pass).toBe(0); // acquired, still drafting
    expect(memo.side).toBe(-1); // it sits to my right: pass on the left
    expect(passing(memo, [slow(5, 0.3)], 0, 12).pass).toBe(-AI.passOffset);
    // Pulled out beside it the gap grows past the pick-up window (1.6 m): the target is kept…
    expect(passing(memo, [slow(1, 0.8)], -1.9, 12).pass).toBe(-AI.passOffset);
    // …and the side stays latched even when it drifts across to my left.
    expect(passing(memo, [slow(0.5, -2.2)], -1.9, 12).pass).toBe(-AI.passOffset);
    expect(memo.side).toBe(-1);
    expect(passing(memo, [slow(-1, 0.5)], -1.5, 12).pass).toBe(-AI.passOffset); // alongside
    expect(passing(memo, [slow(-2, 0.5)], -1.5, 12).pass).toBe(0); // cleared: move done
    expect(memo.target).toBe(-1);
  });

  it('ignores karts pulling away and holds station behind one blocking the lane', () => {
    const memo = { target: -1, side: 0 };
    const r = passing(memo, [slow(2, 0.2, 14)], 0, 12);
    expect(memo.target).toBe(-1);
    expect(r.speedCap).toBeCloseTo(13.6, 5);
  });
});

describe('pack and grid', () => {
  it('pulls rivals behind the player along and holds back the ones ahead, within ±catchUp', () => {
    expect(catchUpPace(0)).toBe(1);
    expect(catchUpPace(AI.catchUpGap)).toBeCloseTo(1 + AI.catchUp, 9);
    expect(catchUpPace(-1e4)).toBeCloseTo(1 - AI.catchUp, 9);
  });

  it('shuffles the rivals over every slot except the player’s', () => {
    const seen = new Set();
    const rnd = seededRandom(5);
    for (let k = 0; k < 40; k++) {
      const s = rivalSlots(5, 4, rnd);
      expect([...s].sort()).toEqual([0, 1, 2, 3, 5]);
      seen.add(s.join());
    }
    expect(seen.size).toBeGreaterThan(10);
  });
});

describe('computer pedals', () => {
  it('ease off the throttle at full lock and as the tail steps out', () => {
    expect(lockCap(0.5)).toBe(1);
    expect(lockCap(1)).toBeLessThan(0.5);
    expect(slipCap(0.02)).toBe(1);
    expect(slipCap(0.3)).toBeLessThan(0.3);
  });
});

describe('rival pace on track', () => {
  const lap = (track, you) => simulateRace(track, { laps: 3, field: 'solo', you, random: seededRandom(4) }).bestLap;

  it.each(TRACKS.filter((t) => ['tbc', 'interlagos', 'montreal'].includes(t.id)).map((t) => [t.id, t]))(
    '%s: a preferred line is not a hidden pace modifier, skill is',
    (id, track) => {
      const plus = lap(track, { line: 0.6 });
      const minus = lap(track, { line: -0.6 });
      expect(Math.abs(plus / minus - 1)).toBeLessThan(0.004);
      expect(lap(track, { skill: 0.955 })).toBeGreaterThan(lap(track, { skill: 1.02 }));
    },
    30000
  );
});
