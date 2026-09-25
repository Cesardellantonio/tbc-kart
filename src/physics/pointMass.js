// Straight-line acceleration of a kart as a point mass (pure, quasi-static), for models that plan along
// the track rather than simulate it (track/brakingZones): the engine through the clutch, the rear brakes
// at the tyres' limit (the brake assist), drag and rolling resistance.

import {
  MASS, GRAVITY, MU_LAT_REAR, MU_LONG, REAR_WEIGHT, COG_HEIGHT, WHEELBASE, ROLLING_RESIST, AERO_DRAG,
} from '../config/physics.js';
import { driveAccel } from './engine.js';

// Deceleration the rear-only brakes can hold at the limit: braking loads the front and unloads the rear,
// so a = μ·g·rearWeight / (1 + μ·h/L).
const MU = MU_LAT_REAR * MU_LONG;
export const BRAKE_DECEL = (MU * GRAVITY * REAR_WEIGHT) / (1 + (MU * COG_HEIGHT) / WHEELBASE);

// v: m/s; c: { throttle 0..1, brake 0..1 }. Returns m/s² (+ = speeding up).
export function pointMassAccel(v, c) {
  const resist = ROLLING_RESIST * GRAVITY + (AERO_DRAG * v * v) / MASS;
  return (c.throttle || 0) * driveAccel(v) - (c.brake || 0) * BRAKE_DECEL - resist;
}
