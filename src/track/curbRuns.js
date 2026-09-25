// Where the curbs go (pure): runs of samples on the inside of tight corners, and how far each
// curb reaches from the centreline. Shared by the curb mesh and the per-frame kerb check.

import { CURB_WIDTH, CURB_OVERLAP, CURB_MIN_CURVATURE, CURB_MIN_LENGTH, CURB_EXTEND } from '../config/track.js';

// Runs of consecutive samples that turn the same way sharply enough to deserve a curb.
export function cornerRuns(path) {
  const n = path.count;
  const ext = Math.round(CURB_EXTEND / path.spacing);
  const side = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    if (Math.abs(path.curvature[i]) < CURB_MIN_CURVATURE) continue;
    for (let d = -ext; d <= ext; d++) {
      const j = path.wrap(i + d);
      if (!side[j]) side[j] = Math.sign(path.curvature[i]);
    }
  }
  const start = side.indexOf(0);
  if (start < 0) return [];
  const runs = [];
  let run = null;
  for (let k = 1; k <= n; k++) {
    const i = path.wrap(start + k);
    if (run && side[i] === run.side) run.indices.push(i);
    else {
      if (run) runs.push(run);
      run = side[i] ? { side: side[i], indices: [i] } : null;
    }
  }
  return runs.filter((r) => r.indices.length * path.spacing >= CURB_MIN_LENGTH);
}

// Distance from the centreline to the curb's inner edge (on the asphalt) and outer edge at sample i.
// The outer edge pulls in at a tight apex so the strip never folds over itself.
export const curbInner = (path) => path.halfWidth - CURB_OVERLAP;
export function curbOuter(path, i) {
  const inner = curbInner(path);
  return Math.max(inner + 0.12, Math.min(inner + CURB_WIDTH, 0.92 / Math.max(1e-6, Math.abs(path.curvature[i]))));
}
