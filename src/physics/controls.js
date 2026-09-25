// Driver inputs → kart commands: steering smoothing, speed-sensitive lock, countersteer assist, and the
// pedals (engine throttle, rear brake torque, the push-back helper).

import {
  STEER_IN, STEER_OUT, STEER_LOCK, STEER_LIMIT_ACCEL, STEER_LIMIT_SLIP, WHEELBASE, STEER_ASSIST,
  ASSIST_SLIP_START, ASSIST_SLIP_FULL, ASSIST_STEER_SHARE, MASS, BRAKE_TORQUE, REVERSE_ACCEL, REVERSE_MAX,
  CREEP_SPEED,
} from '../config/physics.js';
import { clamp, lerp, smoothstep } from '../core/math.js';

export { rampThrottle } from './throttle.js'; // app/frame.js shapes the player's throttle

// Steering input eased toward the target (faster back to centre than out to lock).
export function smoothSteer(current, target, dt) {
  const t = clamp(target || 0, -1, 1);
  const rate = Math.abs(t) > Math.abs(current) ? STEER_IN : STEER_OUT;
  return current + (t - current) * Math.min(1, rate * dt);
}

// Road-wheel angle (rad): full lock shrinks with speed so it asks for about the grip limit.
export function wheelAngle(steer, speed) {
  const aim = (STEER_LIMIT_ACCEL * WHEELBASE) / Math.max(speed * speed, 1e-6) + STEER_LIMIT_SLIP;
  const lock = Math.min(STEER_LOCK, aim);
  return steer * lock;
}

// Countersteer assist: as body slip grows, blend the front wheels toward the kart's direction of
// travel (rad, + = left). Aligned with the CoG velocity, the front tyres then resist yaw (damping a
// fishtail) and the driver's input steers relative to that with a reduced share.
export function assisted(delta, bodySlip, travel, strength = STEER_ASSIST) {
  const w = strength * smoothstep(ASSIST_SLIP_START, ASSIST_SLIP_FULL, Math.abs(bodySlip));
  return lerp(delta, travel + delta * ASSIST_STEER_SHARE, w);
}

// Driver pedals → the engine's throttle, rear brake torque (N·m) and the push-back helper's force (N).
// A rental kart has no reverse gear: stopped, the brake pedal rolls it back (as a marshal would), and the
// throttle while it rolls back brakes first. locked: the drift button's stab of full rear brake.
export function pedalCommands(vf, input, locked) {
  const throttle = input.throttle || 0;
  const pedal = input.brake || 0;
  let brake = locked ? BRAKE_TORQUE : 0;
  let engine = throttle;
  let reverse = 0;
  if (vf > CREEP_SPEED) brake = Math.max(brake, BRAKE_TORQUE * pedal);
  else if (pedal > 0 && !throttle) reverse = -MASS * REVERSE_ACCEL * pedal * clamp((REVERSE_MAX + vf) / 0.25, 0, 1);
  if (vf < -CREEP_SPEED && throttle > 0) [brake, engine] = [Math.max(brake, BRAKE_TORQUE * throttle), 0];
  return { throttle: engine, brake, reverse };
}
