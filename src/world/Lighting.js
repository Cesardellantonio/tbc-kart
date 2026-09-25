// Hall lighting: hemisphere fill + a high key light casting soft shadows. The shadow box covers the
// whole hall when it is small enough; in a bigger hall it is SHADOW_FIT.maxHalf m either side of the
// kart and follows it (follow()), stepped in whole shadow-map texels so the edges don't shimmer.

import * as THREE from 'three';
import { HEMI, SUN, FILLS, SHADOW_MAP_SIZE, SHADOW_BIAS, SHADOW_NORMAL_BIAS, SHADOW_FIT } from '../config/render.js';

// Keeps the sun's shadow box centred on a point, snapped to the shadow map's texel grid.
function shadowFollower(sun, half) {
  const offset = new THREE.Vector3(...SUN.offset);
  const back = offset.clone().normalize(); // light-space axes (as the shadow camera's lookAt builds them)
  const right = new THREE.Vector3(0, 1, 0).cross(back).normalize();
  const up = back.clone().cross(right);
  const texel = (2 * half) / SHADOW_MAP_SIZE;
  const focus = new THREE.Vector3();
  const snap = (v) => Math.round(v / texel) * texel;
  return (x, z) => {
    focus.set(x, 0, z);
    const [a, b, c] = [snap(focus.dot(right)), snap(focus.dot(up)), focus.dot(back)];
    focus.copy(right).multiplyScalar(a).addScaledVector(up, b).addScaledVector(back, c);
    sun.target.position.copy(focus);
    sun.position.copy(focus).add(offset);
  };
}

// Returns { group, follow(x, z) } — call follow each frame with the kart the camera is on.
export function createLighting(b) {
  const group = new THREE.Group();
  group.add(new THREE.HemisphereLight(HEMI.sky, HEMI.ground, HEMI.intensity));
  for (const fill of FILLS) {
    const light = new THREE.DirectionalLight(fill.color, fill.intensity);
    light.position.set(...fill.direction).normalize().multiplyScalar(50).add(new THREE.Vector3(b.cx, 0, b.cz));
    light.target.position.set(b.cx, 0, b.cz);
    group.add(light, light.target);
  }

  const sun = new THREE.DirectionalLight(SUN.color, SUN.intensity);
  sun.position.set(b.cx + SUN.offset[0], SUN.offset[1], b.cz + SUN.offset[2]);
  sun.target.position.set(b.cx, 0, b.cz);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  sun.shadow.bias = SHADOW_BIAS;
  sun.shadow.normalBias = SHADOW_NORMAL_BIAS;
  const hall = Math.max(b.width, b.depth) / 2 + 2;
  const half = Math.min(hall, SHADOW_FIT.maxHalf);
  const cam = sun.shadow.camera;
  [cam.left, cam.right, cam.top, cam.bottom] = [-half, half, half, -half];
  cam.near = 10;
  cam.far = SUN.offset[1] + 40;
  cam.updateProjectionMatrix();
  group.add(sun, sun.target);
  return { group, follow: half < hall ? shadowFollower(sun, half) : () => {} };
}
