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
  it('are ordered easiest → hardest, all at or below full pace, with a valid default', () => {
    const paces = Object.values(DIFFICULTY).map((d) => d.pace);
    expect(paces).toEqual([...paces].sort((a, b) => a - b));
    for (const p of paces) expect(p > 0 && p <= 1).toBe(true);
    expect(DIFFICULTY[DEFAULT_DIFFICULTY]).toBeTruthy();
  });

  it('make the rivals slower on easier levels, and they still race without incident', () => {
    const track = trackById('silverstone');
    const best = (level) => {
      const sim = simulateRace(track, { laps: 2, difficulty: DIFFICULTY[level].pace, random: seeded(11) });
      expect(sim.allFinished).toBe(true);
      expect(sim.resets).toBe(0);
      expect(sim.spins).toBe(0);
      return Math.min(...sim.results.filter((r) => r.code !== 'YOU').map((r) => r.bestLap));
    };
    const [amateur, club, pro] = ['amateur', 'club', 'pro'].map(best);
    expect(amateur).toBeGreaterThan(club * 1.02);
    expect(club).toBeGreaterThan(pro * 1.02);
  }, 60000);
});
