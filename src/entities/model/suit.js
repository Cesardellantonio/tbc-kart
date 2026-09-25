// The driver's race suit below the helmet: a lofted torso reclined into the seat (hips, waist,
// chest, shoulders sloping to a stand-up collar), side panels in the kart's colour, a neck brace,
// and legs reaching the pedals with boots on them. Kart space, metres.

import * as THREE from 'three';
import { gridSurface, ring, cap } from './shapes.js';
import { rod, mesh, v3 } from './primitives.js';
import { bootGeometry, BOOT_PITCH } from './boot.js';

// Torso sections, pelvis → neck: [y, z, half width, half depth front, half depth back] (m). The
// centres lean back ~20° from the hips, as in a rental-kart seat; the last row is the suit's collar.
const TORSO = [
  [0.077, 0.23, 0.13, 0.08, 0.08],
  [0.13, 0.245, 0.17, 0.115, 0.105],
  [0.243, 0.29, 0.155, 0.105, 0.1],
  [0.356, 0.342, 0.17, 0.12, 0.104],
  [0.45, 0.381, 0.186, 0.124, 0.104],
  [0.521, 0.409, 0.2, 0.11, 0.098],
  [0.573, 0.429, 0.178, 0.088, 0.088],
  [0.613, 0.437, 0.105, 0.068, 0.072],
  [0.638, 0.432, 0.058, 0.054, 0.05],
  [0.68, 0.422, 0.05, 0.048, 0.044],
];
const X = v3(1, 0, 0);
const Z = v3(0, 0, 1);

function torso(mat) {
  const rows = TORSO.map(([y, z, hw, df, db]) => ring(v3(0, y, z), X, Z, hw, db, 20, 2.6, df));
  const centre = v3(0, 0.35, 0.3);
  const out = (i, j) => rows[i][j].clone().sub(v3(0, rows[i][j].y, TORSO[i][1]));
  const body = gridSurface(rows, { wrap: true, out });
  return [mesh(body, mat), mesh(cap(rows[0], centre), mat), mesh(cap(rows.at(-1), centre), mat)];
}

// Suit side panels in the kart's colour: a band from the armpit to the hip on the front of each
// flank (ring points 0 / 24 are the sides, lower indices on the right run forward), where the arms
// and the seat wall leave it in view.
function panels(mat) {
  const fine = TORSO.slice(1, 6).map(([y, z, hw, df, db]) =>
    ring(v3(0, y, z), X, Z, hw * 1.012, db * 1.012, 48, 2.6, df * 1.012));
  return [-4, 28].map((k) => {
    const rows = fine.map((r) => [-2, -1, 0, 1, 2].map((d) => r[(k + d + 48) % 48]));
    const out = (i, j) => rows[i][j].clone().sub(v3(0, rows[i][j].y, TORSO[i + 1][1]));
    return mesh(gridSurface(rows, { out }), mat);
  });
}

// Leg: thigh up to the knee, shin down to the ankle, and the boot flat on its pedal with the toes up
// ~30° (pedals match, cockpit.js), low enough that the front panel hides the toes from the cockpit.
function leg(side, mats) {
  const hip = v3(side * 0.085, 0.13, 0.19);
  const knee = v3(side * 0.125, 0.27, -0.15);
  const ankle = v3(side * 0.108, 0.15, -0.512);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.056, 8, 6), mats.suit);
  knob.position.copy(knee);
  const boot = bootGeometry().map((g) => {
    const m = new THREE.Mesh(g, mats.boot);
    m.position.set(side * 0.105, 0.055, -0.5); // heel on the floor tray
    m.rotation.x = BOOT_PITCH;
    return m;
  });
  return [rod(hip, knee, 0.074, mats.suit, 8, 0.058), knob, rod(knee, ankle, 0.052, mats.suit, 8, 0.04), ...boot];
}

export function buildSuit(mats) {
  // Neck brace: a closed oval ring resting on the collar, just under the helmet's hem at the back
  const brace = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 7, 24), mats.collar);
  brace.scale.set(1, 0.86, 1); // deeper side to side than front to back, like the real thing
  brace.rotation.x = Math.PI / 2 - 0.14;
  brace.position.set(0, 0.603, 0.412);
  return [...torso(mats.suit), ...panels(mats.panel), ...leg(-1, mats), ...leg(1, mats), brace];
}
