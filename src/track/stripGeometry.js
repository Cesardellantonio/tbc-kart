// Flat triangle strip between two offsets from the centreline, with along-track UVs.
// Used for asphalt, painted lines and curbs.

import * as THREE from 'three';

// indices: sample indices to walk (in order); inner/outer: offset (m) or (i) => offset.
// alpha: optional (k, i) => 0..1 per step k → an RGBA vertex colour (white, that alpha) for fades.
export function stripGeometry(path, indices, inner, outer, y, { closed = false, uPerMetre = 1, alpha = null } = {}) {
  const n = indices.length;
  const pos = new Float32Array(n * 6);
  const uv = new Float32Array(n * 4);
  const col = alpha ? new Float32Array(n * 8).fill(1) : null;
  const a = {};
  const b = {};
  let u = 0;
  for (let k = 0; k < n; k++) {
    const i = indices[k];
    if (k > 0) u += path.spacing * uPerMetre;
    path.offset(i, typeof inner === 'function' ? inner(i) : inner, a);
    path.offset(i, typeof outer === 'function' ? outer(i) : outer, b);
    pos.set([a.x, y, a.z, b.x, y, b.z], k * 6);
    uv.set([u, 0, u, 1], k * 4);
    if (col) col[k * 8 + 3] = col[k * 8 + 7] = alpha(k, i);
  }
  const index = [];
  const quads = closed ? n : n - 1;
  for (let k = 0; k < quads; k++) {
    const p = k * 2;
    const q = ((k + 1) % n) * 2;
    index.push(p, p + 1, q, p + 1, q + 1, q); // counter-clockwise from above → faces +Y
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) geom.setAttribute('color', new THREE.BufferAttribute(col, 4));
  geom.setIndex(index);
  geom.computeVertexNormals();
  return geom;
}

export const allIndices = (path) => Array.from({ length: path.count }, (_, i) => i);
