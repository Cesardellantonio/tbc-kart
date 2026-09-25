// Computer drivers: the braking speed plan, overtaking memory, pack pull and grid, pedal shaping and
// the racing line (what they add up to on each circuit: tests/aipace.test.js).

import { describe, it, expect } from 'vitest';
import { speedPlan, plannedSpeed } from '../src/race/speedPlan.js';
import { passing } from '../src/race/passing.js';
import { catchUpPace, rivalSlots } from '../src/race/pack.js';
import { lockCap, slipCap } from '../src/race/speedControl.js';
import { racingLine } from '../src/race/racingLine.js';
import { pathOf } from '../src/track/validate.js';
import { AI } from '../src/config/race.js';
import { seededRandom } from '../src/core/math.js';
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
    expect(at(before, { skill: 1.1 })).toBeCloseTo(plan[i] * 1.1, 5);
    expect(at(before, { maxSpeed: 3 })).toBe(3);
  });
});

describe('overtaking', () => {
  const slow = (ahead, lateral, speed = 10) => ({ ahead, lateral, speed });

  it('tucks in for the slipstream, then pulls out and keeps the target and side through the pass', () => {
    const memo = { target: -1, side: 0 };
    const dt = 1 / 60;
    expect(passing(memo, [slow(8.5, 0.3)], 0, 12, dt).pass).toBe(0); // acquired, still drafting
    expect(memo.target).toBe(0);
    // Close enough: pull out. Straight road ahead, and it sits right of centre: pass on the left.
    expect(passing(memo, [slow(5, 0.3)], 0, 12, dt).pass).toBe(-AI.passOffset);
    // Pulled out beside it the gap grows past the pick-up window (1.6 m): the target is kept…
    expect(passing(memo, [slow(1, 0.8)], -1.9, 12, dt, 1).pass).toBe(-AI.passOffset);
    // …and the side stays latched even when it drifts across to my left or a corner comes up.
    expect(passing(memo, [slow(0.5, -2.2)], -1.9, 12, dt, 1).pass).toBe(-AI.passOffset);
    expect(memo.side).toBe(-1);
    expect(passing(memo, [slow(-1, 0.5)], -1.5, 12, dt).pass).toBe(-AI.passOffset); // alongside
    expect(passing(memo, [slow(-2, 0.5)], -1.5, 12, dt).pass).toBe(0); // cleared: move done
    expect(memo.target).toBe(-1);
  });

  it('pulls out to the inside of the next corner', () => {
    const memo = { target: -1, side: 0 };
    expect(passing(memo, [slow(5, -0.5)], 0, 12, 1 / 60, 1).pass).toBe(AI.passOffset);
    expect(passing({ target: -1, side: 0 }, [slow(5, -0.5)], 0, 12, 1 / 60, -1).pass).toBe(-AI.passOffset);
  });

  it('gives up a move that never draws alongside, drops back in line, then tries again', () => {
    const memo = { target: -1, side: 0 };
    const dt = 0.1;
    let t = 0;
    while (t < AI.passGiveUp - dt / 2) expect(passing(memo, [slow(4, 0)], 0, 12, dt).pass).not.toBe(0), (t += dt);
    expect(passing(memo, [slow(4, 0)], 0, 12, dt).pass).toBe(0); // abandoned
    let back = 0; // time back in line before the next attempt
    while (passing(memo, [slow(4, 0)], 0, 12, dt).pass === 0 && back < 10) back += dt;
    expect(back).toBeCloseTo(AI.passRetry, 0);
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

describe('racing line', () => {
  const path = pathOf(tbc);
  const line = racingLine(path, AI);

  it('turns in from the outside, clips the apex and runs out wide again (the hairpin)', () => {
    let apex = 0;
    for (let i = 0; i < path.count; i++) if (Math.abs(path.curvature[i]) > Math.abs(path.curvature[apex])) apex = i;
    const inside = (m) => line[path.wrap(apex + Math.round(m / path.spacing))] * Math.sign(path.curvature[apex]);
    expect(inside(-15)).toBeLessThan(-1.5); // outside on the way in
    expect(inside(0)).toBeGreaterThan(0.8); // inside at the apex
    expect(inside(15)).toBeLessThan(-1); // outside again on the way out
  });

  it('is smoother and shorter than the centreline, within the usable width', () => {
    const lim = Math.min(AI.lineMax, path.halfWidth - AI.lineEdge);
    expect(Math.max(...line.map(Math.abs))).toBeLessThanOrEqual(lim + 1e-6);
    let [len, bend, bendC] = [0, 0, 0];
    for (let i = 0; i < path.count; i++) {
      const [a, b, c] = [-1, 0, 1].map((d) => path.offset(path.wrap(i + d), line[path.wrap(i + d)]));
      len += Math.hypot(b.x - a.x, b.z - a.z);
      const k = Math.abs((b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x)) / path.spacing ** 3;
      bend += k * k;
      bendC += path.curvature[i] ** 2;
    }
    expect(len).toBeLessThan(path.length * 0.97);
    expect(bend).toBeLessThan(bendC);
  });
});

