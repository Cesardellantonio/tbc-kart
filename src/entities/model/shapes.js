// Surface helpers for the kart model: grid surfaces from rows of points, closed solids between two
// grids (moulded panels, visor, seat shell), superellipse rings for lofts and caps to close them.
// Winding is fixed up automatically, so builders only describe points and never think about it.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { v3 } from './primitives.js';

function flip(g) {
  const idx = g.index.array;
  for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  g.computeVertexNormals();
}

// Indexed surface through rows[i][j]. wrap: each row is a closed loop. out(i, j): a direction the
// surface should face at that point (the whole surface is flipped to agree with it on balance).
export function gridSurface(rows, { wrap = false, out = null } = {}) {
  const n = rows[0].length;
  const pos = rows.flatMap((row) => row.flatMap((p) => [p.x, p.y, p.z]));
  const idx = [];
  for (let i = 0; i < rows.length - 1; i++)
    for (let j = 0; j < (wrap ? n : n - 1); j++) {
      const [a, b] = [i * n + j, i * n + ((j + 1) % n)];
      idx.push(a, b, a + n, b, b + n, a + n);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (!out) return g;
  const facing = (i, j) => out(i, j).dot(v3().fromBufferAttribute(g.attributes.normal, i * n + j));
  if (rows.reduce((s, row, i) => row.reduce((t, _, j) => t + facing(i, j), s), 0) < 0) flip(g);
  return g;
}

// Closed thin solid between an outer grid and an inner grid of the same shape: both faces plus the
// four rim strips, each with its own vertices so the edges stay crisp.
export function solid(outer, inner) {
  const [last, lastCol] = [outer.length - 1, outer[0].length - 1];
  const parts = [
    gridSurface(outer, { out: (i, j) => outer[i][j].clone().sub(inner[i][j]) }),
    gridSurface(inner, { out: (i, j) => inner[i][j].clone().sub(outer[i][j]) }),
  ];
  const col = (g, j) => g.map((row) => row[j]);
  const rims = [
    [outer[0], inner[0], outer[1]],
    [outer[last], inner[last], outer[last - 1]],
    [col(outer, 0), col(inner, 0), col(outer, 1)],
    [col(outer, lastCol), col(inner, lastCol), col(outer, lastCol - 1)],
  ];
  for (const [o, i, next] of rims) {
    parts.push(gridSurface([o, i], { out: (r, k) => o[k].clone().sub(next[k]) }));
  }
  return mergeGeometries(parts);
}

// Superellipse loop around `centre` in the plane of axes ax (half-width a) and ay (half-height b);
// power 2 is an ellipse, higher is boxier. b2: half-height on the negative-ay side (egg sections).
export function ring(centre, ax, ay, a, b, n, power = 2, b2 = b) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2;
    const [c, s] = [Math.cos(t), Math.sin(t)];
    const x = Math.sign(c) * Math.abs(c) ** (2 / power) * a;
    const y = Math.sign(s) * Math.abs(s) ** (2 / power) * (s < 0 ? b2 : b);
    pts.push(centre.clone().addScaledVector(ax, x).addScaledVector(ay, y));
  }
  return pts;
}

// Fan cap closing a loop (faces away from `inside`).
export function cap(loop, inside) {
  const c = loop.reduce((s, p) => s.add(p), v3()).divideScalar(loop.length);
  const g = new THREE.BufferGeometry().setFromPoints([...loop, c]);
  const n = loop.length;
  g.setIndex(loop.flatMap((_, k) => [k, (k + 1) % n, n]));
  g.computeVertexNormals();
  if (v3().fromBufferAttribute(g.attributes.normal, n).dot(c.clone().sub(inside)) < 0) flip(g);
  return g;
}
