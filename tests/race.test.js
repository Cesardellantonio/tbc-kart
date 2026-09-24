// Lap timing and time formatting.

import { describe, it, expect } from 'vitest';
import { LapTimer } from '../src/race/LapTimer.js';
import { formatTime, formatDelta } from '../src/ui/format.js';

const N = 100;

// Drive `laps` laps forward from `from` (relative to the line) at one sample per `dt` seconds.
function drive(timer, from, samples, dt, t0 = 0) {
  const events = [];
  let t = t0;
  for (let k = 0; k <= samples; k++) {
    const e = timer.update(((from + k) % N + N) % N, t);
    if (e) events.push(e);
    t += dt;
  }
  return { events, t };
}

describe('LapTimer', () => {
  it('starts timing at the first line crossing and completes a lap after a full loop', () => {
    const timer = new LapTimer(N, 0);
    const { events } = drive(timer, -10, 10 + N + 5, 0.1);
    expect(events).toHaveLength(1);
    expect(events[0].lap).toBe(1);
    expect(events[0].time).toBeCloseTo(N * 0.1, 5);
    expect(events[0].isBest).toBe(true);
  });

  it('tracks the best lap and reports the delta of slower laps', () => {
    const timer = new LapTimer(N, 0);
    let r = drive(timer, -5, 5 + N, 0.1); // lap 1: 10 s
    r = drive(timer, 1, N - 1, 0.12, r.t); // lap 2: slower
    const lap2 = r.events.at(-1);
    expect(lap2.isBest).toBe(false);
    expect(lap2.delta).toBeGreaterThan(1.5);
    expect(timer.best).toBeCloseTo(10, 5);
  });

  it('does not count a lap for rocking back and forth across the line', () => {
    const timer = new LapTimer(N, 0);
    let t = 0;
    for (const i of [95, 98, 1, 3, 97, 99, 2, 4, 96, 0, 5]) timer.update(i, (t += 0.1));
    expect(timer.lap).toBe(1);
    expect(timer.lastLap).toBe(null);
  });

  it('gives a live delta against the best lap', () => {
    const timer = new LapTimer(N, 0);
    let r = drive(timer, -5, 5 + N, 0.1);
    r = drive(timer, 1, 49, 0.08, r.t); // halfway round, faster
    expect(timer.delta(r.t - 0.08)).toBeLessThan(0);
  });
});

describe('format', () => {
  it('formats lap times and deltas', () => {
    expect(formatTime(83.4567)).toBe('1:23.457');
    expect(formatTime(59.9996)).toBe('1:00.000');
    expect(formatTime(null)).toBe('-:--.---');
    expect(formatDelta(-0.2314)).toBe('−0.231');
    expect(formatDelta(1.5)).toBe('+1.500');
    expect(formatDelta(null)).toBe('');
  });
});
