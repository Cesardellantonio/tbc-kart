// Kart-to-kart interaction, pure: circle contacts (equal masses) and slipstream behind other karts.

import { forwardFromYaw } from '../core/math.js';

// states: [{x, z, vx, vz}] mutated in place. Returns the impact speed felt by each kart (m/s).
export function resolveContacts(states, radius, restitution) {
  const impacts = new Array(states.length).fill(0);
  const min = radius * 2;
  for (let i = 0; i < states.length; i++) {
    for (let j = i + 1; j < states.length; j++) {
      const a = states[i];
      const b = states[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min || d2 < 1e-8) continue;
      const d = Math.sqrt(d2);
      const [nx, nz] = [dx / d, dz / d];
      const push = (min - d) / 2;
      a.x -= nx * push;
      a.z -= nz * push;
      b.x += nx * push;
      b.z += nz * push;
      const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz; // > 0 = moving together
      if (closing <= 0) continue;
      const j2 = (closing * (1 + restitution)) / 2; // impulse per unit mass, split equally
      a.vx -= j2 * nx;
      a.vz -= j2 * nz;
      b.vx += j2 * nx;
      b.vz += j2 * nz;
      impacts[i] = Math.max(impacts[i], closing);
      impacts[j] = Math.max(impacts[j], closing);
    }
  }
  return impacts;
}

// Slipstream strength 0..1 for each kart: strongest from any kart close ahead and nearly in line.
export function drafts(states, range, lateral) {
  return states.map((a) => {
    const f = forwardFromYaw(a.yaw);
    let best = 0;
    for (const b of states) {
      if (b === a) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const ahead = dx * f.x + dz * f.z;
      if (ahead < 1.2 || ahead > range) continue;
      const side = Math.abs(dx * f.z - dz * f.x);
      if (side > lateral) continue;
      best = Math.max(best, (1 - ahead / range) * (1 - side / lateral));
    }
    return Math.min(1, best * 1.6);
  });
}
