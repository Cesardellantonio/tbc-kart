// Advance one kart by dt: equal physics substeps no longer than FIXED_STEP, each followed by the
// barrier collision pass. Pure apart from the collider's contact scratch; shared by the game and
// the headless race simulator.

import { stepKart } from './kartPhysics.js';
import {
  FIXED_STEP, KART_RADIUS, WALL_RESTITUTION, WALL_FRICTION,
} from '../config/physics.js';

// Returns { state, impact (strongest wall hit, m/s), contact ({x, z, nx, nz} or null) }.
export function advanceKart(state, input, dt, collider) {
  const steps = Math.max(1, Math.ceil(dt / FIXED_STEP - 1e-6));
  const h = dt / steps;
  let impact = 0;
  let contact = null;
  let s = state;
  for (let k = 0; k < steps; k++) {
    const next = stepKart(s, input, h);
    const hit = collider.resolve(next, KART_RADIUS, WALL_RESTITUTION, WALL_FRICTION);
    if (hit > impact) {
      impact = hit;
      contact = { ...collider.contact };
    }
    s = next;
  }
  return { state: s, impact, contact };
}
