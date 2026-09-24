// Red/white curbs on the inside of tight corners. Width shrinks at the apex so it never folds over.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { stripGeometry } from '../track/stripGeometry.js';
import { curbTexture } from './textures/markings.js';
import {
  PAINT_Y, CURB_WIDTH, CURB_OVERLAP, CURB_MIN_CURVATURE, CURB_MIN_LENGTH, CURB_EXTEND,
  CURB_STRIPE, CURB_RED, CURB_WHITE,
} from '../config/track.js';

// Runs of consecutive samples that turn the same way sharply enough to deserve a curb.
export function cornerRuns(path) {
  const n = path.count;
  const ext = Math.round(CURB_EXTEND / path.spacing);
  const side = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    if (Math.abs(path.curvature[i]) < CURB_MIN_CURVATURE) continue;
    for (let d = -ext; d <= ext; d++) {
      const j = path.wrap(i + d);
      if (!side[j]) side[j] = Math.sign(path.curvature[i]);
    }
  }
  const start = side.indexOf(0);
  if (start < 0) return [];
  const runs = [];
  let run = null;
  for (let k = 1; k <= n; k++) {
    const i = path.wrap(start + k);
    if (run && side[i] === run.side) run.indices.push(i);
    else {
      if (run) runs.push(run);
      run = side[i] ? { side: side[i], indices: [i] } : null;
    }
  }
  return runs.filter((r) => r.indices.length * path.spacing >= CURB_MIN_LENGTH);
}

export function createCurbs(path) {
  const inner = path.halfWidth - CURB_OVERLAP;
  const outer = (i) =>
    Math.max(inner + 0.12, Math.min(inner + CURB_WIDTH, 0.92 / Math.max(1e-6, Math.abs(path.curvature[i]))));
  const opts = { uPerMetre: 1 / (2 * CURB_STRIPE) };
  const y = PAINT_Y + 0.004;
  const geoms = cornerRuns(path).map(({ side, indices }) =>
    side > 0
      ? stripGeometry(path, indices, inner, outer, y, opts)
      : stripGeometry(path, indices, (i) => -outer(i), -inner, y, opts),
  );
  const material = new THREE.MeshStandardMaterial({
    map: curbTexture(CURB_RED, CURB_WHITE),
    roughness: 0.5,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const mesh = new THREE.Mesh(mergeGeometries(geoms), material);
  mesh.receiveShadow = true;
  return mesh;
}
