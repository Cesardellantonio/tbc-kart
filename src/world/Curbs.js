// Red/white curbs on the inside of tight corners. Width shrinks at the apex so it never folds over.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { stripGeometry } from '../track/stripGeometry.js';
import { cornerRuns, curbInner, curbOuter } from '../track/curbRuns.js';
import { curbTexture } from './textures/markings.js';
import { PAINT_Y, CURB_STRIPE, CURB_RED, CURB_WHITE } from '../config/track.js';

export { cornerRuns }; // kept here too for existing importers

export function createCurbs(path) {
  const inner = curbInner(path);
  const outer = (i) => curbOuter(path, i);
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
