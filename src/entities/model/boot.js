// Racing boot: a lofted box with a flat sole, a small heel block and a toe that narrows and drops,
// instead of an ellipsoid (which from the cockpit read as two horns pointing at the eye).
// Boot space: origin at the back of the heel on the sole, toe toward −Z, y up. Metres.

import { gridSurface, ring, cap } from './shapes.js';
import { v3 } from './primitives.js';

// Stations heel → toe: [z, half width, top height, sole height] (m). A thin karting-boot sole: the
// heel block is ~1 cm deep, then the sole runs flat to a toe that tapers up and in.
const BOOT = [
  [0.0, 0.03, 0.065, -0.004],
  [-0.015, 0.039, 0.088, -0.01],
  [-0.06, 0.043, 0.092, -0.01],
  [-0.075, 0.044, 0.088, 0],
  [-0.14, 0.046, 0.066, 0],
  [-0.2, 0.045, 0.05, 0],
  [-0.24, 0.039, 0.037, 0.003],
  [-0.26, 0.024, 0.024, 0.008],
];
export const BOOT_PITCH = 0.52; // rad the sole tilts toes-up on the pedal (~30°)

export function bootGeometry() {
  const X = v3(1, 0, 0);
  const Y = v3(0, 1, 0);
  // Rows sit their centre a third of the way up, so the boxy ring is flat underneath and full on top
  const rows = BOOT.map(([z, hw, top, sole]) => {
    const c = sole + (top - sole) * 0.35;
    return ring(v3(0, c, z), X, Y, hw, top - c, 10, 3.6, c - sole);
  });
  const out = (i, j) => rows[i][j].clone().sub(v3(0, rows[i][j].y > 0.03 ? 0.02 : 0.04, BOOT[i][0]));
  const inside = v3(0, 0.035, -0.1);
  return [gridSurface(rows, { wrap: true, out }), cap(rows[0], inside), cap(rows.at(-1), inside)];
}
