// Tubular steel chassis: two main rails pinched in at the seat and splayed out to the kingpins and
// the rear bearings, cross members, front stub axles and kingpins, tie rods, a front bumper loop,
// side nerf bars under the pods, a rear bumper frame, seat stays, the floor tray and the rear axle
// with its brake disc and sprocket. Kart space: −Z forward, +Y up, x = right, metres.

import * as THREE from 'three';
import { rod, tube, v3 } from './primitives.js';
import { WHEELBASE, FRONT_TRACK, REAR_TRACK, REAR_WHEEL } from '../../config/kart.js';

const Y = 0.058; // m: centre height of the main rails
const R = 0.015; // m: 30 mm tube
const FZ = -WHEELBASE / 2; // front axle line
const RZ = WHEELBASE / 2; // rear axle line

const mirror = (pts) => pts.map((p) => v3(-p.x, p.y, p.z));

export function buildFrame(mats) {
  const m = mats.frame;
  const parts = [];
  const both = (pts, r = R, seg = 12) => parts.push(tube(pts, r, m, seg), tube(mirror(pts), r, m, seg));
  // Main rails: from the front bumper mounts, out to the kingpins, in along the seat, out to the rear
  both([v3(0.17, Y, -0.84), v3(0.3, Y, -0.7), v3(0.36, Y, FZ), v3(0.29, Y, -0.3), v3(0.22, Y, -0.05),
    v3(0.22, Y, 0.2), v3(0.31, Y, 0.42), v3(0.36, Y, 0.6), v3(0.28, Y, 0.74)], R, 18);
  for (const [z, hw] of [[FZ, 0.36], [-0.2, 0.26], [0.1, 0.22], [0.66, 0.34]]) { // cross members
    parts.push(rod(v3(-hw, Y, z), v3(hw, Y, z), R, m));
  }
  // Front stub axles and kingpins (the wheels steer about these)
  const hub = FRONT_TRACK / 2;
  for (const s of [-1, 1]) {
    parts.push(rod(v3(s * 0.36, Y, FZ), v3(s * (hub - 0.05), 0.14, FZ), 0.013, m));
    const [k0, k1] = [v3(s * (hub - 0.06), 0.1, FZ + 0.02), v3(s * (hub - 0.075), 0.2, FZ - 0.01)];
    parts.push(rod(k0, k1, 0.014, m, 6, 0.014, false));
    parts.push(rod(v3(0, 0.1, -0.5), v3(s * (hub - 0.08), 0.12, FZ + 0.06), 0.007, m)); // tie rod
  }
  // Front bumper: a lower loop and an upper bar carrying the nose
  both([v3(0.17, Y, -0.84), v3(0.24, 0.07, -0.93), v3(0.12, 0.08, -1.0), v3(0, 0.08, -1.01)], 0.012, 8);
  both([v3(0.3, Y, -0.7), v3(0.3, 0.09, -0.86), v3(0.14, 0.1, -0.93), v3(0, 0.1, -0.94)], 0.011, 8);
  // Side nerf bars (the pods sit on them)
  both([v3(0.29, Y, -0.3), v3(0.5, 0.07, -0.3), v3(0.58, 0.09, -0.1),
    v3(0.58, 0.09, 0.15), v3(0.5, 0.07, 0.3), v3(0.31, Y, 0.3)], 0.011, 12);
  // Rear bumper frame behind the wheels
  both([v3(0.28, Y, 0.74), v3(0.4, 0.12, 0.84), v3(0.6, 0.14, 0.86), v3(0.66, 0.16, 0.8)], 0.012, 8);
  parts.push(rod(v3(-0.4, 0.12, 0.84), v3(0.4, 0.12, 0.84), 0.012, m));
  // Seat stays from the back of the seat down to the frame
  both([v3(0.16, 0.44, 0.47), v3(0.3, 0.2, 0.56), v3(0.34, Y, 0.62)], 0.009, 6);
  // Floor tray under the driver's feet
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.006, 0.62), mats.frame);
  tray.position.set(0, Y - 0.012, -0.4);
  parts.push(tray);
  // Rear axle, bearing hangers, brake disc and sprocket
  const ay = REAR_WHEEL.radius;
  parts.push(rod(v3(-REAR_TRACK / 2 + 0.06, ay, RZ), v3(REAR_TRACK / 2 - 0.06, ay, RZ), 0.02, m, 8));
  for (const s of [-1, 1]) parts.push(rod(v3(s * 0.34, Y, RZ), v3(s * 0.34, ay + 0.03, RZ), 0.022, m, 6, 0.03, false));
  const disc = rod(v3(-0.13, ay, RZ), v3(-0.12, ay, RZ), 0.085, mats.engine, 16, 0.085, false);
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.06), mats.shroud);
  caliper.position.set(-0.125, ay + 0.07, RZ - 0.03);
  const sprocket = rod(v3(0.2, ay, RZ), v3(0.206, ay, RZ), 0.075, mats.engine, 16, 0.075, false);
  parts.push(disc, caliper, sprocket);
  return parts;
}
