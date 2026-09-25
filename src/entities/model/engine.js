// Honda GX-style rental engine beside the seat: cast crankcase on a mounting plate, a finned
// cylinder leaning forward under its valve cover, the red fan shroud with the recoil starter on the
// outboard side, a black air box, the exhaust header into a rear silencer, and the chain guard.

import * as THREE from 'three';
import { ring, cap, gridSurface } from './shapes.js';
import { rod, tube, mesh, v3 } from './primitives.js';

const X = 0.31; // m: engine centre line, right of the seat

// Rounded block: superellipse sections stacked along y (size = full width, height, length).
function block(c, [sx, sy, sz], mat, tiltX = 0) {
  const rows = [-0.5, -0.42, 0.42, 0.5].map((f, i) => {
    const k = i % 3 ? 1 : 0.8; // pinched top and bottom edges
    return ring(v3(0, f * sy, 0), v3(1, 0, 0), v3(0, 0, 1), (sx / 2) * k, (sz / 2) * k, 12, 4);
  });
  const g = new THREE.Group();
  g.add(mesh(gridSurface(rows, { wrap: true, out: (i, j) => v3(rows[i][j].x, 0, rows[i][j].z) }), mat));
  g.add(mesh(cap(rows[0], v3()), mat), mesh(cap(rows[3], v3()), mat));
  g.position.copy(c);
  g.rotation.x = tiltX;
  return g;
}

function silencer(mat) {
  const profile = [[0.001, 0], [0.035, 0.002], [0.055, 0.035], [0.055, 0.21], [0.04, 0.24], [0.013, 0.245], [0.013, 0.285]];
  const geo = new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), 14).rotateX(Math.PI / 2);
  const m = mesh(geo, mat);
  m.position.set(X + 0.01, 0.37, 0.55);
  return m;
}

export function buildEngine(mats) {
  const lean = -0.42; // rad the cylinder leans forward
  const head = block(v3(X, 0.31, 0.41), [0.11, 0.13, 0.11], mats.engine, lean);
  for (let k = 0; k < 4; k++) { // cooling fins
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.007, 0.145), mats.engine);
    fin.position.y = -0.045 + k * 0.026;
    head.add(fin);
  }
  head.add(block(v3(0, 0.083, 0), [0.1, 0.04, 0.1], mats.engine));
  return [
    block(v3(X, 0.1, 0.45), [0.2, 0.012, 0.28], mats.frame), // mounting plate
    block(v3(X, 0.185, 0.45), [0.16, 0.14, 0.22], mats.engine), // crankcase
    head,
    block(v3(X + 0.095, 0.255, 0.45), [0.05, 0.25, 0.25], mats.shroud), // fan shroud
    rod(v3(X + 0.12, 0.24, 0.455), v3(X + 0.13, 0.24, 0.455), 0.078, mats.accent, 16, 0.07, false), // recoil starter
    block(v3(X + 0.1, 0.39, 0.5), [0.022, 0.02, 0.06], mats.accent), // pull handle
    block(v3(X, 0.335, 0.27), [0.15, 0.12, 0.09], mats.accent), // air box
    tube([v3(X, 0.35, 0.44), v3(X + 0.02, 0.39, 0.5), v3(X + 0.01, 0.37, 0.56)], 0.016, mats.exhaust, 6, 6),
    silencer(mats.exhaust),
    block(v3(0.21, 0.16, 0.5), [0.03, 0.17, 0.25], mats.accent), // chain guard
  ];
}
