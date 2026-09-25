// The full-face helmet's outer surface as a function, so every part (shell, visor, peak, stripe,
// vents, neck roll) can be laid onto the same shape. Helmet space: origin at the shell's centre,
// x = right, y = up, −z = forward. A direction is (azimuth from the front, elevation).

import { v3 } from './primitives.js';
import { smoothstep } from '../../core/math.js';

const HALF_WIDTH = 0.132; // m: ~0.9 of the height seen from behind, like a real full-face shell
const [TOP, BOTTOM] = [0.138, 0.185]; // m above / below the centre
const [FRONT, BACK] = [0.154, 0.171]; // m: longer at the back than the front
const [DOME, SKIRT] = [2.3, 3.4]; // section power above / below the centre: a broad crown over straighter sides
const CHIN = 0.03; // m the chin bar pushes forward of the egg

export const dir = (az, el) => v3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));

export function radius(d) {
  const q = d.y > 0 ? DOME : SKIRT;
  const flat = Math.hypot(d.x / HALF_WIDTH, d.z / (d.z < 0 ? FRONT : BACK));
  const r = (flat ** q + Math.abs(d.y / (d.y > 0 ? TOP : BOTTOM)) ** q) ** (-1 / q);
  const chin = smoothstep(0.3, 0.95, -d.z) * Math.exp(-(((d.y + 0.45) / 0.3) ** 2));
  return r + CHIN * chin;
}

// Point on the shell (or `lift` metres off it) in direction (az, el).
export function surface(az, el, lift = 0) {
  const d = dir(az, el);
  return d.multiplyScalar(radius(d) + lift);
}

// Elevation at which the shell passes height y, at azimuth az.
export function elevationAt(az, y) {
  let [lo, hi] = [-Math.PI / 2, Math.PI / 2];
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2;
    if (surface(az, mid).y < y) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export const at = (az, y, lift = 0) => surface(az, elevationAt(az, y), lift);

// Height of the shell's lower edge: nearly level all round (the chin bar is the lowest point at the
// front, the nape about level with it), rising a little under the ears.
export function hemY(az) {
  const a = Math.abs(Math.atan2(Math.sin(az), Math.cos(az))) / Math.PI; // 0 front … 1 back
  return -0.15 - 0.003 * smoothstep(0.5, 1, a) + 0.014 * Math.sin(az) ** 2;
}

// Visor edges at azimuth fraction u (−1..1 → pivot to pivot): a straight top, a lower edge that
// rises along the chin bar, both narrowing to the side pivots.
export const VISOR_AZ = 1.52; // rad from the front to each pivot
export const visorTop = (u) => 0.058 - 0.026 * Math.abs(u) ** 3;
export const visorBottom = (u) => -0.05 + 0.038 * u * u;
