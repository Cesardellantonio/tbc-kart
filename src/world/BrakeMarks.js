// Light tyre marks where the computer drivers brake hard (track/brakingZones): a few karts' worth of
// faint rear-tyre streaks on the racing line, darker where the brake pedal is pressed harder.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { stripGeometry } from '../track/stripGeometry.js';
import { brakeProfile, brakingZones, spanIndices } from '../track/brakingZones.js';
import { BRAKE_MARKS as B } from '../config/track.js';
import { clamp, seededRandom } from '../core/math.js';

const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Brake pedal along a zone, averaged over about a metre either side (the pedal hunts a little).
function pressure(path, brake, indices) {
  const r = Math.round(1 / path.spacing);
  return indices.map((i) => {
    let sum = 0;
    for (let d = -r; d <= r; d++) sum += brake[path.wrap(i + d)];
    return sum / (2 * r + 1);
  });
}

function streak(path, indices, load, centre, rnd, y) {
  const n = indices.length;
  const strength = 0.5 + 0.5 * rnd();
  const wobble = rnd() * 6;
  const alpha = (k) => {
    const t = k / Math.max(1, n - 1);
    const flicker = 0.75 + 0.25 * Math.sin(wobble + t * 23) * Math.sin(t * 9.7 + wobble * 2);
    const bite = clamp(0.2 + 1.3 * load[k], 0, 1); // harder pedal → heavier mark
    return strength * flicker * bite * smooth(0, 0.1, t) * (1 - smooth(0.85, 1, t));
  };
  const drift = (rnd() - 0.5) * 0.25; // marks slew a little as the kart squirms under braking
  const at = (k, i) => centre(i) + drift * (k / Math.max(1, n - 1));
  const idx = new Map(indices.map((i, k) => [i, k]));
  return stripGeometry(path, indices, (i) => at(idx.get(i), i) - B.width / 2, (i) => at(idx.get(i), i) + B.width / 2, y, { alpha });
}

// Sample spans the marks cover: each braking zone, give or take where different karts hit the pedal.
export function markSpans(path, profile = brakeProfile(path)) {
  return brakingZones(path, B, profile).map((z) => spanIndices(path, z.start, z.end));
}

export function createBrakeMarks(path, line, y) {
  const rnd = seededRandom(path.count);
  const profile = brakeProfile(path);
  const geoms = [];
  for (const all of markSpans(path, profile)) {
    if (all.length < 8) continue;
    const load = pressure(path, profile.brake, all);
    for (let s = 0; s < B.streaks; s++) {
      const lat = (rnd() - 0.5) * 2 * B.spread;
      const from = Math.floor(rnd() * all.length * 0.15); // karts start braking at slightly different spots
      const to = all.length - Math.floor(rnd() * all.length * 0.15);
      if (to - from < 6) continue;
      for (const side of [-1, 1]) {
        const centre = (i) => line[i] + lat + side * (B.rearTrack / 2);
        geoms.push(streak(path, all.slice(from, to), load.slice(from, to), centre, rnd, y));
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
