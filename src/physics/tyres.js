// Tyre and axle-load helpers for the single-track kart model. Pure functions, SI units.

import {
  MASS, GRAVITY, WHEELBASE, REAR_WEIGHT, COG_HEIGHT, YAW_INERTIA,
  TYRE_PEAK_SLIP, TYRE_SHAPE, TYRE_SLIDE_MIN, SLIP_SPEED_MIN, LOAD_MIN,
} from '../config/physics.js';

const B = Math.tan(Math.PI / (2 * TYRE_SHAPE)) / TYRE_PEAK_SLIP;

// Axle positions relative to the centre of gravity (m).
export const CG_TO_FRONT = WHEELBASE * REAR_WEIGHT;
export const CG_TO_REAR = WHEELBASE * (1 - REAR_WEIGHT);

// Mass an axle "feels" sideways (translation + yaw about the CoG), kg.
export const AXLE_MASS_FRONT = 1 / (1 / MASS + CG_TO_FRONT ** 2 / YAW_INERTIA);
export const AXLE_MASS_REAR = 1 / (1 / MASS + CG_TO_REAR ** 2 / YAW_INERTIA);

// Normalised lateral force (share of μ·N) at slip angle α (rad): 1 at the peak, then falling
// toward the sliding friction floor.
export function lateralCurve(alpha) {
  const a = Math.abs(alpha);
  const f = Math.sin(TYRE_SHAPE * Math.atan(B * a));
  return Math.sign(alpha) * (a > TYRE_PEAK_SLIP ? Math.max(f, TYRE_SLIDE_MIN) : f);
}

// Slip angle of a contact patch moving (vLong, vLat) in its own frame (+ = force pushes left).
export const slipAngle = (vLong, vLat) => -Math.atan2(vLat, Math.max(Math.abs(vLong), SLIP_SPEED_MIN));

// Normal loads (N) with longitudinal load transfer: braking (ax < 0) loads the front.
export function axleLoads(ax) {
  const shift = (MASS * ax * COG_HEIGHT) / WHEELBASE;
  const front = MASS * GRAVITY * (1 - REAR_WEIGHT);
  const rear = MASS * GRAVITY * REAR_WEIGHT;
  return {
    front: Math.max(front * LOAD_MIN, front - shift),
    rear: Math.max(rear * LOAD_MIN, rear + shift),
  };
}

// Cap a lateral force so one step cannot push the axle past zero sideways speed (no chatter).
export function settle(force, vLat, axleMass, dt) {
  const cap = (axleMass * Math.abs(vLat)) / dt;
  return Math.max(-cap, Math.min(cap, force));
}

// Is the rear past its grip peak? 0 at the peak slip angle, 1 at twice it.
export const driftOf = (rearSlip) => Math.min(1, Math.max(0, Math.abs(rearSlip) / TYRE_PEAK_SLIP - 1));
