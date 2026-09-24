// Light tyre marks in the main braking zones: a few karts' worth of faint rear-tyre streaks on the
// racing line, starting soft, darkening as the tyres load up, and ending at turn-in.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { stripGeometry } from '../track/stripGeometry.js';
import { brakingZones, spanIndices } from '../track/brakingZones.js';
import { BRAKE_MARKS as B } from '../config/track.js';
import { clamp, seededRandom } from '../core/math.js';

const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function streak(path, indices, centre, rnd, y) {
  const n = indices.length;
  const strength = 0.5 + 0.5 * rnd();
  const wobble = rnd() * 6;
  const alpha = (k) => {
    const t = k / Math.max(1, n - 1);
    const flicker = 0.75 + 0.25 * Math.sin(wobble + t * 23) * Math.sin(t * 9.7 + wobble * 2);
    return strength * flicker * smooth(0, 0.45, t) * (1 - smooth(0.88, 1, t));
  };
  const drift = (rnd() - 0.5) * 0.25; // marks slew a little as the kart squirms under braking
  const at = (k, i) => centre(i) + drift * (k / Math.max(1, n - 1));
  const idx = new Map(indices.map((i, k) => [i, k]));
  return stripGeometry(path, indices, (i) => at(idx.get(i), i) - B.width / 2, (i) => at(idx.get(i), i) + B.width / 2, y, { alpha });
}

export function createBrakeMarks(path, line, y) {
  const rnd = seededRandom(path.count);
  const geoms = [];
  for (const zone of brakingZones(path, B)) {
    const early = Math.round(((zone.end - zone.start + path.count) % path.count) * 0.4); // real karts brake earlier
    const all = spanIndices(path, path.wrap(zone.start - early), zone.end);
    if (all.length < 8) continue;
    for (let s = 0; s < B.streaks; s++) {
      const lat = (rnd() - 0.5) * 2 * B.spread;
      const from = Math.floor(rnd() * all.length * 0.3); // karts start braking at slightly different spots
      const to = all.length - Math.floor(rnd() * all.length * 0.12);
      const indices = all.slice(from, to);
      if (indices.length < 6) continue;
      for (const side of [-1, 1]) {
        const centre = (i) => line[i] + lat + side * (B.rearTrack / 2);
        geoms.push(streak(path, indices, centre, rnd, y));
      }
    }
  }
  const material = new THREE.MeshStandardMaterial({
    color: 0x070708,
    roughness: 0.7,
    opacity: B.opacity,
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    polygonOffset: true,
    polygonOffsetFactor: -1.5,
    polygonOffsetUnits: -1.5,
  });
  const mesh = new THREE.Mesh(geoms.length ? mergeGeometries(geoms) : new THREE.BufferGeometry(), material);
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  return mesh;
}
