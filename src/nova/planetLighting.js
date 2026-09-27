// NOVA daylight: the planet's sun (colour, angle) casting soft shadows that follow the kart, and a
// hemisphere fill from its sky and ground. The captured sky does the rest (image-based light).

import * as THREE from 'three';
import { shadowFollower } from '../world/Lighting.js';
import { SHADOW_MAP_SIZE, SHADOW_BIAS, SHADOW_NORMAL_BIAS } from '../config/render.js';

const HALF = 45; // m either side of the kart covered by the shadow map

export function createPlanetLighting(planet, b) {
  const group = new THREE.Group();
  const sky = new THREE.Color(planet.sky[1]).lerp(new THREE.Color(planet.sky[0]), 0.4);
  group.add(new THREE.HemisphereLight(sky, new THREE.Color(planet.ground[0]), planet.night ? 0.85 : 0.9));

  const [color, intensity, dir] = planet.sun;
  const offset = new THREE.Vector3(...dir).normalize().multiplyScalar(90);
  offset.y = Math.max(offset.y, 25); // a low sun still lights the track from above the barriers
  const sun = new THREE.DirectionalLight(color, intensity);
  sun.position.set(b.cx, 0, b.cz).add(offset);
  sun.target.position.set(b.cx, 0, b.cz);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  sun.shadow.bias = SHADOW_BIAS;
  sun.shadow.normalBias = SHADOW_NORMAL_BIAS;
  const cam = sun.shadow.camera;
  [cam.left, cam.right, cam.top, cam.bottom] = [-HALF, HALF, HALF, -HALF];
  cam.near = 5;
  cam.far = 200;
  cam.updateProjectionMatrix();
  group.add(sun, sun.target);
  return { group, follow: shadowFollower(sun, HALF, offset) };
}
