// NOVA's anti-gravity kart parts, in kart space (−Z forward, +Y up, metres): four hover pods where the
// wheels were (the fronts turn with the steering) and a reactor with twin thrusters in place of the
// engine. The glow material's brightness follows the throttle (entities/KartModel.js).

import * as THREE from 'three';
import { WHEELBASE, FRONT_TRACK, REAR_TRACK } from '../config/kart.js';
import { rod, v3 } from '../entities/model/primitives.js';
import { mergeStatic } from '../entities/model/merge.js';

export const GLOW = 0x4ffcff; // pods and thrusters

// Same shape as entities/model/wheels.js buildWheels: { group, wheels: [{ steer, spin, front, side }] }.
export function buildHoverPods(mats) {
  const group = new THREE.Group();
  const wheels = [];
  for (const front of [true, false]) {
    const halfTrack = (front ? FRONT_TRACK : REAR_TRACK) / 2 + 0.02;
    for (const side of [-1, 1]) {
      const steer = new THREE.Group();
      steer.position.set(side * halfTrack, 0.11, (front ? -1 : 1) * (WHEELBASE / 2));
      const pod = new THREE.Group();
      const r = front ? 0.15 : 0.17;
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, 0.1, 22), mats.frame);
      const cowl = new THREE.Mesh(new THREE.SphereGeometry(r * 0.82, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1.3), mats.body);
      cowl.position.y = 0.05;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.78, 0.018, 8, 28).rotateX(Math.PI / 2), mats.glow);
      ring.position.y = -0.052;
      const core = new THREE.Mesh(new THREE.CircleGeometry(r * 0.6, 22).rotateX(Math.PI / 2), mats.glow);
      core.position.y = -0.051;
      pod.add(housing, cowl, ring, core);
      mergeStatic(pod, { alias: mats.alias });
      steer.add(pod);
      group.add(steer);
      wheels.push({ steer, spin: pod, radius: r, front, side, hover: true });
    }
  }
  return { group, wheels };
}

// Reactor beside the seat (where the rental engine sat) and twin thrusters at the back.
export function buildThruster(mats) {
  const parts = [];
  const X = 0.3;
  parts.push(rod(v3(X, 0.27, 0.28), v3(X, 0.27, 0.62), 0.095, mats.frame, 18, 0.095, false)); // reactor can
  for (const z of [0.34, 0.45, 0.56]) parts.push(rod(v3(X, 0.27, z), v3(X, 0.27, z + 0.025), 0.1, mats.glow, 18, 0.1, false));
  for (const x of [-0.24, 0.24]) {
    parts.push(rod(v3(x, 0.26, 0.6), v3(x, 0.26, 0.86), 0.075, mats.frame, 16, 0.06, false)); // nozzle
    const exit = new THREE.Mesh(new THREE.CircleGeometry(0.056, 18), mats.glow);
    exit.position.set(x, 0.26, 0.862);
    parts.push(exit);
  }
  parts.push(rod(v3(-0.24, 0.26, 0.66), v3(0.24, 0.26, 0.66), 0.03, mats.frame, 8)); // thruster yoke
  return parts;
}
