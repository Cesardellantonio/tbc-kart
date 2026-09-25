// Pure kart dynamics step: four contact patches with per-wheel loads (physics/wheelLoads), Pacejka-style
// tyres with load sensitivity, combined slip and a relaxation length (tyreForce), a solid rear axle spun
// by the engine through a centrifugal clutch and stopped by the only brakes (engine, rearAxle), tyre
// temperature (thermal), and a kinematic blend at walking pace. No THREE, no side effects.

import {
  MASS, WHEELBASE, YAW_INERTIA, PITCH_RATE, ROLL_RATE, SLIP_SPEED_MIN, KINEMATIC_BELOW, DYNAMIC_ABOVE,
  LOW_SPEED_SCRUB, HANDBRAKE_KICK, MU_LAT_FRONT, MU_LAT_REAR, RELAXATION, IDLE_RPM, AXLE_INERTIA,
  ENGINE_INERTIA, GEAR_RATIO, REAR_RADIUS, AERO_DRAG, DRAFT_DRAG_CUT, ROLLING_RESIST, GRAVITY, CREEP_SPEED,
  AMBIENT_TEMP,
} from '../config/physics.js';
import { damp, lerp, smoothstep, forwardFromYaw, rightFromYaw } from '../core/math.js';
import { smoothSteer, wheelAngle, assisted, pedalCommands } from './controls.js';
import { wheelLoads } from './wheelLoads.js';
import { patchVelocities, slipTangent, PATCHES, CG_TO_REAR } from './patches.js';
import { tyreForce, frictionAt } from './tyreForce.js';
import { driveline, roadRpm } from './engine.js';
import { spinAxle, slipRatio } from './rearAxle.js';
import { heat, thermalGrip } from './thermal.js';

const bodySlipOf = (vf, vl) => (Math.hypot(vf, vl) > 0.3 ? Math.atan2(vl, Math.abs(vf)) : 0);
const LOADS = [0, 0, 0, 0];
const VEL = [{}, {}, {}, {}];
const F = { fx: 0, fy: 0, s: 0 };
const NO_GRIP = [1, 1, 1, 1];

// state: { x, z, yaw, vx, vz, steer, yawRate (+ left), omega (rear axle rad/s), rpm, tans (4 lagged slip-
// angle tangents), ax / ay (lagged accelerations for load transfer), tempF / tempR (°C), handbrakeTime }.
// input: { throttle 0..1, brake 0..1, steer -1..1 (+ left), handbrake, draft 0..1, assist 0..1,
// grip (4 surface multipliers from track/surfaceGrip) }. Returns the next state + telemetry.
export function stepKart(s, input, dt) {
  if (!(dt > 0)) return idle(s);
  const steer = smoothSteer(s.steer, input.steer, dt);
  const f = forwardFromYaw(s.yaw);
  const rt = rightFromYaw(s.yaw);
  const vf0 = s.vx * f.x + s.vz * f.z;
  const vl0 = -(s.vx * rt.x + s.vz * rt.z);
  const r0 = s.yawRate ?? 0;
  const speed = Math.hypot(vf0, vl0);
  const w = smoothstep(KINEMATIC_BELOW, DYNAMIC_ABOVE, speed); // 0 = kinematic, 1 = full dynamics

  const base = wheelAngle(steer, speed);
  const travel = Math.atan2(vl0, Math.max(Math.abs(vf0), SLIP_SPEED_MIN));
  const delta = vf0 > 0 ? assisted(base, bodySlipOf(vf0, vl0), travel, input.assist) : base;
  wheelLoads(s.ax ?? 0, s.ay ?? 0, delta, LOADS);
  patchVelocities(vf0, vl0, r0, delta, VEL);

  // Slip angles lag the kinematics by the relaxation length; grip = load × temperature × surface.
  const grip = input.grip ?? NO_GRIP;
  const [gF, gR] = [thermalGrip(s.tempF), thermalGrip(s.tempR)];
  const tans = VEL.map((v, i) => {
    const prev = s.tans?.[i] ?? 0;
    return prev + (slipTangent(v) - prev) * Math.min(1, (Math.max(Math.abs(v.long), SLIP_SPEED_MIN) * dt) / RELAXATION);
  });
  const mu = LOADS.map((fz, i) => frictionAt(i < 2 ? MU_LAT_FRONT : MU_LAT_REAR, fz) * (i < 2 ? gF : gR) * grip[i]);

  // Driveline and the rear axle's spin.
  const handbrakeTime = input.handbrake ? (s.handbrakeTime ?? 0) + dt : 0;
  const locked = handbrakeTime > 0 && handbrakeTime <= HANDBRAKE_KICK + 1e-9 && speed > DYNAMIC_ABOVE;
  const pedal = pedalCommands(vf0, input, locked);
  const omega0 = s.omega ?? vf0 / REAR_RADIUS;
  const rpm0 = s.rpm ?? Math.max(IDLE_RPM, roadRpm(omega0)); // a kart placed rolling is already in gear
  const drive = driveline(rpm0, omega0, pedal.throttle, dt);
  const rolling = vf0 < -CREEP_SPEED || pedal.reverse < 0; // pushed back: the rear just rolls
  const rear = [2, 3].map((i) => ({ v: VEL[i].long, fz: LOADS[i], tan: tans[i], mu: mu[i] }));
  // Braking, the clutch slips before it drags the flywheel down with the axle (it only holds ~45 N·m).
  const inertia = AXLE_INERTIA + (drive.coupled && !pedal.brake ? ENGINE_INERTIA * GEAR_RATIO ** 2 : 0);
  const omega = rolling ? vf0 / REAR_RADIUS : spinAxle(omega0, rear, drive.torque, pedal.brake, inertia, dt, !locked);

  // Tyre forces into body-frame force and yaw moment; slip power heats each axle.
  let [fx, fy, mz, heatF, heatR, rearS, spin] = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    const v = VEL[i];
    const kappa = i < 2 || rolling ? 0 : slipRatio(omega, v.long);
    tyreForce(LOADS[i], tans[i], kappa, mu[i], F);
    const [c, sn] = i < 2 ? [Math.cos(delta), Math.sin(delta)] : [1, 0];
    const bx = F.fx * c - F.fy * sn;
    const by = F.fx * sn + F.fy * c;
    [fx, fy, mz] = [fx + bx, fy + by, mz + PATCHES[i][0] * by - PATCHES[i][1] * bx];
    const power = Math.abs(F.fx * (i < 2 ? 0 : omega * REAR_RADIUS - v.long)) + Math.abs(F.fy * v.lat);
    if (i < 2) heatF += power;
    else [heatR, rearS, spin] = [heatR + power, Math.max(rearS, F.s), spin + kappa / 2];
  }

  // Body: tyres, drag, the push-back helper; rolling resistance can stop the kart but never reverse it.
  const drag = AERO_DRAG * (1 - DRAFT_DRAG_CUT * (input.draft || 0)) * vf0 * Math.abs(vf0);
  let vf = vf0 + ((fx - drag + pedal.reverse) / MASS) * dt;
  const resist = ROLLING_RESIST * GRAVITY * dt;
  vf = Math.abs(vf) <= resist && !pedal.throttle ? 0 : vf - Math.sign(vf) * resist;
  const rKin = (vf * Math.tan(base)) / WHEELBASE;
  const vlKin = CG_TO_REAR * rKin + (vl0 - CG_TO_REAR * rKin) * Math.exp(-LOW_SPEED_SCRUB * dt);
  const vl = lerp(vlKin, vl0 + (fy / MASS) * dt, w);
  const yawRate = lerp(rKin, r0 + (mz / YAW_INERTIA) * dt, w);

  const vx = f.x * vf - rt.x * vl;
  const vz = f.z * vf - rt.z * vl;
  const longAccel = (vf - vf0) / dt;
  const latAccel = lerp(vf * rKin, fy / MASS, w);
  const drift = w * Math.min(1, Math.max(0, rearS - 1));
  return {
    x: s.x + vx * dt,
    z: s.z + vz * dt,
    yaw: s.yaw + yawRate * dt,
    vx,
    vz,
    steer,
    yawRate,
    omega: rolling ? vf / REAR_RADIUS : omega,
    rpm: drive.rpm,
    tans,
    ax: damp(s.ax ?? 0, longAccel, PITCH_RATE, dt),
    ay: damp(s.ay ?? 0, latAccel, ROLL_RATE, dt),
    tempF: heat(s.tempF, heatF, speed, dt),
    tempR: heat(s.tempR, heatR, speed, dt),
    handbrakeTime,
    forwardSpeed: vf, // m/s along the nose
    slip: Math.abs(vl), // sideways speed, m/s
    sliding: drift > 0.05 || locked,
    longAccel, // m/s², + = speeding up
    latAccel, // m/s², + = toward the left
    slipAngle: bodySlipOf(vf, vl), // body slip angle, rad (+ = moving left of the nose)
    frontSlip: w * Math.atan((tans[0] + tans[1]) / 2), // axle slip angles, rad
    rearSlip: w * Math.atan((tans[2] + tans[3]) / 2),
    drift, // 0..1, how far the rear is past its grip peak
    wheelSpin: rolling ? 0 : spin, // mean rear slip ratio (+ = spinning up, − = locking)
    clutch: drive.slipping, // 0 = locked up … 1 = open
    loads: LOADS.slice(), // N per patch: front-left, front-right, rear-left, rear-right
  };
}

function idle(s) {
  return {
    ...s, yawRate: s.yawRate ?? 0, forwardSpeed: s.forwardSpeed ?? 0, slip: s.slip ?? 0, sliding: false,
    longAccel: 0, latAccel: 0, slipAngle: s.slipAngle ?? 0, frontSlip: 0, rearSlip: 0, drift: 0,
    wheelSpin: 0, rpm: s.rpm ?? IDLE_RPM, tempF: s.tempF ?? AMBIENT_TEMP, tempR: s.tempR ?? AMBIENT_TEMP,
  };
}
