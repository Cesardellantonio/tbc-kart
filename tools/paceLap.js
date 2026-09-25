// Solo lap times of the computer driver, for calibrating and checking the rivals' pace per circuit
// (tools/ai-pace.mjs, tests/ai.test.js).

import { simulateRace } from './simulate.js';
import { seededRandom } from '../src/core/math.js';

// Best of laps 2–3 driving alone at this corner pace (TRACK_PACE value) and skill.
export const soloLap = (track, pace, skill = 1) =>
  simulateRace(track, { laps: 3, field: 'solo', trackPace: pace, you: { skill }, random: seededRandom(4) }).bestLap;

// The circuit's reference lap: the computer driver's best at any corner pace. Past that pace it
// overdrives (runs wide, lifts for slides) and gets slower again. Returns { lap, pace }.
export function referenceLap(track) {
  let best = { lap: Infinity, pace: 1 };
  const tryPace = (pace) => {
    const lap = soloLap(track, pace);
    if (lap < best.lap) best = { lap, pace };
  };
  for (let pace = 0.8; pace <= 1.6 + 1e-9; pace += 0.05) tryPace(pace);
  const c = best.pace;
  for (let pace = c - 0.04; pace <= c + 0.04 + 1e-9; pace += 0.01) tryPace(pace);
  return best;
}
