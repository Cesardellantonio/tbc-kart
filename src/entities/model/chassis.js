// Kart chassis + bodywork in kart space (−Z forward, +Y up, origin on the ground at the centre).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { numberPlateTexture } from '../../world/textures/markings.js';
import { KART_NUMBER } from '../../config/kart.js';

const rbox = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);

function place(group, mesh, x, y, z, rx = 0) {
  mesh.position.set(x, y, z);
  mesh.rotation.x = rx;
  group.add(mesh);
  return mesh;
}

// Nose cone: side profile (z, y) extruded across the kart's width.
function noseGeometry(width) {
  const s = new THREE.Shape();
  s.moveTo(-0.98, 0.07);
  s.lineTo(-0.98, 0.15);
  s.bezierCurveTo(-0.9, 0.22, -0.72, 0.29, -0.44, 0.31);
  s.lineTo(-0.44, 0.07);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3 });
  g.rotateY(-Math.PI / 2); // profile x → kart z (nose at −Z); extrusion depth → across the kart (X)
  g.translate(width / 2, 0, 0);
  return g;
}

export function buildChassis(mats) {
  const g = new THREE.Group();
  place(g, rbox(0.62, 0.04, 1.55, 0.015, mats.frame), 0, 0.075, 0); // floor pan
  place(g, rbox(0.17, 0.17, 0.66, 0.05, mats.body), -0.43, 0.16, 0.03); // side pods
  place(g, rbox(0.17, 0.17, 0.66, 0.05, mats.body), 0.43, 0.16, 0.03);
  place(g, new THREE.Mesh(noseGeometry(0.74), mats.body), 0, 0, 0);
  place(g, rbox(0.95, 0.07, 0.09, 0.03, mats.accent), 0, 0.1, -1.02); // front bumper
  place(g, rbox(1.24, 0.13, 0.15, 0.05, mats.accent), 0, 0.17, 0.9); // rear bumper
  place(g, rbox(0.46, 0.34, 0.05, 0.02, mats.body), 0, 0.33, 0.8, 0.12); // rear number panel

  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(0.1, 24),
    new THREE.MeshStandardMaterial({ map: numberPlateTexture(KART_NUMBER), roughness: 0.4 }),
  );
  plate.position.set(0, 0.235, -0.87);
  plate.lookAt(0, 0.235 + 0.88, -0.87 - 0.46); // face forward-up along the nose slope
  g.add(plate);

  place(g, rbox(0.42, 0.07, 0.38, 0.03, mats.accent), 0, 0.14, 0.2); // seat base
  place(g, rbox(0.44, 0.48, 0.07, 0.03, mats.accent), 0, 0.37, 0.41, 0.35); // seat back
  place(g, rbox(0.26, 0.26, 0.3, 0.04, mats.engine), 0.38, 0.27, 0.44); // engine block
  const exhaust = place(g, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 10), mats.frame), 0.52, 0.2, 0.7);
  exhaust.rotation.x = Math.PI / 2;

  const column = place(g, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.36, 8), mats.frame), 0, 0.29, -0.37);
  column.rotation.x = 0.8;
  const steering = new THREE.Group(); // tilted to face the driver; child rotates on its own axis
  steering.position.set(0, 0.42, -0.24);
  steering.rotation.x = -0.76;
  const wheel = new THREE.Group();
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 8, 28), mats.accent));
  wheel.add(new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.03, 0.02), mats.frame));
  steering.add(wheel);
  g.add(steering);
  return { group: g, steeringWheel: wheel };
}
