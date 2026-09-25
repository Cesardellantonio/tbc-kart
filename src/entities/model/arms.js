// The driver's arms as one skinned mesh (one draw call): each upper arm and forearm + glove is bound
// rigidly to its own bone. update() solves a two-bone reach every frame so the gloves stay on the
// rim at quarter to three and the elbows bend out and down as the wheel turns.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COCKPIT } from '../../config/kart.js';
import { bakeParts } from './merge.js';
import { rod, v3 } from './primitives.js';

const { upperArm: A, forearm: B, wheelRadius: R } = COCKPIT;
const SLIDE = 0.07; // m a shoulder may reach forward when the grip is past arm's length (full lock)

function ball(r, sx, sy, sz, y, mat) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat);
  m.scale.set(sx, sy, sz);
  m.position.y = y;
  return m;
}

// Segment parts along +Y from the joint: upper arm (sleeve) or forearm with gauntlet and glove.
function segment(mats, fore) {
  const parts = fore
    ? [rod(v3(), v3(0, B - 0.1, 0), 0.043, mats.suit, 8, 0.036),
      rod(v3(0, B - 0.115, 0), v3(0, B - 0.045, 0), 0.041, mats.glove, 8, 0.047, false),
      ball(1, 0.047, 0.058, 0.038, B - 0.008, mats.glove)]
    : [rod(v3(), v3(0, A, 0), 0.054, mats.suit, 8, 0.044), ball(0.06, 1, 1, 1, 0, mats.suit), ball(0.046, 1, 1, 1, A, mats.suit)];
  new THREE.Group().add(...parts).updateMatrixWorld(true);
  return bakeParts(parts, mats.suit, undefined, true);
}

export function buildArms(mats) {
  const bones = [0, 1, 2, 3].map(() => new THREE.Bone());
  const baked = bones.map((_, i) => segment(mats, i % 2 === 1));
  const geo = mergeGeometries(baked.map(([g]) => g));
  const count = baked.map(([g]) => g.attributes.position.count);
  const skinIndex = count.flatMap((n, i) => Array(n).fill([i, 0, 0, 0]).flat());
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(count.flatMap((n) => Array(n).fill([1, 0, 0, 0]).flat()), 4));
  const mesh = new THREE.SkinnedMesh(geo, baked[0][1]);
  mesh.add(...bones);
  mesh.bind(new THREE.Skeleton(bones, bones.map(() => new THREE.Matrix4())), new THREE.Matrix4());
  mesh.frustumCulled = false; // bones move it; it never leaves the kart
  return { mesh, update: reach(bones) };
}

// Pose solver: turn = steering wheel rotation (rad).
function reach(bones) {
  const wheel = new THREE.Matrix4().compose(v3(...COCKPIT.wheelCentre),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(-COCKPIT.wheelTilt, 0, 0)), v3(1, 1, 1));
  const [S, T, E, u, w, x, y, z, t] = Array.from({ length: 9 }, () => v3());
  const basis = new THREE.Matrix4();
  const orient = (bone, from, to, tangent) => {
    y.subVectors(to, from).normalize();
    x.copy(tangent).addScaledVector(y, -tangent.dot(y)).normalize();
    z.crossVectors(x, y);
    bone.position.copy(from);
    bone.quaternion.setFromRotationMatrix(basis.makeBasis(x, y, z));
  };
  return (turn) => {
    for (const side of [-1, 1]) {
      const [c, s] = [Math.cos(turn), Math.sin(turn)];
      T.set(side * R * c, side * R * s, 0).applyMatrix4(wheel); // grip on the rim
      t.set(-s, c, 0).transformDirection(wheel); // rim tangent there
      S.set(side * COCKPIT.shoulder[0], COCKPIT.shoulder[1], COCKPIT.shoulder[2]);
      u.subVectors(T, S);
      let d = u.length();
      S.addScaledVector(u, Math.min(SLIDE, Math.max(0, d - (A + B) * 0.98)) / d);
      d = Math.min(u.subVectors(T, S).length(), (A + B) * 0.999);
      u.normalize();
      w.set(side * COCKPIT.elbowOut[0], COCKPIT.elbowOut[1], COCKPIT.elbowOut[2]);
      w.addScaledVector(u, -w.dot(u)).normalize();
      const along = (A * A - B * B + d * d) / (2 * d);
      E.copy(S).addScaledVector(u, along).addScaledVector(w, Math.sqrt(Math.max(0, A * A - along * along)));
      const [upper, fore] = side < 0 ? [bones[0], bones[1]] : [bones[2], bones[3]];
      orient(upper, S, E, w);
      orient(fore, E, T, t);
    }
  };
}
