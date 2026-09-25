// Pedals for a computer driver chasing a target speed: throttle eased in near the target (so the
// kart is never flicked on and off mid-corner) and the rear-only brakes squeezed, not stamped.

import { AUTOPILOT } from '../config/race.js';
import { clamp } from '../core/math.js';

// At full lock the kart already asks the front for everything it has: flooring it there takes load
// off the front and the kart runs wide (on-power understeer), so throttle is held back.
export function lockCap(steer) {
  const over = Math.abs(steer || 0) - AUTOPILOT.lockSteer;
  return over > 0 ? Math.max(AUTOPILOT.lockThrottleMin, 1 - over * AUTOPILOT.lockThrottle) : 1;
}

// Traction: as the tail steps out (body slip, rad) the throttle comes off, as a driver would lift.
export function slipCap(bodySlip) {
  return clamp(1 - (Math.abs(bodySlip || 0) - AUTOPILOT.slipLiftStart) / AUTOPILOT.slipLiftRange, AUTOPILOT.slipLiftMin, 1);
}

// speed, want: m/s; steer: the steering this frame; bodySlip: the kart's slip angle (rad).
// Returns { throttle 0..1, brake 0..1 }.
export function speedControl(speed, want, steer = 0, bodySlip = 0) {
  const gap = want - speed;
  return {
    throttle: Math.min(clamp(AUTOPILOT.throttleBase + gap * AUTOPILOT.throttleGain, 0, 1), lockCap(steer), slipCap(bodySlip)),
    brake: clamp((-gap - AUTOPILOT.brakeMargin) * AUTOPILOT.brakeGain, 0, 1),
  };
}
