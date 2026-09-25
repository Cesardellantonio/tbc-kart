// Four kart wheels. Each: steer group (yaw) → spin group (roll) → one tyre draw and one rim draw.
// The tyre is a lathe of a slick's cross-section (flat tread, rounded shoulders, bulging sidewalls
// down to the bead); the rim is a 5-inch barrel with a flange lip, five spokes and a hub nut in
// front of a dark web, so the spokes read (and show the wheel turning) from any side.

import * as THREE from 'three';
import { WHEELBASE, FRONT_TRACK, REAR_TRACK, FRONT_WHEEL, REAR_WHEEL } from '../../config/kart.js';
import { mergeStatic } from './merge.js';

const RIM = 0.072; // m: 5-inch rim radius at the flange
const SEGMENTS = 22; // around the tyre

// Revolve (radius, offset along the axle) points about the axle (x).
function lathe(points, segments) {
  return new THREE.LatheGeometry(points.map(([r, h]) => new THREE.Vector2(r, h)), segments).rotateZ(-Math.PI / 2);
}

function tyreProfile(R, W) {
  const bead = RIM + 0.004;
  const half = [
    [bead, 0.86], [bead + 0.4 * (R - bead), 1.0], [R - 0.03, 1.03], [R - 0.012, 0.95], [R - 0.003, 0.8], [R, 0.45],
  ];
  return [...half.map(([r, h]) => [r, -h * W]), ...half.reverse().map(([r, h]) => [r, h * W])];
}

// Wheel with its outer face toward +x.
function wheelMesh(spec, mats) {
  const W = spec.width / 2;
  const g = new THREE.Group();
  g.add(new THREE.Mesh(lathe(tyreProfile(spec.radius, W), SEGMENTS), mats.tyre));
  for (const s of [1, -1]) { // dark web behind the spokes, facing out on both sides
    const web = new THREE.Mesh(new THREE.CircleGeometry(RIM - 0.004, 14), mats.tyre);
    web.rotation.y = (s * Math.PI) / 2;
    web.position.x = s * 0.2 * W;
    g.add(web);
  }
  const rimPts = [ // barrel, then the outer flange lip
    [RIM - 0.007, -0.7 * W], [RIM - 0.007, 0.76 * W], [RIM + 0.006, 0.84 * W], [RIM + 0.004, 0.92 * W], [RIM - 0.005, 0.9 * W],
  ];
  g.add(new THREE.Mesh(lathe(rimPts, 18), mats.rim));
  for (let k = 0; k < 5; k++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.012, RIM - 0.02, 0.017), mats.rim);
    const a = (k / 5) * Math.PI * 2;
    spoke.rotation.x = a;
    spoke.position.set(0.55 * W, Math.cos(a) * (RIM / 2 + 0.006), Math.sin(a) * (RIM / 2 + 0.006));
    g.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.7 * W, 10).rotateZ(-Math.PI / 2), mats.hub);
  hub.position.x = 0.55 * W;
  g.add(hub);
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
      const wheel = wheelMesh(spec, mats);
      if (side < 0) wheel.rotation.y = Math.PI; // outer face to the left
      spin.add(wheel);
      mergeStatic(spin, { alias: mats.alias });
      steer.add(spin);
      group.add(steer);
      wheels.push({ steer, spin, radius: spec.radius, front, side });
    }
  }
  return { group, wheels };
}
