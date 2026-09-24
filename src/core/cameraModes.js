// Pure camera target calculators: where each view wants the camera and what it aims at.

import { VIEWS, DRIFT_SWING, SPEED_PULLBACK } from '../config/camera.js';
import { clamp, wrapAngle, forwardFromYaw } from './math.js';

const SPEED_NORM = 16; // m/s treated as "full speed" for camera effects

export const speedFactor = (speed) => clamp(speed / SPEED_NORM, 0, 1);

// Heading the chase camera trails: the kart's yaw, swung toward its travel direction when sliding.
export function trailYaw(state, speed) {
  if (speed < 2) return state.yaw;
  const slide = wrapAngle(Math.atan2(-state.vx, -state.vz) - state.yaw);
  return state.yaw + clamp(slide, -0.9, 0.9) * DRIFT_SWING;
}

export function followTarget(state, speed, yaw, view, out) {
  const v = VIEWS[view];
  const f = forwardFromYaw(yaw);
  const dist = v.distance + (view === 'cockpit' ? 0 : SPEED_PULLBACK * speedFactor(speed));
  out.pos.set(state.x - f.x * dist, v.height, state.z - f.z * dist);
  out.look.set(state.x + f.x * v.lookAhead, v.lookHeight, state.z + f.z * v.lookAhead);
  return out;
}

// TV-style trackside cameras: pick the nearest anchor (sticky, to avoid flicker cuts).
export function broadcastTarget(anchors, state, current, out) {
  let best = current;
  let bestD = Infinity;
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const d = (a.x - state.x) ** 2 + (a.z - state.z) ** 2;
    if (d < bestD) [best, bestD] = [i, d];
  }
  if (current >= 0 && best !== current) {
    const c = anchors[current];
    const dc = (c.x - state.x) ** 2 + (c.z - state.z) ** 2;
    if (dc < bestD * 1.6) best = current;
  }
  const a = anchors[best];
  out.pos.set(a.x, a.y, a.z);
  out.look.set(state.x, 0.55, state.z);
  return best;
}

// Broadcast zoom: keep the kart roughly the same size on screen.
export function broadcastFov(distance) {
  return clamp((2 * Math.atan(3.2 / Math.max(distance, 1)) * 180) / Math.PI, 14, 55);
}
