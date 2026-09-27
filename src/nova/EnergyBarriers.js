// NOVA barriers: low alloy blocks with a light bar along the top in the planet's accent colour, on the
// classic barrier lines (the same collider faces, so racing and the AI are unchanged).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { barrierFaces, barrierCentres } from '../track/barrierLines.js';
import { placeBlocks } from '../world/Barriers.js';
import { BARRIER_LENGTH, BARRIER_HEIGHT, BARRIER_THICKNESS } from '../config/track.js';
import { BARRIER_SHADOWS } from '../config/render.js';

export function createEnergyBarriers(path, accent) {
  const blocks = [];
  for (const run of barrierCentres(path)) placeBlocks(run, blocks);
  const faces = barrierFaces(path);
  const H = BARRIER_HEIGHT * 0.8;
  const base = new THREE.InstancedMesh(
    new RoundedBoxGeometry(BARRIER_LENGTH * 0.96, H, BARRIER_THICKNESS, 2, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x20242e, roughness: 0.32, metalness: 0.85 }),
    blocks.length,
  );
  const bar = new THREE.InstancedMesh(
    new THREE.BoxGeometry(BARRIER_LENGTH * 0.8, 0.05, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: accent, emissiveIntensity: 4 }),
    blocks.length,
  );
  const side = new THREE.InstancedMesh(
    new THREE.BoxGeometry(BARRIER_LENGTH * 0.5, 0.03, BARRIER_THICKNESS + 0.01),
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: accent, emissiveIntensity: 1.6 }),
    blocks.length,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const upAxis = new THREE.Vector3(0, 1, 0);
  blocks.forEach((b, i) => {
    q.setFromAxisAngle(upAxis, b.angle);
    base.setMatrixAt(i, m.compose(new THREE.Vector3(b.x, H / 2, b.z), q, one));
    bar.setMatrixAt(i, m.compose(new THREE.Vector3(b.x, H + 0.02, b.z), q, one));
    side.setMatrixAt(i, m.compose(new THREE.Vector3(b.x, H * 0.45, b.z), q, one)); // a glowing seam round the middle
  });
  base.castShadow = BARRIER_SHADOWS;
  base.receiveShadow = true;
  const group = new THREE.Group();
  group.add(base, bar, side);
  return { mesh: group, faces, blocks };
}
