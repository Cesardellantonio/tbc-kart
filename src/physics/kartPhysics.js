// Pure kart dynamics step: engine, brakes, tyre grip / drift and steering. No THREE, no side effects.

import {
  ENGINE_ACCEL, TOP_SPEED, BRAKE_DECEL, REVERSE_ACCEL, REVERSE_MAX,
  ROLLING_DECEL, AERO_DRAG, DRAFT_DRAG_CUT, HANDBRAKE_DECEL,
  GRIP, GRIP_SLIDING, GRIP_HANDBRAKE, SLIDE_THRESHOLD,
  STEER_RATE, STEER_FULL_SPEED, STEER_HIGH_SPEED_CUT, DRIFT_YAW_BOOST, STEER_IN, STEER_OUT,
} from '../config/physics.js';
import { clamp, forwardFromYaw, rightFromYaw } from '../core/math.js';

// state: { x, z, yaw, vx, vz, steer }
// input: { throttle 0..1, brake 0..1, steer -1..1 (+ = left), handbrake bool, draft 0..1 (slipstream) }
// Returns the next state, including telemetry used by camera, FX, audio and HUD.
export function stepKart(s, input, dt) {
  if (!(dt > 0)) return { ...s, forwardSpeed: s.forwardSpeed ?? 0, slip: s.slip ?? 0, sliding: false, longAccel: 0, latAccel: 0 };
  const target = clamp(input.steer, -1, 1);
  const steerRate = Math.abs(target) > Math.abs(s.steer) ? STEER_IN : STEER_OUT;
  const steer = s.steer + (target - s.steer) * Math.min(1, steerRate * dt);

  // Velocity in the kart's frame: forward and sideways components.
  const f = forwardFromYaw(s.yaw);
  const r = rightFromYaw(s.yaw);
  const vf0 = s.vx * f.x + s.vz * f.z;
  const vr0 = s.vx * r.x + s.vz * r.z;

  let vf = vf0;
  if (input.throttle > 0) {
    if (vf >= -0.3) vf += ENGINE_ACCEL * input.throttle * Math.max(0, 1 - (vf / TOP_SPEED) ** 2) * dt;
    else vf = Math.min(0, vf + BRAKE_DECEL * input.throttle * dt); // throttle while rolling back
  }
  if (input.brake > 0) {
    if (vf > 0.3) vf = Math.max(0, vf - BRAKE_DECEL * input.brake * dt);
    else if (!input.throttle) vf = Math.max(-REVERSE_MAX, vf - REVERSE_ACCEL * input.brake * dt);
  }
  const drag = AERO_DRAG * (1 - DRAFT_DRAG_CUT * (input.draft || 0));
  const resist = (ROLLING_DECEL + drag * vf * vf + (input.handbrake ? HANDBRAKE_DECEL : 0)) * dt;
  vf = Math.abs(vf) <= resist ? 0 : vf - Math.sign(vf) * resist;

  // Tyres scrub sideways velocity; once sliding (or on the handbrake) they hold far less.
  const sliding = Math.abs(vr0) > SLIDE_THRESHOLD;
  const grip = input.handbrake ? GRIP_HANDBRAKE : sliding ? GRIP_SLIDING : GRIP;
  const vr = vr0 * Math.exp(-grip * dt);

  const speed = Math.abs(vf);
  const authority =
    Math.min(1, speed / STEER_FULL_SPEED) * (1 - STEER_HIGH_SPEED_CUT * Math.min(1, speed / TOP_SPEED));
  const boost = input.handbrake && speed > 3 ? DRIFT_YAW_BOOST : 1;
  const yawRate = steer * STEER_RATE * authority * boost * (vf < 0 ? -1 : 1);
  const yaw = s.yaw + yawRate * dt;

  const vx = f.x * vf + r.x * vr;
  const vz = f.z * vf + r.z * vr;
  return {
    x: s.x + vx * dt,
    z: s.z + vz * dt,
    yaw,
    vx,
    vz,
    steer,
    forwardSpeed: vf,
    slip: Math.abs(vr),
    sliding: sliding || (!!input.handbrake && speed > 3),
    longAccel: (vf - vf0) / dt,
    latAccel: vf * yawRate,
  };
}
