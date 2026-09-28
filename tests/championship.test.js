// Championship mode (race/championship.js, race/qualifying.js): points and standings, the saved
// season, and qualifying — a timed session with everyone spread round the lap, grid by best lap.

import { describe, it, expect } from 'vitest';
import { newSeason, scoreRound, standings, summary, seasonDone, roundTrack, pointsFor, loadSeason, saveSeason } from '../src/race/championship.js';
import { sessionLength, spreadIndices, gridOrder } from '../src/race/qualifying.js';
import { RaceField } from '../src/race/RaceField.js';
import { LapTimer } from '../src/race/LapTimer.js';
import { CHAMPIONSHIP, QUALI } from '../src/config/race.js';
import { pathOf } from '../src/track/validate.js';
import { TRACKS } from '../src/tracks/index.js';

const drivers = ['YOU', 'AAA', 'BBB', 'CCC'].map((code, k) => ({ code, name: code, color: k }));
const season = () => newSeason(['tbc', 'monza', 'spa'], drivers, 'club');
const cls = (codes, best = {}) => codes.map((code) => ({ code, bestLap: best[code] ?? 30 }));

describe('championship — points', () => {
  it('pays 25-18-15-12-10-8-6-4-2-1 and a point for the fastest lap in the top ten', () => {
    expect([1, 2, 3, 10, 11, 12].map((p) => pointsFor(p))).toEqual([25, 18, 15, 1, 0, 0]);
    expect(pointsFor(1, true)).toBe(25 + CHAMPIONSHIP.fastestLap);
    expect(pointsFor(11, true)).toBe(0);
  });

  it('scores a round, moves the season on and leaves the old one alone', () => {
    const s0 = season();
    const { season: s1, scored } = scoreRound(s0, cls(['BBB', 'YOU', 'AAA', 'CCC'], { AAA: 28 }));
    expect(scored).toEqual({ BBB: 25, YOU: 18, AAA: 16, CCC: 12 });
    expect(s0.round).toBe(0);
    expect(s1.round).toBe(1);
    expect(roundTrack(s1)).toBe('monza');
    expect(s1.results[0]).toEqual({ track: 'tbc', order: ['BBB', 'YOU', 'AAA', 'CCC'], fastest: 'AAA' });
    expect(standings(s1).map((d) => d.code)).toEqual(['BBB', 'YOU', 'AAA', 'CCC']);
    expect(summary(s1)).toEqual({ round: 2, of: 3, position: 2, points: 18, done: false });
  });

  it('breaks a points tie on wins', () => {
    let s = season();
    s = scoreRound(s, cls(['AAA', 'YOU', 'BBB', 'CCC'], { YOU: 29 })).season; // YOU 18 + fastest lap
    s = scoreRound(s, cls(['BBB', 'CCC', 'YOU', 'AAA'], { BBB: 29 })).season;
    s = scoreRound(s, cls(['CCC', 'BBB', 'YOU', 'AAA'], { CCC: 29 })).season;
    const table = standings(s);
    expect(table.map((d) => [d.code, d.points])).toEqual([['BBB', 59], ['CCC', 56], ['AAA', 49], ['YOU', 49]]);
    expect(seasonDone(s)).toBe(true);
  });

  it('saves and loads the season, and survives broken storage', () => {
    const mem = new Map();
    const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
    const s = scoreRound(season(), cls(['YOU', 'AAA', 'BBB', 'CCC'])).season;
    saveSeason(s, storage);
    expect(loadSeason(storage)).toEqual(s);
    saveSeason(null, storage);
    expect(loadSeason(storage)).toBe(null);
    mem.set(CHAMPIONSHIP.key, '{not json');
    expect(loadSeason(storage)).toBe(null);
  });
});

describe('qualifying', () => {
  it('lasts a few laps: longer on longer circuits, within bounds', () => {
    expect(sessionLength(100)).toBe(QUALI.min);
    expect(sessionLength(1e5)).toBe(QUALI.max);
    expect(sessionLength(500)).toBeGreaterThan(sessionLength(400));
  });

  it('spreads the field evenly round the lap, clear of the line', () => {
    const path = pathOf(TRACKS[0]);
    const start = 100;
    const at = spreadIndices(path, start, 12);
    expect(new Set(at).size).toBe(12);
    const ahead = at.map((i) => (i - start + path.count) % path.count);
    expect(Math.min(...ahead)).toBeGreaterThanOrEqual(Math.round(QUALI.lead / path.spacing));
    expect(Math.max(...ahead)).toBeLessThan(path.count - Math.round(QUALI.lead / path.spacing) + 1);
  });

  it('sets the grid by best lap, drivers without a time at the back', () => {
    expect(gridOrder([{ code: 'A', bestLap: 31 }, { code: 'B', bestLap: null }, { code: 'C', bestLap: 30.5 }]).map((e) => e.code)).toEqual(['C', 'A', 'B']);
  });

  it('times from the first line crossing after an out-lap, wherever the kart starts', () => {
    const t = new LapTimer(1000, 0);
    t.outLap = true;
    t.update(250, 0); // a quarter of a lap past the line
    for (let i = 251, time = 0.01; i <= 1000; i++, time += 0.01) t.update(i % 1000, time);
    expect(t.lap).toBe(1); // crossed once: lap 1 under way, no lap time yet
    let event = null;
    for (let i = 1, time = 7.5; i <= 1000; i++, time += 0.02) event = t.update(i % 1000, time) ?? event;
    expect(event.lap).toBe(1);
    expect(event.time).toBeCloseTo(20, 0);
  });

  it('orders a timed field by best lap, and ends each kart at its first crossing after the flag', () => {
    const f = new RaceField(100, 0, 3, [{ code: 'A' }, { code: 'B' }], { timed: true });
    const drive = (idx, t) => f.update(idx, t);
    let clock = 0;
    const lapBoth = (dtA, dtB) => {
      for (let i = 1; i <= 100; i++) drive([i % 100, Math.max(0, Math.round(i * (dtA / dtB))) % 100], (clock += dtA / 100));
    };
    drive([10, 60], 0);
    lapBoth(1, 1); // out-laps
    lapBoth(1, 1);
    expect(f.entries.every((e) => e.bestLap !== null)).toBe(true);
    f.entries[1].bestLap = f.entries[0].bestLap - 0.5;
    f.update([20, 70], clock + 0.1);
    expect(f.order[0].code).toBe('B');
    expect(f.gap(f.entries[0], 0)).toBeCloseTo(0.5, 5);
    f.flag(clock);
    lapBoth(1, 1);
    lapBoth(1, 1);
    expect(f.entries.every((e) => e.finishTime !== null)).toBe(true);
  });
});
