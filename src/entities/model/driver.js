// Seated driver: suit, arms reaching the steering wheel, helmet with visor and a coloured crown.

import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

// Capsule spanning points a → b.
function limb(a, b, radius, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, len, 4, 10), mat);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  return mesh;
}

const v = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildDriver(mats) {
  const group = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.24, 6, 12), mats.suit);
  torso.position.set(0, 0.45, 0.26);
  torso.rotation.x = 0.3; // leaning back into the seat
  torso.scale.set(1.2, 1, 0.85);
  group.add(torso);

  for (const s of [-1, 1]) {
    group.add(limb(v(s * 0.1, 0.2, 0.12), v(s * 0.13, 0.19, -0.5), 0.07, mats.suit)); // legs
    const shoulder = v(s * 0.2, 0.58, 0.24);
    const elbow = v(s * 0.25, 0.46, 0.02);
    const hand = v(s * 0.13, 0.44, -0.2);
    group.add(limb(shoulder, elbow, 0.05, mats.suit), limb(elbow, hand, 0.045, mats.suit));
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mats.glove);
    glove.position.copy(hand);
    group.add(glove);
  }

  const head = new THREE.Group(); // pivots at the neck so it can lean into corners
  head.position.set(0, 0.68, 0.24);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 10), mats.suit);
  neck.position.y = 0.03;
  const R = 0.155;
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 18), mats.helmet);
  shell.position.y = 0.17;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 28, 10, 0, Math.PI * 2, 0, Math.PI * 0.32), mats.stripe);
  crown.position.y = 0.17;
  // Visor: a band of sphere facing −Z (phi centred on 3π/2)
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.02, 24, 10, Math.PI * 1.13, Math.PI * 0.74, Math.PI * 0.38, Math.PI * 0.22),
    mats.visor,
  );
  visor.position.y = 0.17;
  head.add(neck, shell, crown, visor);
  group.add(head);
  return { group, head };
}
