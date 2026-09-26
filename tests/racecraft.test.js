// Racecraft (race/driverCraft.js): corners found on the speed plan, corner-to-corner scatter and
// mistakes (likelier under pressure), and the one-move defence of the inside.

import { describe, it, expect } from 'vitest';
import { cornerMap, rollCorner, pressureFrom, defending } from '../src/race/driverCraft.js';
import { drivingPlan } from '../src/race/speedPlan.js';
import { racingLine } from '../src/race/racingLine.js';
import { pathOf } from '../src/track/validate.js';
import { AI, DIFFICULTY } from '../src/config/race.js';
import { seededRandom } from '../src/core/math.js';
import { trackById } from '../src/tracks/index.js';
import { simulateRace } from '../tools/simulate.js';

describe('racecraft — corners', () => {
  it('marks every sample with the slow point it is heading for, one per real corner', () => {
    const path = pathOf(trackById('silverstone'));
    const plan = drivingPlan(path, racingLine(path, AI));
    const map = cornerMap(plan, path);
    expect(map.every((c) => c >= 0)).toBe(true);
    const apexes = [...new Set(map)];
    expect(apexes.length).toBeGreaterThanOrEqual(6);
    expect(apexes.length).toBeLessThanOrEqual(20);
    for (const a of apexes) expect(map[a]).toBe(a); // an apex belongs to its own corner
  });
});

describe('racecraft — taking a corner', () => {
  const roll = (level, pressured, n = 20000) => {
    const random = seededRandom(9);
    const takes = Array.from({ length: n }, () => rollCorner(level, pressured, random));
    const clean = takes.filter((t) => !t.mistake).map((t) => t.factor - 1);
    const sd = Math.sqrt(clean.reduce((a, x) => a + x * x, 0) / clean.length);
    return { rate: 1 - clean.length / n, sd, takes };
  };

  it('scatters each corner by about sigma and makes mistakes at the level’s rate', () => {
    const { rate, sd } = roll(DIFFICULTY.club, false);
    expect(sd).toBeCloseTo(DIFFICULTY.club.sigma, 2);
    expect(rate).toBeCloseTo(DIFFICULTY.club.mistakes, 2);
  });

  it('makes more mistakes with a kart close behind; most are in too hot', () => {
    const calm = roll(DIFFICULTY.club, false).rate;
    const { rate, takes } = roll(DIFFICULTY.club, true);
    expect(rate).toBeCloseTo(calm * AI.pressureMistakes, 2);
    const errors = takes.filter((t) => t.mistake);
    expect(errors.filter((t) => t.mistake === 'hot').length / errors.length).toBeCloseTo(AI.mistakeHot, 1);
    for (const t of errors) expect(Math.abs(t.factor - 1)).toBeGreaterThanOrEqual(AI.mistakeMin - 1e-9);
  });

  it('never errs on a perfect level', () => {
    expect(roll({ pace: 1, sigma: 0, mistakes: 0 }, true).takes.every((t) => t.factor === 1)).toBe(true);
  });
});

describe('racecraft — defending', () => {
  const always = () => 0; // random() below any odds: the driver always decides to defend

  it('feels pressure only from a kart close behind that is keeping up', () => {
    expect(pressureFrom([{ ahead: -3, lateral: 0.5, speed: 12 }], 0, 12)).toBeTruthy();
    expect(pressureFrom([{ ahead: -3, lateral: 0.5, speed: 9 }], 0, 12)).toBeNull(); // dropping back
    expect(pressureFrom([{ ahead: -AI.defendBehind - 1, lateral: 0, speed: 13 }], 0, 12)).toBeNull();
    expect(pressureFrom([{ ahead: 3, lateral: 0, speed: 13 }], 0, 12)).toBeNull(); // ahead of me
  });

  it('covers the inside once per corner, holds it, then cools down before another move', () => {
    const memo = {};
    const attacker = { ahead: -3, lateral: 0, speed: 12 };
    expect(defending(memo, attacker, 1, 100, 1, 0.1, always)).toBe(1);
    expect(defending(memo, attacker, 1, 100, 1, AI.defendHold - 0.2, always)).toBe(1); // still holding
    expect(defending(memo, attacker, 1, 100, 1, 0.3, always)).toBe(0); // hold over: back to the line
    expect(defending(memo, attacker, -1, 200, 1, 0.1, always)).toBe(0); // next corner, still cooling down
    expect(defending(memo, attacker, -1, 300, 1, AI.defendCool, always)).toBe(-1);
  });

  it('never defends with nobody behind, on a straight, or when the driver is not the defending kind', () => {
    const attacker = { ahead: -3, lateral: 0, speed: 12 };
    expect(defending({}, null, 1, 1, 1, 0.1, always)).toBe(0);
    expect(defending({}, attacker, 0, 1, 1, 0.1, always)).toBe(0);
    expect(defending({}, attacker, 1, 1, 0, 0.1, () => 0.01)).toBe(0);
  });
});

describe('racecraft — in a race', () => {
  it('rivals err and defend now and then, all run the same top speed, and the race stays clean', () => {
    const sim = simulateRace(trackById('silverstone'), { laps: 3, difficulty: DIFFICULTY.club, random: seededRandom(3) });
    const rivals = sim.results.filter((r) => r.code !== 'YOU');
    expect(sim.allFinished).toBe(true);
    expect(sim.resets).toBe(0);
    expect(rivals.reduce((a, r) => a + r.mistakes, 0)).toBeGreaterThan(0);
    expect(rivals.reduce((a, r) => a + r.defences, 0)).toBeGreaterThan(0);
    const tops = rivals.map((r) => r.topSpeedKmh);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(3); // same karts, flat out
  }, 60000);
});
