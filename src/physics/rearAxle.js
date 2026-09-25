// The solid rear axle's spin (pure). Both rear tyres turn at one speed, so in a corner the inside one is
// driven faster than its patch moves and the outside one slower: they scrub against each other (a yaw
// moment that fights the turn) unless load transfer and jacking take the weight off the inside wheel.
// Integrated implicitly — the tyres' grip on the axle is stiff — with the brakes as Coulomb friction.

import { REAR_RADIUS, SLIP_SPEED_MIN, BRAKE_ASSIST_SLIP } from '../config/physics.js';
import { tyreForce, longStiffness } from './tyreForce.js';

const scratch = { fx: 0, fy: 0, s: 0 };

// Slip ratio of a rear patch moving forward at v (m/s) under an axle turning at omega (rad/s).
export const slipRatio = (omega, v) => (omega * REAR_RADIUS - v) / Math.max(Math.abs(v), SLIP_SPEED_MIN);

// omega: axle speed now; rear: [{ v (patch forward speed), fz, tan (slip-angle tangent), mu }] ×2;
// torque: drive (N·m, + forward); brake: brake torque (N·m, ≥ 0); inertia: kg·m² (engine included when
// the clutch is locked); assist: hold the rear at the edge of locking under braking. Returns omega.
export function spinAxle(omega, rear, torque, brake, inertia, dt, assist) {
  let reaction = 0; // N·m the tyres put back on the axle
  let stiff = 0; // d(reaction)/d(omega)
  for (const w of rear) {
    const den = Math.max(Math.abs(w.v), SLIP_SPEED_MIN);
    reaction += tyreForce(w.fz, w.tan, slipRatio(omega, w.v), w.mu, scratch).fx * REAR_RADIUS;
    stiff += (longStiffness(w.fz, w.mu) * REAR_RADIUS * REAR_RADIUS) / den;
  }
  const soft = inertia + dt * stiff;
  const free = omega + (dt * (torque - reaction)) / soft; // no brake
  const grab = (dt * brake) / soft; // how much speed the brake can take off this step
  let next = Math.abs(free) <= grab ? 0 : free - Math.sign(free) * grab; // Coulomb: stops, never reverses
  if (assist && brake > 0) {
    const v = (rear[0].v + rear[1].v) / 2;
    const edge = (v * (1 - BRAKE_ASSIST_SLIP)) / REAR_RADIUS; // axle speed at the braking-slip peak
    if (v > 0 && next < edge && free >= edge) next = edge; // ease the brake off just short of a lock
  }
  return next;
}
