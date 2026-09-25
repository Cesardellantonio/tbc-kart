// Pure kart dynamics step: a single-track (bicycle) model with saturating tyres, longitudinal load
// transfer, a rear friction ellipse (drive and the only brakes share the rear grip) and a kinematic
// blend at walking pace. No THREE, no side effects.

import {
  MASS, WHEELBASE, YAW_INERTIA, PITCH_RATE, SLIP_SPEED_MIN, KINEMATIC_BELOW, DYNAMIC_ABOVE, LOW_SPEED_SCRUB,
} from '../config/physics.js';
import { damp, lerp, smoothstep, forwardFromYaw, rightFromYaw } from '../core/math.js';
import { CG_TO_FRONT, CG_TO_REAR, axleLoads, driftOf } from './tyres.js';
import { frontAxle, rearAxle } from './axles.js';
import { smoothSteer, wheelAngle, assisted, pedals } from './controls.js';

const bodySlipOf = (vf, vl) => (Math.hypot(vf, vl) > 0.3 ? Math.atan2(vl, Math.abs(vf)) : 0);

// state: { x, z, yaw, vx, vz, steer, yawRate (rad/s, + = left), loadAccel (m/s², drives load transfer) }
// input: { throttle 0..1, brake 0..1, steer -1..1 (+ = left), handbrake bool (drift button: locks the
// rear), draft 0..1 (slipstream), assist 0..1 (optional, overrides STEER_ASSIST) }
// Returns the next state plus telemetry for camera, FX, audio and HUD (see the bottom of the step).
export function stepKart(s, input, dt) {
  if (!(dt > 0)) return idle(s);
  const steer = smoothSteer(s.steer, input.steer, dt);

  // Velocity in the kart's frame: forward and leftward (+) components, and the yaw rate.
  const f = forwardFromYaw(s.yaw);
  const rt = rightFromYaw(s.yaw);
  const vf0 = s.vx * f.x + s.vz * f.z;
  const vl0 = -(s.vx * rt.x + s.vz * rt.z);
  const r0 = s.yawRate ?? 0;
  const speed = Math.hypot(vf0, vl0);
  const w = smoothstep(KINEMATIC_BELOW, DYNAMIC_ABOVE, speed); // 0 = kinematic, 1 = full dynamics

  const base = wheelAngle(steer, speed);
  const travel = Math.atan2(vl0, Math.max(Math.abs(vf0), SLIP_SPEED_MIN)); // CoG direction of travel
  const delta = vf0 > 0 ? assisted(base, bodySlipOf(vf0, vl0), travel, input.assist) : base;
  const vlFront = vl0 + CG_TO_FRONT * r0;
  const load = axleLoads(s.loadAccel ?? 0);
  const pedal = pedals(vf0, input);
  const front = frontAxle(vf0, vlFront, delta, load.front, dt);
  const rear = rearAxle(vf0, vl0 - CG_TO_REAR * r0, load.rear, pedal, !!input.handbrake, dt);

  // Longitudinal: drive and steering scrub, then resistances that can stop but never reverse the kart.
  let vf = vf0 + ((rear.drive + front.fx) / MASS) * dt;
  const resist = (pedal.resist + rear.brake / MASS) * dt;
  vf = Math.abs(vf) <= resist ? 0 : vf - Math.sign(vf) * resist;

  // Lateral and yaw: tyre forces at speed, rolling without slip at walking pace.
  const fy = front.fy + rear.lateral;
  const rKin = (vf * Math.tan(base)) / WHEELBASE;
  const vlKin = CG_TO_REAR * rKin + (vl0 - CG_TO_REAR * rKin) * Math.exp(-LOW_SPEED_SCRUB * dt);
  const vl = lerp(vlKin, vl0 + (fy / MASS) * dt, w);
  const yawRate = lerp(rKin, r0 + ((CG_TO_FRONT * front.fy - CG_TO_REAR * rear.lateral) / YAW_INERTIA) * dt, w);

  const vx = f.x * vf - rt.x * vl;
  const vz = f.z * vf - rt.z * vl;
  const longAccel = (vf - vf0) / dt;
  const drift = w * driftOf(rear.slip);
  return {
    x: s.x + vx * dt,
    z: s.z + vz * dt,
    yaw: s.yaw + yawRate * dt,
    vx,
    vz,
    steer,
    yawRate,
    loadAccel: damp(s.loadAccel ?? 0, longAccel, PITCH_RATE, dt),
    forwardSpeed: vf, // m/s along the nose
    slip: Math.abs(vl), // sideways speed, m/s
    sliding: drift > 0.05 || (!!input.handbrake && speed > 3),
    longAccel, // m/s², + = speeding up
    latAccel: lerp(vf * rKin, fy / MASS, w), // m/s², + = toward the left
    slipAngle: bodySlipOf(vf, vl), // body slip angle, rad (+ = moving left of the nose)
    frontSlip: w * front.slip, // axle slip angles, rad
    rearSlip: w * rear.slip,
    drift, // 0..1, how far the rear is past its grip peak
  };
}

function idle(s) {
  return {
    ...s, yawRate: s.yawRate ?? 0, forwardSpeed: s.forwardSpeed ?? 0, slip: s.slip ?? 0, sliding: false,
    longAccel: 0, latAccel: 0, slipAngle: s.slipAngle ?? 0, frontSlip: 0, rearSlip: 0, drift: 0,
  };
}
