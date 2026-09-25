// Seated driver in a race suit: a lofted torso reclined into the seat (hips, waist, chest,
// shoulders sloping to the neck), a neck brace, legs reaching the pedals, boots, skinned arms that
// keep the gloves on the wheel, and a full-face helmet on a head group that pivots at the neck.

import * as THREE from 'three';
import { mergeStatic } from './merge.js';
import { gridSurface, ring, cap } from './shapes.js';
import { rod, mesh, v3 } from './primitives.js';
import { buildHelmet } from './helmet.js';
import { buildArms } from './arms.js';
import { COCKPIT } from '../../config/kart.js';

// Torso sections, pelvis → neck: [y, z, half width, half depth front, half depth back] (m)
const TORSO = [
  [0.075, 0.24, 0.13, 0.08, 0.08],
  [0.13, 0.245, 0.17, 0.115, 0.105],
  [0.25, 0.268, 0.155, 0.105, 0.1],
  [0.37, 0.298, 0.17, 0.12, 0.104],
  [0.47, 0.318, 0.186, 0.124, 0.104],
  [0.545, 0.332, 0.2, 0.11, 0.098],
  [0.6, 0.342, 0.178, 0.088, 0.088],
  [0.64, 0.342, 0.105, 0.068, 0.072],
  [0.665, 0.338, 0.056, 0.052, 0.052],
];
const X = v3(1, 0, 0);
const Z = v3(0, 0, 1);

function torso(mat) {
  const rows = TORSO.map(([y, z, hw, df, db]) => ring(v3(0, y, z), X, Z, hw, db, 14, 2.6, df));
  const centre = v3(0, 0.35, 0.3);
  const out = (i, j) => rows[i][j].clone().sub(v3(0, rows[i][j].y, TORSO[i][1]));
  return [mesh(gridSurface(rows, { wrap: true, out }), mat), mesh(cap(rows[0], centre), mat), mesh(cap(rows.at(-1), centre), mat)];
}

// Suit side panels: a band down each flank from the armpit to the hip, just proud of the torso.
function panels(mat) {
  const fine = TORSO.slice(1, 6).map(([y, z, hw, df, db]) => ring(v3(0, y, z), X, Z, hw * 1.012, db * 1.012, 48, 2.6, df * 1.012));
  return [0, 24].map((k) => {
    const rows = fine.map((r) => [-2, -1, 0, 1, 2].map((d) => r[(k + d + 48) % 48]));
    return mesh(gridSurface(rows, { out: (i, j) => rows[i][j].clone().sub(v3(0, rows[i][j].y, TORSO[i + 1][1])) }), mat);
  });
}

function leg(side, mats) {
  const hip = v3(side * 0.085, 0.13, 0.19);
  const knee = v3(side * 0.125, 0.27, -0.15);
  const ankle = v3(side * 0.11, 0.145, -0.53);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.056, 8, 6), mats.suit);
  knob.position.copy(knee);
  const boot = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), mats.boot);
  boot.scale.set(0.046, 0.042, 0.12);
  boot.position.set(side * 0.105, 0.16, -0.595);
  boot.rotation.x = 0.85; // toes up on the pedal
  return [rod(hip, knee, 0.074, mats.suit, 8, 0.058), knob, rod(knee, ankle, 0.052, mats.suit, 8, 0.04), boot];
}

export function buildDriver(mats) {
  const group = new THREE.Group();
  group.add(...torso(mats.suit), ...panels(mats.panel), ...leg(-1, mats), ...leg(1, mats));
  const brace = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.02, 5, 12, Math.PI * 1.5), mats.collar);
  brace.rotation.set(Math.PI / 2, 0, -Math.PI * 0.25); // lies on the shoulders, open at the chin
  brace.position.set(0, 0.64, 0.335);
  group.add(brace);

  const head = new THREE.Group(); // pivots at the neck so it can lean into corners
  head.position.set(...COCKPIT.headPivot);
  const helmet = buildHelmet(mats);
  helmet.position.set(0, 0.16, -0.022);
  helmet.rotation.x = -0.06; // looking ahead over the reclined torso
  head.add(helmet);
  group.add(head);
  mergeStatic(head, { alias: mats.alias });

  const arms = buildArms(mats);
  arms.update(0);
  group.add(arms.mesh);
  mergeStatic(group, { keep: [head, arms.mesh], alias: mats.alias });
  return { group, head, arms };
}
