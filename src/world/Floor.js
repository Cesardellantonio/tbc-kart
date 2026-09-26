// Polished concrete hall floor, hazard-striped walkway along the walls, painted infield logo.

import * as THREE from 'three';
import { concreteTexture, concreteDetail } from './textures/surfaces.js';
import { QUALITY } from '../config/graphics.js';
import { hazardTexture } from './textures/markings.js';
import { floorLogoTexture } from './textures/signage.js';
import { FLOOR_TILE } from '../config/venue.js';

const decal = (map) =>
  new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    roughness: 0.6,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

function flat(mesh, x, z, y = 0) {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  return mesh;
}

// Detail maps tile exactly like their colour map.
const matched = (maps, like) => {
  for (const t of Object.values(maps)) [t.repeat, t.anisotropy] = [like.repeat.clone(), like.anisotropy];
  return maps;
};

export function createFloor(b, anisotropy) {
  const group = new THREE.Group();
  const map = concreteTexture();
  map.repeat.set(b.width / FLOOR_TILE, b.depth / FLOOR_TILE);
  map.anisotropy = anisotropy;
  const detail = QUALITY.detail ? matched(concreteDetail(), map) : {};
  const material = new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0.02, ...detail });
  if (!QUALITY.detail) material.roughness = 0.5;
  if (detail.normalMap) material.normalScale.set(0.35, 0.35); // polished: the pattern, barely any relief
  group.add(flat(new THREE.Mesh(new THREE.PlaneGeometry(b.width, b.depth), material), b.cx, b.cz));

  // Walkway stripe 1.5 m in from every wall
  const hazard = hazardTexture();
  const strip = 0.35;
  const inset = 1.5;
  const sides = [
    [b.width - 2 * inset, b.cx, b.minZ + inset, 0],
    [b.width - 2 * inset, b.cx, b.maxZ - inset, 0],
    [b.depth - 2 * inset, b.minX + inset, b.cz, Math.PI / 2],
    [b.depth - 2 * inset, b.maxX - inset, b.cz, Math.PI / 2],
  ];
  for (const [len, x, z, rot] of sides) {
    const map2 = hazard.clone();
    map2.repeat.set(len / 1.4, 1);
    map2.needsUpdate = true;
    const m = flat(new THREE.Mesh(new THREE.PlaneGeometry(len, strip), decal(map2)), x, z, 0.004);
    m.rotation.z = rot;
    group.add(m);
  }
  return group;
}

// Giant "TBC KART" paint in the infield, readable from the start/finish straight.
export function createFloorLogo(x, z, width) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), decal(floorLogoTexture()));
  mesh.material.opacity = 0.8;
  return flat(mesh, x, z, 0.006);
}
