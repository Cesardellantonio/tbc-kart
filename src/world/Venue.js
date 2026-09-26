// The hall shell: ribbed-metal walls with an accent stripe, dark ceiling, neon strips along the walls.

import * as THREE from 'three';
import { wallTexture, wallDetail } from './textures/surfaces.js';
import { QUALITY } from '../config/graphics.js';
import { WALL_HEIGHT, WALL_PANEL_WIDTH, NEON } from '../config/venue.js';

// [length, x, z, rotationY] for each wall, facing into the hall.
export function wallsOf(b) {
  return [
    [b.width, b.cx, b.minZ, 0],
    [b.width, b.cx, b.maxZ, Math.PI],
    [b.depth, b.minX, b.cz, Math.PI / 2],
    [b.depth, b.maxX, b.cz, -Math.PI / 2],
  ];
}

export function createVenue(b, anisotropy) {
  const group = new THREE.Group();
  const base = wallTexture();
  base.anisotropy = anisotropy;
  wallsOf(b).forEach(([len, x, z, rot], i) => {
    const map = base.clone();
    map.repeat.set(len / WALL_PANEL_WIDTH, 1);
    map.needsUpdate = true;
    const normalMap = QUALITY.detail ? wallDetail().normalMap : null; // ribbed cladding in relief
    normalMap?.repeat.copy(map.repeat);
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(len, WALL_HEIGHT),
      new THREE.MeshStandardMaterial({ map, normalMap, roughness: 0.62, metalness: 0.35 }),
    );
    wall.position.set(x, WALL_HEIGHT / 2, z);
    wall.rotation.y = rot;
    wall.receiveShadow = true;
    group.add(wall);

    const colour = new THREE.Color(NEON.colors[i % NEON.colors.length]);
    const neon = new THREE.Mesh(
      new THREE.BoxGeometry(len - 2, NEON.thickness, NEON.thickness),
      new THREE.MeshStandardMaterial({ color: 0x000000, emissive: colour, emissiveIntensity: NEON.intensity }),
    );
    neon.position.set(0, NEON.y - WALL_HEIGHT / 2, 0.12);
    wall.add(neon);
  });

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(b.width, b.depth),
    new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.95 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(b.cx, WALL_HEIGHT, b.cz);
  group.add(ceiling);
  return group;
}
