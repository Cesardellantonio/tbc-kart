// Rubbered-in racing line: a soft, streaky dark band following the AI line (race/racingLine.js),
// darker where the line is loaded hardest, plus light tyre marks in the main braking zones.

import * as THREE from 'three';
import { stripGeometry, allIndices } from '../track/stripGeometry.js';
import { rubberTexture } from './textures/rubber.js';
import { createBrakeMarks } from './BrakeMarks.js';
import { SURFACE_Y, PAINT_Y, EDGE_LINE_INSET, RUBBER_LINE as R } from '../config/track.js';
import { clamp } from '../core/math.js';

// Rubber load along the lap: how hard the line turns, averaged over a few metres.
function loadAlong(path, metres = 5) {
  const n = path.count;
  const half = Math.max(1, Math.round(metres / path.spacing));
  const out = new Float32Array(n);
  let sum = 0;
  for (let k = -half; k <= half; k++) sum += Math.abs(path.curvature[path.wrap(k)]);
  for (let i = 0; i < n; i++) {
    out[i] = clamp((sum / (2 * half + 1)) * 7, 0, 1);
    sum += Math.abs(path.curvature[path.wrap(i + half + 1)]) - Math.abs(path.curvature[path.wrap(i - half)]);
  }
  return out;
}

// line: lateral offset per sample (m, + = right), e.g. racingLine(path, AI).
export function createRubberLine(path, line) {
  const group = new THREE.Group();
  const edge = path.halfWidth - EDGE_LINE_INSET * 0.5; // never past the asphalt
  const lo = (i) => clamp(line[i] - R.width / 2, -edge, edge);
  const hi = (i) => clamp(line[i] + R.width / 2, -edge, edge);
  const load = loadAlong(path);
  const alpha = (k, i) => 1 - R.cornerBoost + R.cornerBoost * load[i];
  const y = (SURFACE_Y + PAINT_Y) / 2;
  const geom = stripGeometry(path, allIndices(path), lo, hi, y, { closed: true, uPerMetre: 1 / R.tile, alpha });
  const material = new THREE.MeshStandardMaterial({
    color: R.color,
    roughness: R.roughness,
    alphaMap: rubberTexture(),
    opacity: R.opacity,
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const band = new THREE.Mesh(geom, material);
  band.receiveShadow = true;
  band.renderOrder = 1;
  group.add(band, createBrakeMarks(path, line, y + 0.001));
  return group;
}
