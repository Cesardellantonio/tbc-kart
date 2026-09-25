// Pedals for a computer driver chasing a target speed: throttle eased in near the target (so the
// kart is never flicked on and off mid-corner) and the rear-only brakes squeezed, not stamped.

import { AUTOPILOT } from '../config/race.js';
import { clamp } from '../core/math.js';

// speed, want: m/s. Returns { throttle 0..1, brake 0..1 }.
export function speedControl(speed, want) {
  const gap = want - speed;
  return {
    throttle: clamp(AUTOPILOT.throttleBase + gap * AUTOPILOT.throttleGain, 0, 1),
    brake: clamp((-gap - AUTOPILOT.brakeMargin) * AUTOPILOT.brakeGain, 0, 1),
  };
}
