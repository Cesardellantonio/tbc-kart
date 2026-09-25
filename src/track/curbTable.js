// Per-sample curb lookup, built once per track, so "is this wheel on a kerb?" is O(1) per frame.
// side[i]: +1 curb on the right, -1 on the left, 0 none; inner/outer: its extent from the centreline.

import { cornerRuns, curbInner, curbOuter } from './curbRuns.js';

export function curbTable(path) {
  const n = path.count;
  const table = { side: new Int8Array(n), inner: new Float32Array(n), outer: new Float32Array(n) };
  const inner = curbInner(path);
  for (const { side, indices } of cornerRuns(path)) {
    for (const i of indices) {
      table.side[i] = side;
      table.inner[i] = inner;
      table.outer[i] = curbOuter(path, i);
    }
  }
  return table;
}

// Wheel offsets in the kart frame: [along (+ = forward), across (+ = right)].
export const wheelLayout = (wheelbase, frontTrack, rearTrack) => [
  [wheelbase / 2, -frontTrack / 2],
  [wheelbase / 2, frontTrack / 2],
  [-wheelbase / 2, -rearTrack / 2],
  [-wheelbase / 2, rearTrack / 2],
];

// Which wheels touch a curb. state: {x, z, yaw}; index: nearest sample to the kart;
// wheels: wheelLayout(); tyre: half tyre width (m). Writes out.count (0–4), out.left / out.right
// (wheels on that side of the kart touching) and out.lateral (kart centre, m right of centreline).
export function wheelsOnCurb(table, path, state, index, wheels, tyre, out) {
  out.count = out.left = out.right = 0;
  out.lateral = index >= 0 ? path.lateral(state.x, state.z, index) : 0;
  if (index < 0) return out;
  const fx = -Math.sin(state.yaw);
  const fz = -Math.cos(state.yaw);
  const [rx, rz] = [-fz, fx]; // right = forward rotated a quarter turn clockwise (seen from above)
  for (const [along, across] of wheels) {
    const wx = state.x + fx * along + rx * across;
    const wz = state.z + fz * along + rz * across;
    const ahead = (wx - path.x[index]) * path.tx[index] + (wz - path.z[index]) * path.tz[index];
    const j = path.wrap(index + Math.round(ahead / path.spacing));
    const side = table.side[j];
    if (!side) continue;
    const reach = path.lateral(wx, wz, j) * side; // metres toward the curb's side of the track
    if (reach + tyre < table.inner[j] || reach - tyre > table.outer[j] + 0.1) continue;
    out.count++;
    if (across < 0) out.left++;
    else out.right++;
  }
  return out;
}
