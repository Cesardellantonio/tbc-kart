// Starting grid (pure): staggered two-wide rows behind the start line.

import { GRID } from '../config/race.js';
import { GRID_BACK } from '../config/track.js';

// Grid slot s (0 = pole) → { x, z, yaw, i } on the track.
export function gridSpot(path, startIndex, s) {
  const back = GRID_BACK + Math.floor(s / 2) * GRID.rowGap + (s % 2) * (GRID.rowGap / 2);
  const i = path.wrap(startIndex - Math.round(back / path.spacing));
  const p = path.offset(i, (s % 2 ? 1 : -1) * GRID.lateral);
  return { x: p.x, z: p.z, yaw: path.heading(i), i };
}

// Metres of straight-ish track the full grid needs behind the line.
export const gridDepth = (slots) => GRID_BACK + Math.ceil(slots / 2) * GRID.rowGap + 2;
