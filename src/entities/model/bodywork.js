// Rental-kart bodywork (moulded plastic): a wide nose fairing, the front panel shielding the
// driver's shins, side pods between the wheels, the full-width rear bumper and a rear number board.
// Each moulding is a heightfield over its footprint, closed down to its underside.

import * as THREE from 'three';
import { solid } from './shapes.js';
import { mesh, v3 } from './primitives.js';
import { smoothstep } from '../../core/math.js';

const range = (n) => Array.from({ length: n + 1 }, (_, k) => k / n);

// top(u, v) → point on the upper surface for u, v in 0..1; the underside is the same footprint at `floor`.
function moulding(nu, nv, top, floor) {
  const upper = range(nu).map((u) => range(nv).map((v) => top(u, v)));
  return solid(upper, upper.map((row) => row.map((p) => v3(p.x, floor, p.z))));
}

// Softens a moulding's edge: 1 across the middle, falling to `edge` at s = ±1.
const shoulder = (s, edge = 0.35, sharp = 6) => edge + (1 - edge) * Math.sqrt(1 - Math.abs(s) ** sharp);

function nose() {
  return moulding(8, 12, (u, v) => {
    const s = v * 2 - 1;
    const hw = 0.38 + 0.18 * smoothstep(0, 0.4, u);
    const z = -1.03 + 0.33 * u + 0.06 * s * s * (1 - u); // rounded front edge
    const centre = 0.125 + 0.1 * smoothstep(0, 1, u); // the crown rises toward the driver…
    const side = 0.1 + 0.04 * u; // …over lower flanks in front of the wheels
    const h = side + (centre - side) * (1 - Math.abs(s) ** 2.4);
    return v3(s * hw, 0.05 + (h - 0.05) * shoulder(s, 0.4), z);
  }, 0.05);
}

// Front panel: a bowed board from the nose up toward the steering wheel.
export const PANEL = { bottom: [0.215, -0.745], top: [0.43, -0.5] }; // [y, z] of its edges (m)
function frontPanel() {
  const grid = (lift) => range(4).map((t) => range(6).map((v) => {
    const s = v * 2 - 1;
    const y = PANEL.bottom[0] + (PANEL.top[0] - PANEL.bottom[0]) * t;
    const z = PANEL.bottom[1] + (PANEL.top[1] - PANEL.bottom[1]) * t - 0.035 * (1 - s * s) - lift * 0.66;
    return v3(s * (0.19 - 0.04 * t), y + lift * 0.75, z);
  }));
  return solid(grid(0.012), grid(0));
}

function sidePod(side) {
  return moulding(9, 6, (u, v) => {
    const ends = Math.sin(Math.PI * u) ** 0.35;
    const z = -0.36 + 0.7 * u + 0.05 * v * (1 - 2 * u); // outer edge shorter than the inner one
    const h = (0.075 + 0.085 * v) * (0.45 + 0.55 * ends) * shoulder(v, 0.45);
    return v3(side * (0.3 + 0.34 * v), 0.065 + h, z);
  }, 0.065);
}

function rearBumper() {
  return moulding(12, 5, (u, v) => {
    const s = u * 2 - 1;
    const z = 0.72 + 0.24 * v - 0.08 * Math.abs(s) ** 6 * v; // rounded rear corners
    const h = (0.2 + 0.05 * Math.abs(s) ** 3) - 0.06;
    return v3(s * 0.7, 0.06 + h * shoulder(v * 2 - 1, 0.5), z);
  }, 0.06);
}

// Rear number board: its top leans forward so the face tips up toward the chase camera.
export const BOARD = { centre: [0, 0.3, 0.86], tilt: -0.18, thickness: 0.012 }; // m, rad

export function buildBodywork(mats) {
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, BOARD.thickness), mats.body);
  board.position.set(...BOARD.centre);
  board.rotation.x = BOARD.tilt;
  return [
    mesh(nose(), mats.body), mesh(frontPanel(), mats.body),
    mesh(sidePod(-1), mats.body), mesh(sidePod(1), mats.body),
    mesh(rearBumper(), mats.accent), board,
  ];
}
