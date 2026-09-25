// The rivals' pace on every circuit, with the real physics: calibrated to the same distance off each
// circuit's reference lap (config/race.js TRACK_PACE), monotonic in skill, faster than never braking,
// and set by skill rather than a driver's preferred line.

import { describe, it, expect, beforeAll } from 'vitest';
import { trackPace } from '../src/race/pack.js';
import { simulateRace } from '../tools/simulate.js';
import { referenceLap, soloLap } from '../tools/paceLap.js';
import { AI, RIVALS } from '../src/config/race.js';
import { seededRandom } from '../src/core/math.js';
import { TRACKS } from '../src/tracks/index.js';

// Per circuit: the reference lap is the computer driver's best at any corner pace (tools/paceLap.js).
describe.each(TRACKS.map((t) => [t.id, t]))('rival pace on %s', (id, track) => {
  let ref;
  const pace = trackPace(id);
  const lap = (skill = 1, you = {}) =>
    simulateRace(track, { laps: 3, field: 'solo', you: { skill, ...you }, random: seededRandom(4) }).bestLap;
  beforeAll(() => (ref = referenceLap(track)));

  it('is calibrated: a skill-1 rival laps AI.paceMargin off the reference lap', () => {
    expect(soloLap(track, pace) / (ref.lap * (1 + AI.paceMargin))).toBeCloseTo(1, 1.7); // within ±1 %
  }, 30000);

  it('gets quicker with every step of skill across the whole field (form, pack pull and attack included)', () => {
    const skills = [0.9, 0.94, 0.98, 1, 1.02, 1.06, 1.1, 1.15];
    const laps = skills.map((skill) => soloLap(track, pace, skill));
    for (let k = 1; k < laps.length; k++) expect(laps[k], `skill ${skills[k]}`).toBeLessThan(laps[k - 1]);
  }, 30000);

  it('never braking is slower than braking well: overdriving into the barriers costs time', () => {
    const flatOut = simulateRace(track, { laps: 3, field: 'solo', tweak: (c) => ({ ...c, throttle: 1, brake: 0 }), random: seededRandom(2) }).bestLap;
    expect(flatOut).toBeGreaterThan(ref.lap * 1.01);
  }, 30000);

  it('a preferred line is not a hidden pace modifier: the rivals keep their skill order', () => {
    const shift = Math.abs(lap(1, { line: 0.6 }) / lap(1, { line: -0.6 }) - 1);
    expect(shift).toBeLessThan(lap(0.98) / lap(1) - 1); // less than one step of the skill ladder
    const order = RIVALS.map((r) => ({ code: r.code, t: lap(r.skill, { line: r.line }) })).sort((a, b) => a.t - b.t);
    expect(order.map((r) => r.code)).toEqual(RIVALS.map((r) => r.code));
  }, 30000);
});
