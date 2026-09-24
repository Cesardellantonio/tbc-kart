// Plastic barrier blocks lining both sides of the track (one instanced mesh) + their collider faces.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { barrierFaces, barrierCentres } from '../track/barrierLines.js';
import { BARRIER_LENGTH, BARRIER_HEIGHT, BARRIER_THICKNESS, BARRIER_COLORS } from '../config/track.js';

// Evenly spaced block centres + directions along a polyline run.
function placeBlocks(run, out) {
  const pts = run.closed ? [...run, run[0]] : run;
  const cum = [0];
  for (let k = 1; k < pts.length; k++) {
    cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z));
  }
  const total = cum.at(-1);
  const count = Math.max(1, Math.round(total / BARRIER_LENGTH));
  const step = total / count;
  let k = 1;
  for (let b = 0; b < count; b++) {
    const s = (b + 0.5) * step;
    while (k < pts.length - 1 && cum[k] < s) k++;
    const a = pts[k - 1];
    const c = pts[k];
    const t = (s - cum[k - 1]) / Math.max(1e-6, cum[k] - cum[k - 1]);
    out.push({ x: a.x + (c.x - a.x) * t, z: a.z + (c.z - a.z) * t, angle: Math.atan2(-(c.z - a.z), c.x - a.x) });
  }
}

export function createBarriers(path) {
  const blocks = [];
  for (const run of barrierCentres(path)) placeBlocks(run, blocks);
  const faces = barrierFaces(path);

  const geometry = new RoundedBoxGeometry(BARRIER_LENGTH * 0.97, BARRIER_HEIGHT, BARRIER_THICKNESS, 1, 0.06);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0 });
  const mesh = new THREE.InstancedMesh(geometry, material, blocks.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1);
  const colors = BARRIER_COLORS.map((c) => new THREE.Color(c));
  blocks.forEach((b, i) => {
    q.setFromAxisAngle(up, b.angle);
    mesh.setMatrixAt(i, m.compose(new THREE.Vector3(b.x, BARRIER_HEIGHT / 2, b.z), q, one));
    mesh.setColorAt(i, colors[i % colors.length]);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, faces, blocks };
}
