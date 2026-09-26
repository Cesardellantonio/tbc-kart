// Rival levels (config/race.js DIFFICULTY): ordered, slower rivals on easier levels, still racing cleanly.

import { describe, it, expect } from 'vitest';
import { DIFFICULTY, DEFAULT_DIFFICULTY } from '../src/config/race.js';
import { trackById } from '../src/tracks/index.js';
import { simulateRace } from '../tools/simulate.js';

const seeded = (a) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('rival levels', () => {
  it('are ordered easiest → hardest — quicker, steadier, fewer mistakes — with a valid default', () => {
    const levels = Object.values(DIFFICULTY);
    const up = (xs) => expect(xs).toEqual([...xs].sort((a, b) => a - b));
    up(levels.map((d) => d.pace));
    up(levels.map((d) => -d.sigma));
    up(levels.map((d) => -d.mistakes));
    for (const d of levels) expect(d.pace > 0.5 && d.pace < 1.3 && d.mistakes < 0.2).toBe(true);
    expect(DIFFICULTY[DEFAULT_DIFFICULTY]).toBeTruthy();
  });

  it('make the rivals slower on easier levels, and they still race without incident', () => {
    const track = trackById('silverstone');
    const best = (level) => {
      const sim = simulateRace(track, { laps: 2, difficulty: DIFFICULTY[level], random: seeded(11) });
      expect(sim.allFinished).toBe(true);
      expect(sim.resets).toBe(0);
      expect(sim.spins).toBe(0);
      return Math.min(...sim.results.filter((r) => r.code !== 'YOU').map((r) => r.bestLap));
    };
    const [amateur, club, pro, elite] = ['amateur', 'club', 'pro', 'elite'].map(best);
    expect(amateur).toBeGreaterThan(club * 1.02);
    expect(club).toBeGreaterThan(pro * 1.02);
    expect(pro).toBeGreaterThan(elite * 1.01);
  }, 90000);
});
