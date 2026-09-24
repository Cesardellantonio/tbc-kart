// Hall lighting: hemisphere fill + a high key light casting soft shadows over the whole track.

import * as THREE from 'three';
import { HEMI, SUN, FILLS, SHADOW_MAP_SIZE, SHADOW_BIAS, SHADOW_NORMAL_BIAS } from '../config/render.js';

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
  const half = Math.max(b.width, b.depth) / 2 + 2;
  const cam = sun.shadow.camera;
  cam.left = -half;
  cam.right = half;
  cam.top = half;
  cam.bottom = -half;
  cam.near = 10;
  cam.far = SUN.offset[1] + 40;
  cam.updateProjectionMatrix();
  group.add(sun, sun.target);
  return group;
}
