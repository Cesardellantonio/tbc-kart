// Engine, centrifugal clutch and chain drive (pure). Stopped, the engine idles and the clutch is open;
// on the throttle it revs until the shoes' grip matches its torque (the "stall" speed, near peak torque)
// and slips there while the kart picks up speed; once road speed catches up the clutch locks and revs
// follow the rear axle. Lifting at speed gives engine braking until the clutch lets go again.

import {
  TORQUE_CURVE, IDLE_RPM, ENGINE_INERTIA, ENGINE_FRICTION, CLUTCH_ENGAGE, CLUTCH_LOCKUP, CLUTCH_TORQUE,
  GEAR_RATIO, DRIVELINE_EFFICIENCY, REAR_RADIUS, MASS,
} from '../config/physics.js';
import { clamp, smoothstep } from '../core/math.js';

const TO_RPM = 60 / (2 * Math.PI);
const LIMIT = TORQUE_CURVE.at(-1)[0];
const LOCK_BAND = 40; // rpm between engine and road speed that counts as locked
const CLUTCH_STALL = 3050; // rpm a floored engine settles at against the slipping clutch (driveAccel)

// Full-throttle torque (N·m) at rpm, linear between the curve's points.
export function fullTorque(rpm) {
  if (rpm <= TORQUE_CURVE[0][0]) return TORQUE_CURVE[0][1];
  for (let k = 1; k < TORQUE_CURVE.length; k++) {
    const [r1, t1] = TORQUE_CURVE[k];
    if (rpm <= r1) {
      const [r0, t0] = TORQUE_CURVE[k - 1];
      return t0 + ((t1 - t0) * (rpm - r0)) / (r1 - r0);
    }
  }
  return 0;
}

// Engine torque at rpm and throttle 0..1: drive on the throttle, pumping/friction losses off it, and an
// idle speed governor that keeps it running at a standstill.
export function engineTorque(rpm, throttle) {
  const losses = ENGINE_FRICTION * clamp(rpm / LIMIT, 0.25, 1);
  const idle = throttle < 0.05 ? clamp((IDLE_RPM - rpm) * 0.02, 0, 6) : 0;
  return throttle * fullTorque(rpm) - (1 - throttle) * losses + idle;
}

export const clutchCapacity = (rpm) => CLUTCH_TORQUE * smoothstep(CLUTCH_ENGAGE, CLUTCH_LOCKUP, rpm);
export const roadRpm = (axleOmega) => Math.abs(axleOmega) * GEAR_RATIO * TO_RPM;

// One step of the driveline. rpm: engine speed; axleOmega: rear axle (rad/s). Returns { rpm, torque
// (N·m at the axle), coupled (engine inertia rides with the axle this step), slipping (0..1) }.
export function driveline(rpm, axleOmega, throttle, dt) {
  const road = roadRpm(Math.max(0, axleOmega)); // rolling back, the clutch sees a stopped axle
  const te = engineTorque(rpm, throttle);
  const cap = clutchCapacity(Math.max(rpm, road));
  if (Math.abs(rpm - road) < LOCK_BAND && Math.abs(te) <= cap && road >= CLUTCH_ENGAGE) {
    return { rpm: road, torque: te * GEAR_RATIO * DRIVELINE_EFFICIENCY, coupled: true, slipping: 0 };
  }
  const tc = cap * clamp((rpm - road) / LOCK_BAND, -1, 1); // clutch torque on the drum
  let next = rpm + ((te - tc) / ENGINE_INERTIA) * TO_RPM * dt;
  if ((rpm - road) * (next - road) < 0) next = road; // caught up: lock next step
  return {
    rpm: clamp(next, 0, LIMIT * 1.02),
    torque: tc * GEAR_RATIO * DRIVELINE_EFFICIENCY, // the drum only ever drives the axle forward
    coupled: false,
    slipping: cap > 0 ? clamp(Math.abs(rpm - road) / 1500, 0, 1) : 1,
  };
}

// Quasi-static full-throttle drive (m/s² per unit throttle) at road speed v, for the throttle shaping
// and the braking-zone model: the clutch's stall torque below lock-up, the curve above.
export function driveAccel(v) {
  const rpm = Math.max(roadRpm(v / REAR_RADIUS), CLUTCH_STALL);
  const torque = Math.min(fullTorque(rpm), clutchCapacity(rpm));
  return (torque * GEAR_RATIO * DRIVELINE_EFFICIENCY) / REAR_RADIUS / MASS;
}
