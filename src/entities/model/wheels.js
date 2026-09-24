// Four kart wheels (tyre + rim + bolts). Each wheel: steer group (yaw) → spin group (roll).

import * as THREE from 'three';
import { WHEELBASE, FRONT_TRACK, REAR_TRACK, FRONT_WHEEL, REAR_WHEEL } from '../../config/kart.js';

function wheelMesh(spec, mats, side) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(spec.radius, spec.radius, spec.width, 28), mats.tyre);
  tyre.rotation.z = Math.PI / 2;
  const rimR = spec.radius * 0.62;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR, spec.width + 0.006, 18), mats.rim);
  rim.rotation.z = Math.PI / 2;
  g.add(tyre, rim);
  // Bolts on the outer face make the rotation readable
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.035), mats.frame);
    bolt.position.set(side * (spec.width / 2 + 0.006), Math.sin(a) * rimR * 0.55, Math.cos(a) * rimR * 0.55);
    g.add(bolt);
  }
  return g;
}

export function buildWheels(mats) {
  const group = new THREE.Group();
  const wheels = [];
  for (const front of [true, false]) {
    const spec = front ? FRONT_WHEEL : REAR_WHEEL;
    const halfTrack = (front ? FRONT_TRACK : REAR_TRACK) / 2;
    for (const side of [-1, 1]) {
      const steer = new THREE.Group();
      steer.position.set(side * halfTrack, spec.radius, (front ? -1 : 1) * (WHEELBASE / 2));
      const spin = new THREE.Group();
      spin.add(wheelMesh(spec, mats, side));
      steer.add(spin);
      group.add(steer);
      wheels.push({ steer, spin, radius: spec.radius, front, side });
    }
  }
  return { group, wheels };
}
