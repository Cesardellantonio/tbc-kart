// Engine drive curve and the player's digital (keyboard / touch) throttle shaping. Both are eager where
// the kart runs straight and hold back where it is turning: a keyboard's on/off throttle in a corner is
// the commonest way to step the rear out.

import {
  ENGINE_ACCEL, TOP_SPEED, LOW_SPEED_PULL, LOW_SPEED_END, LOW_SPEED_FADE, LOW_SPEED_TURN, THROTTLE_RISE,
  THROTTLE_RISE_LOW, THROTTLE_LOW_SLIP, THROTTLE_JUMP, THROTTLE_JUMP_FROM, THROTTLE_JUMP_FULL, THROTTLE_JUMP_SLIP,
  THROTTLE_RAMP_SLIP, DYNAMIC_ABOVE,
} from '../config/physics.js';
import { clamp, lerp, smoothstep } from '../core/math.js';

const lowSpeed = (v) => 1 - smoothstep(LOW_SPEED_END, LOW_SPEED_FADE, v); // 1 at walking pace, 0 from _FADE
const calm = (x, full) => 1 - smoothstep(0, full, Math.abs(x || 0)); // 1 at 0, 0 from `full` up

// Engine drive per unit throttle at forward speed vf (m/s²): strongest off the line, fading to zero at
// TOP_SPEED (a single fixed ratio behind a centrifugal clutch), plus LOW_SPEED_PULL at walking pace
// while the kart isn't rotating (yawRate rad/s): off the line and out of a hairpin once it points
// straight, never while it is still swinging round (the rear has no grip to spare there).
export const engineAccel = (vf, yawRate = 0) =>
  ENGINE_ACCEL * Math.max(0, 1 - (vf / TOP_SPEED) ** 2) + LOW_SPEED_PULL * lowSpeed(vf) * calm(yawRate, LOW_SPEED_TURN);

// Throttle a key press opens at once (share 0-1): enough for THROTTLE_JUMP m/s² of drive, phased in
// with speed between THROTTLE_JUMP_FROM and _FULL, and gone once the body slips THROTTLE_JUMP_SLIP
// (rad): at that speed a kart loaded up mid-corner carries its tail a little out, one on a straight
// none, so the shove lands on straights and exits, not on a keyboard's taps mid-corner.
function shove(speed, bodySlip) {
  const phase = smoothstep(THROTTLE_JUMP_FROM, THROTTLE_JUMP_FULL, speed);
  return (THROTTLE_JUMP * phase * calm(bodySlip, THROTTLE_JUMP_SLIP)) / Math.max(engineAccel(speed), 1e-6);
}

// The player's on/off throttle: a 0→1 step low in the rev range is a 0.9 g jolt that unloads the front
// (push wide) or snaps the rear out of a slow corner, so the throttle opens at THROTTLE_RISE (a
// keyboard's taps average into a feathered throttle) — but quicker at walking pace when the kart runs
// straight (turning that slowly, the body slip grows past THROTTLE_LOW_SLIP rad), and with an instant
// shove at speed (above). Closing is instant; it passes through in a slide (|bodySlip| past
// THROTTLE_RAMP_SLIP, so the throttle can steer a drift) and below DYNAMIC_ABOVE m/s (a launch has
// nothing to upset). An unknown speed gets the plain ramp.
export function rampThrottle(current, target, bodySlip, dt, speed) {
  const t = clamp(target || 0, 0, 1);
  if (t <= current || Math.abs(bodySlip || 0) > THROTTLE_RAMP_SLIP || speed < DYNAMIC_ABOVE) return t;
  if (!Number.isFinite(speed)) return Math.min(t, current + THROTTLE_RISE * dt);
  const rise = lerp(THROTTLE_RISE, THROTTLE_RISE_LOW, lowSpeed(speed) * calm(bodySlip, THROTTLE_LOW_SLIP));
  return Math.min(t, Math.max(current + rise * dt, shove(speed, bodySlip)));
}
