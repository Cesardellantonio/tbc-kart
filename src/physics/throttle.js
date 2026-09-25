// The player's digital (keyboard / touch) throttle shaping — a driver aid, like a sim's input filter. Eager
// where the kart runs straight, held back where it is turning: a keyboard's on/off throttle in a corner is
// the commonest way to step the rear out.

import {
  LOW_SPEED_END, LOW_SPEED_FADE, THROTTLE_RISE, THROTTLE_RISE_LOW, THROTTLE_LOW_SLIP, THROTTLE_JUMP,
  THROTTLE_JUMP_FROM, THROTTLE_JUMP_FULL, THROTTLE_JUMP_SLIP, THROTTLE_RAMP_SLIP, DYNAMIC_ABOVE,
} from '../config/physics.js';
import { clamp, lerp, smoothstep } from '../core/math.js';
import { driveAccel } from './engine.js';

const lowSpeed = (v) => 1 - smoothstep(LOW_SPEED_END, LOW_SPEED_FADE, v); // 1 at walking pace, 0 from _FADE
const calm = (x, full) => 1 - smoothstep(0, full, Math.abs(x || 0)); // 1 at 0, 0 from `full` up

// Throttle a key press opens at once (share 0-1): enough for THROTTLE_JUMP m/s² of drive, phased in
// with speed between THROTTLE_JUMP_FROM and _FULL, and gone once the body slips THROTTLE_JUMP_SLIP
// (rad): at that speed a kart loaded up mid-corner carries its tail a little out, one on a straight
// none, so the shove lands on straights and exits, not on a keyboard's taps mid-corner.
function shove(speed, bodySlip) {
  const phase = smoothstep(THROTTLE_JUMP_FROM, THROTTLE_JUMP_FULL, speed);
  return (THROTTLE_JUMP * phase * calm(bodySlip, THROTTLE_JUMP_SLIP)) / Math.max(driveAccel(speed), 1e-6);
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
