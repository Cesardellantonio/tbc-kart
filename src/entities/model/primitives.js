// Small mesh helpers for the kart model: a vector shorthand, rods between two points and bent tubes.

import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const mesh = (geo, mat) => new THREE.Mesh(geo, mat);

// Mesh of a (tapered) cylinder spanning a → b.
export function rod(a, b, r, mat, radial = 6, r2 = r, open = true) {
  const dir = v3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, dir.length(), radial, 1, open), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  return m;
}

// Mesh of a bent tube through points (smooth corners).
export function tube(points, r, mat, segments = 12, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, segments, r, radial, false), mat);
}

