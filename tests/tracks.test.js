// Every circuit: passes the design rules (track/validate.js) and a two-lap, six-kart AI race
// finishes with nobody stuck — the proof a layout is drivable with the real physics.

import { describe, it, expect } from 'vitest';
import { ALL_TRACKS, TRACKS } from '../src/tracks/index.js';
import { validateTrack } from '../src/track/validate.js';
import { simulateRace } from '../tools/simulate.js';

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

  it('can be raced: six AI karts finish two laps without getting stuck', () => {
    const sim = simulateRace(track, { laps: 2 });
    expect(sim.allFinished).toBe(true);
    expect(sim.resets).toBe(0);
  }, 30000);
});
