// Driver inputs → kart commands: steering smoothing, speed-sensitive lock, countersteer assist,
// and the pedals' longitudinal demands (engine, rear brakes, reverse, drag).

import {
  STEER_IN, STEER_OUT, STEER_LOCK, STEER_LIMIT_ACCEL, STEER_LIMIT_SLIP, WHEELBASE, STEER_ASSIST,
  ASSIST_SLIP_START, ASSIST_SLIP_FULL, ASSIST_STEER_SHARE, MASS, ENGINE_ACCEL, TOP_SPEED, BRAKE_FORCE,
  REVERSE_ACCEL, REVERSE_MAX, ROLLING_DECEL, AERO_DRAG, DRAFT_DRAG_CUT, CREEP_SPEED, THROTTLE_RISE,
  THROTTLE_RAMP_SLIP, DYNAMIC_ABOVE,
} from '../config/physics.js';
import { clamp, lerp, smoothstep } from '../core/math.js';

// Steering input eased toward the target (faster back to centre than out to lock).
export function smoothSteer(current, target, dt) {
  const t = clamp(target || 0, -1, 1);
  const rate = Math.abs(t) > Math.abs(current) ? STEER_IN : STEER_OUT;
  return current + (t - current) * Math.min(1, rate * dt);
}

// The player's on/off throttle (keys, touch): a 0→1 step is a 0.9 g jolt that unloads the front (push
// wide) or snaps the rear mid-corner. Opening is rate-limited, closing is instant; it passes straight
// through in a slide (|bodySlip| rad past THROTTLE_RAMP_SLIP, so the throttle can steer a drift) and
// at walking pace (below DYNAMIC_ABOVE m/s: a launch from the grid or a restart has nothing to upset).
export function rampThrottle(current, target, bodySlip, dt, speed = Infinity) {
  const t = clamp(target || 0, 0, 1);
  if (t <= current || Math.abs(bodySlip || 0) > THROTTLE_RAMP_SLIP || speed < DYNAMIC_ABOVE) return t;
  return Math.min(t, current + THROTTLE_RISE * dt);
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

// Pedals at forward speed vf: rear-tyre drive (N, + forward), rear brake (N, opposing motion)
// and rolling + aero resistance (m/s², opposing motion).
export function pedals(vf, input) {
  const throttle = input.throttle || 0;
  const pedal = input.brake || 0;
  let drive = 0;
  let brake = 0;
  if (throttle > 0) {
    if (vf >= -CREEP_SPEED) drive = MASS * ENGINE_ACCEL * throttle * Math.max(0, 1 - (vf / TOP_SPEED) ** 2);
    else brake = BRAKE_FORCE * throttle; // throttle while rolling back brakes first
  }
  if (pedal > 0) {
    if (vf > CREEP_SPEED) brake = Math.max(brake, BRAKE_FORCE * pedal);
    else if (!throttle) drive = -MASS * REVERSE_ACCEL * pedal * clamp((REVERSE_MAX + vf) / 0.25, 0, 1);
  }
  const drag = AERO_DRAG * (1 - DRAFT_DRAG_CUT * (input.draft || 0));
  return { drive, brake, resist: ROLLING_DECEL + drag * vf * vf };
}
