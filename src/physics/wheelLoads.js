// Normal load on each contact patch (pure). Karts have no suspension: load moves with the acceleration
// through the stiff frame (longitudinally to the front under braking, laterally to the outside in a
// corner, mostly at the rear) and with caster jacking from the steering, which loads the inside front
// and outside rear and unloads the inside rear — lifting it, at the limit, so the solid axle can turn.

import {
  MASS, GRAVITY, WHEELBASE, FRONT_TRACK, REAR_TRACK, REAR_WEIGHT, COG_HEIGHT, FRONT_ROLL_SHARE, JACKING,
} from '../config/physics.js';

const W = MASS * GRAVITY;
const FRONT = (W * (1 - REAR_WEIGHT)) / 2;
const REAR = (W * REAR_WEIGHT) / 2;

// ax, ay: body accelerations (m/s², + = forward / toward the left); delta: road-wheel angle (rad, + = left).
// Writes out[0..3] = [front-left, front-right, rear-left, rear-right] (N), never negative, summing to W.
export function wheelLoads(ax, ay, delta, out) {
  const pitch = (MASS * ax * COG_HEIGHT) / WHEELBASE / 2; // per wheel, off the front onto the rear
  const roll = MASS * ay * COG_HEIGHT; // N·m to carry from the left pair to the right pair
  const front = (roll * FRONT_ROLL_SHARE) / FRONT_TRACK;
  const rear = (roll * (1 - FRONT_ROLL_SHARE)) / REAR_TRACK;
  const jack = (JACKING * W * delta) / 4; // + turning left: onto front-left and rear-right
  out[0] = FRONT - pitch - front + jack;
  out[1] = FRONT - pitch + front - jack;
  out[2] = REAR + pitch - rear - jack;
  out[3] = REAR + pitch + rear + jack;
  let sum = 0;
  for (let i = 0; i < 4; i++) sum += out[i] = Math.max(0, out[i]);
  for (let i = 0; i < 4; i++) out[i] *= W / sum; // a lifted wheel's share goes to the others
  return out;
}
