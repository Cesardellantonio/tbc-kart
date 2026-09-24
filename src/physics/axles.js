// Axle forces for the single-track kart model. Front: steered, free-rolling. Rear: solid, driven
// and carrying the only brakes, so drive/brake force and cornering share one friction ellipse.

import { MU_FRONT, MU_REAR, LONG_GRIP, LOCKED_GRIP, TYRE_PEAK_SLIP } from '../config/physics.js';
import { AXLE_MASS_FRONT, AXLE_MASS_REAR, lateralCurve, slipAngle, settle } from './tyres.js';

// vf / vLat: axle velocity in the body frame (m/s, + = forward / left); delta: road-wheel angle (rad).
// Returns body-frame force { fx, fy } (N) and the tyre slip angle (rad).
export function frontAxle(vf, vLat, delta, load, dt) {
  const c = Math.cos(delta);
  const s = Math.sin(delta);
  const vSide = vLat * c - vf * s;
  const slip = slipAngle(vf * c + vLat * s, vSide);
  const f = settle(MU_FRONT * load * lateralCurve(slip), vSide, AXLE_MASS_FRONT, dt);
  return { fx: -f * s, fy: f * c, slip };
}

// pedal: { drive (N, signed), brake (N, opposing motion) } asked of the rear tyres.
// locked: the rear is locked (drift button) and slides, its force opposing the sliding velocity.
// Returns { drive, brake } actually transmitted (N), lateral force (N) and the slip angle (rad).
export function rearAxle(vf, vLat, load, pedal, locked, dt) {
  const grip = MU_REAR * load;
  const slip = slipAngle(vf, vLat);
  if (locked) {
    const v = Math.max(Math.hypot(vf, vLat), 1);
    const f = LOCKED_GRIP * grip;
    const lateral = settle((-f * vLat) / v, vLat, AXLE_MASS_REAR, dt);
    return { drive: 0, brake: (f * Math.abs(vf)) / v, lateral, slip };
  }
  // Friction ellipse: drive/brake force uses up cornering grip. Past the peak slip angle only what
  // the sliding tyre still delivers is shared — so throttle keeps a sliding rear loose.
  const curve = lateralCurve(slip);
  const share = Math.abs(slip) > TYRE_PEAK_SLIP ? Math.abs(curve) : 1;
  const fxMax = share * LONG_GRIP * grip;
  const want = pedal.drive - (vf < 0 ? -1 : 1) * pedal.brake;
  const scale = Math.abs(want) > fxMax ? fxMax / Math.abs(want) : 1;
  const room = Math.sqrt(Math.max(0, 1 - ((want * scale) / (fxMax || 1)) ** 2));
  const fy = grip * room * (share < 1 ? Math.sign(curve) * share : curve);
  const lateral = settle(fy, vLat, AXLE_MASS_REAR, dt);
  return { drive: pedal.drive * scale, brake: pedal.brake * scale, lateral, slip };
}
