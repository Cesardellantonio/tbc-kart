// Every circuit: passes the design rules (track/validate.js) and a two-lap, six-kart AI race
// finishes with nobody stuck — the proof a layout is drivable with the real physics.

import { describe, it, expect } from 'vitest';
import { ALL_TRACKS, TRACKS } from '../src/tracks/index.js';
import { validateTrack } from '../src/track/validate.js';
import { simulateRace } from '../tools/simulate.js';
import { AI } from '../src/config/race.js';
import { seededRandom } from '../src/core/math.js';

describe('track registry', () => {
  it('has unique ids and the metadata the menus need', () => {
    expect(new Set(ALL_TRACKS.map((t) => t.id)).size).toBe(ALL_TRACKS.length);
    for (const t of TRACKS) {
      for (const k of ['id', 'name', 'location', 'inspiredBy', 'blurb']) expect(t[k], `${t.id}.${k}`).toBeTruthy();
    }
  });
});

describe.each(TRACKS.map((t) => [t.id, t]))('%s', (id, track) => {
  it('passes the design rules', () => {
    expect(validateTrack(track).problems).toEqual([]);
  });

  it('can be raced: six AI karts finish two laps without getting stuck, and a GP lasts ~2–2.5 min', () => {
    const sim = simulateRace(track, { laps: 2, random: seededRandom(1) });
    expect(sim.allFinished).toBe(true);
    expect(sim.resets).toBe(0);
    // Race distance: the lap count (3–8) that brings the winner's race closest to 140 s.
    const lap = Math.min(...sim.results.map((r) => r.finishTime)) / 2;
    const off = (laps) => Math.abs(laps * lap - 140);
    expect(track.laps).toBeGreaterThanOrEqual(3);
    expect(track.laps).toBeLessThanOrEqual(8);
    for (let laps = 3; laps <= 8; laps++) expect(off(track.laps), `${laps} laps would be closer`).toBeLessThanOrEqual(off(laps) + 5);
  }, 30000);

  it('never braking is slower than the AI: overdriving into the barriers costs time', () => {
    const solo = (tweak) => simulateRace(track, { laps: 3, field: 'solo', tweak, random: seededRandom(2) }).bestLap;
    const flatOut = solo((c) => ({ ...c, throttle: 1, brake: 0 })); // the AI's own steering, pedal to the floor
    expect(flatOut).toBeGreaterThan(solo(null) * 1.005);
  }, 30000);

  it('stays drivable with every rival pushed to the full pack pull', () => {
    const sim = simulateRace(track, { laps: 2, pace: 1 + AI.catchUp, random: seededRandom(3) });
    expect(sim.allFinished).toBe(true);
    expect(sim.resets).toBe(0);
  }, 30000);
});
