// Qualifying (pure): everyone on track at once, spread evenly round the lap so each has clean air; a
// timed session (longer on longer laps); the grid is set by each driver's best lap.

import { QUALI } from '../config/race.js';

// Session length (s) for a circuit: about QUALI.laps laps at a typical pace, within QUALI.min–max.
export const sessionLength = (pathLength) => Math.min(QUALI.max, Math.max(QUALI.min, (pathLength / QUALI.pace) * QUALI.laps));

// count karts spread round the lap, starting QUALI.lead m past the start line: centreline sample
// indices, first to last. Each drives an out-lap to the line, then its timed laps.
export function spreadIndices(path, startIndex, count) {
  const lead = Math.round(QUALI.lead / path.spacing);
  const span = path.count - 2 * lead;
  return Array.from({ length: count }, (_, k) => path.wrap(startIndex + lead + Math.round((k * span) / count)));
}

// entries: [{ code, bestLap }] → the grid: best lap first; no time goes to the back (in entry order).
export function gridOrder(entries) {
  return [...entries].sort((a, b) => (a.bestLap ?? Infinity) - (b.bestLap ?? Infinity));
}
