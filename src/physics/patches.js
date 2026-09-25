// Where each tyre touches the ground relative to the centre of gravity, and how fast each contact
// patch moves in its own wheel frame (pure). Order: front-left, front-right, rear-left, rear-right.

import { WHEELBASE, REAR_WEIGHT, FRONT_TRACK, REAR_TRACK, SLIP_SPEED_MIN } from '../config/physics.js';

export const CG_TO_FRONT = WHEELBASE * REAR_WEIGHT;
export const CG_TO_REAR = WHEELBASE * (1 - REAR_WEIGHT);
// [forward, left] of each patch from the CoG (m)
export const PATCHES = [
  [CG_TO_FRONT, FRONT_TRACK / 2],
  [CG_TO_FRONT, -FRONT_TRACK / 2],
  [-CG_TO_REAR, REAR_TRACK / 2],
  [-CG_TO_REAR, -REAR_TRACK / 2],
];

// vf, vl: body velocity (m/s, + = forward / left); r: yaw rate (rad/s, + = left); delta: front road-wheel
// angle (rad). Writes out[i].long / .lat: each patch's velocity along / across its own wheel.
export function patchVelocities(vf, vl, r, delta, out) {
  const c = Math.cos(delta);
  const s = Math.sin(delta);
  for (let i = 0; i < 4; i++) {
    const [x, y] = PATCHES[i];
    const u = vf - r * y;
    const w = vl + r * x;
    out[i].long = i < 2 ? u * c + w * s : u;
    out[i].lat = i < 2 ? w * c - u * s : w;
  }
  return out;
}

// Steady-state slip-angle tangent of a patch (+ = the tyre pushes toward the wheel's left).
export const slipTangent = (v) => -v.lat / Math.max(Math.abs(v.long), SLIP_SPEED_MIN);
