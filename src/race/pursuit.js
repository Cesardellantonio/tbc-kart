// Pure-pursuit steering toward an aim point, with yaw-rate damping so a computer driver catches a
// sliding kart instead of feeding it more lock.

import { AUTOPILOT } from '../config/race.js';
import { clamp, wrapAngle, yawFromDirection } from '../core/math.js';

// state: kart physics state ({ x, z, yaw, yawRate }); aim: { x, z }; speed: m/s. Returns steer -1..1.
export function pursuitSteer(state, aim, speed) {
  const dx = aim.x - state.x;
  const dz = aim.z - state.z;
  const error = wrapAngle(yawFromDirection(dx, dz) - state.yaw);
  const wanted = (2 * speed * Math.sin(error)) / Math.max(Math.hypot(dx, dz), 1); // pure-pursuit yaw rate
  const excess = (state.yawRate ?? 0) - wanted;
  return clamp(error * AUTOPILOT.steerGain - excess * AUTOPILOT.yawDamp, -1, 1);
}
