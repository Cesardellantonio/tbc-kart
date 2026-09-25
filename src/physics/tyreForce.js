// One contact patch (pure): a Pacejka-style curve on the combined, normalised slip, so drive or brake
// force and cornering force share one friction ellipse; friction falls as the load rises (load
// sensitivity) — which is why transferring load off an axle costs it grip overall.

import {
  MASS, GRAVITY, MU_LONG, LOAD_SENSITIVITY, PEAK_SLIP_ANGLE, PEAK_SLIP_RATIO, TYRE_SHAPE, TYRE_SLIDE_MIN,
} from '../config/physics.js';

const B = Math.tan(Math.PI / (2 * TYRE_SHAPE)); // peak of sin(C·atan(B·s)) at s = 1
const TAN_PEAK = Math.tan(PEAK_SLIP_ANGLE);
const FZ_NOMINAL = (MASS * GRAVITY) / 4;

// Peak lateral μ at load fz (N) for a tyre whose μ at nominal load is `mu`.
export const frictionAt = (mu, fz) => mu * Math.min(1.3, Math.max(0.6, 1 - LOAD_SENSITIVITY * (fz / FZ_NOMINAL - 1)));

// Share of peak force at normalised slip s (1 = the peak), dropping to the sliding floor past it.
export function curve(s) {
  const f = Math.sin(TYRE_SHAPE * Math.atan(B * s));
  return s > 1 ? Math.max(f, TYRE_SLIDE_MIN) : f;
}

// fz: normal load (N); tanAlpha: tan of the slip angle, + = force toward the wheel's left; kappa: slip
// ratio, + = driving; mu: peak lateral μ for this patch (load, temperature and surface already in).
// Writes out.fx (+ forward), out.fy (+ left) in the wheel frame (N) and out.s (normalised slip).
export function tyreForce(fz, tanAlpha, kappa, mu, out) {
  const sx = kappa / PEAK_SLIP_RATIO;
  const sy = tanAlpha / TAN_PEAK;
  const s = Math.hypot(sx, sy);
  out.s = s;
  if (!(fz > 0) || s < 1e-9) return ((out.fx = 0), (out.fy = 0), out);
  const f = (mu * fz * curve(s)) / s;
  out.fx = f * MU_LONG * sx;
  out.fy = f * sy;
  return out;
}

// Longitudinal stiffness dFx/dκ (N per unit slip ratio) of an unsaturated patch: the implicit rear-axle
// update linearises the tyre's grip on the axle with it.
export const longStiffness = (fz, mu) => (Math.max(fz, 0) * mu * MU_LONG * B * TYRE_SHAPE) / PEAK_SLIP_RATIO;
