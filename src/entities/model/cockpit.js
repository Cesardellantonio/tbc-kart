// Cockpit parts: the moulded bucket seat, the fuel tank between the driver's legs, pedals, the
// steering column with its support, and the steering wheel (three spokes, padded grips at quarter
// to three) on its own group so it can turn.

import * as THREE from 'three';
import { solid, ring, cap, gridSurface } from './shapes.js';
import { rod, mesh, v3 } from './primitives.js';
import { COCKPIT } from '../../config/kart.js';

// Seat stations up the bucket: [y, z] of the inner surface's centre line (fits the torso's back)
const SEAT = [
  [0.095, 0.03], [0.07, 0.14], [0.068, 0.25], [0.1, 0.345],
  [0.25, 0.378], [0.37, 0.41], [0.47, 0.43], [0.565, 0.445],
];

function seat(mat) {
  const surface = (grow) => SEAT.map(([y, z], i) => {
    const [py, pz] = SEAT[Math.max(0, i - 1)];
    const [ny, nz] = SEAT[Math.min(SEAT.length - 1, i + 1)];
    const n = v3(0, nz - pz, -(ny - py)).normalize(); // toward the driver
    const [hw, depth] = [0.2 + 0.012 * (i / SEAT.length) + grow, 0.095];
    return Array.from({ length: 9 }, (_, j) => {
      const phi = (j / 8 - 0.5) * Math.PI;
      const x = Math.sign(phi) * Math.abs(Math.sin(phi)) ** 0.55 * hw;
      return v3(x, y, z).addScaledVector(n, depth * (1 - Math.cos(phi)) - grow);
    });
  });
  return mesh(solid(surface(0.012), surface(0)), mat);
}

function tank(mats) {
  const rows = [-0.43, -0.415, -0.17, -0.155].map((z, i) =>
    ring(v3(0, 0.1, z), v3(1, 0, 0), v3(0, 1, 0), i % 3 ? 0.062 : 0.05, i % 3 ? 0.048 : 0.036, 12, 3.5));
  const inside = v3(0, 0.1, -0.3);
  return [mesh(gridSurface(rows, { wrap: true, out: (i, j) => rows[i][j].clone().sub(v3(0, 0.1, rows[i][j].z)) }), mats.tank),
    mesh(cap(rows[0], inside), mats.tank), mesh(cap(rows[3], inside), mats.tank),
    rod(v3(0, 0.14, -0.25), v3(0, 0.165, -0.25), 0.02, mats.accent, 10, 0.02, false)];
}

function pedals(mats) {
  const out = [];
  for (const s of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.12, 0.012), mats.frame);
    plate.position.set(s * 0.105, 0.128, -0.64);
    plate.rotation.x = -0.72; // square to the boot sole
    out.push(plate, rod(v3(s * 0.105, 0.1, -0.62), v3(s * 0.105, 0.055, -0.58), 0.008, mats.frame));
  }
  return out;
}

function steeringWheel(mats) {
  const R = COCKPIT.wheelRadius;
  const wheel = new THREE.Group();
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.012, 6, 28), mats.accent));
  for (const a of [-0.42, Math.PI - 0.42]) { // padded grips at quarter to three
    const grip = new THREE.Mesh(new THREE.TorusGeometry(R, 0.019, 6, 7, 0.84), mats.accent);
    grip.rotation.z = a;
    wheel.add(grip);
  }
  for (const a of [0, Math.PI, -Math.PI / 2]) { // spokes, dished toward the column
    wheel.add(rod(v3(0, 0, -0.03), v3(Math.cos(a) * R, Math.sin(a) * R, 0), 0.011, mats.frame, 4));
  }
  wheel.add(rod(v3(0, 0, -0.06), v3(0, 0, -0.025), 0.038, mats.frame, 12, 0.032, false)); // hub
  return wheel;
}

// Column axis runs from the hub down through the floor, square to the wheel.
export function buildCockpit(mats) {
  const hub = v3(...COCKPIT.wheelCentre);
  const axis = v3(0, Math.sin(COCKPIT.wheelTilt), Math.cos(COCKPIT.wheelTilt));
  const foot = hub.clone().addScaledVector(axis, -0.44);
  const mid = hub.clone().addScaledVector(axis, -0.2);
  const parts = [seat(mats.seat), ...tank(mats), ...pedals(mats), rod(hub, foot, 0.012, mats.frame, 8),
    rod(mid, v3(-0.12, 0.058, -0.2), 0.008, mats.frame), rod(mid, v3(0.12, 0.058, -0.2), 0.008, mats.frame)];
  const steering = new THREE.Group(); // tilted to face the driver; the wheel turns on its own axis
  steering.position.copy(hub);
  steering.rotation.x = -COCKPIT.wheelTilt;
  const wheel = steeringWheel(mats);
  steering.add(wheel);
  return { parts, steering, wheel };
}
