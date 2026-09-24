// Roof rig: steel trusses, rows of glowing LED panels, and the soft light pools they cast on the floor.

import * as THREE from 'three';
import { blobTexture } from './textures/markings.js';
import { TRUSS_SPACING, TRUSS_Y, LIGHT_PANEL } from '../config/venue.js';

function instanced(geometry, material, transforms) {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const m = new THREE.Matrix4();
  transforms.forEach(([x, y, z, rotY = 0], i) => {
    m.makeRotationY(rotY).setPosition(x, y, z);
    mesh.setMatrixAt(i, m);
  });
  return mesh;
}

// Grid of positions spaced `step` apart, centred inside [min, max].
function grid(min, max, step, inset) {
  const span = max - min - 2 * inset;
  const count = Math.max(1, Math.floor(span / step) + 1);
  const start = min + inset + (span - (count - 1) * step) / 2;
  return Array.from({ length: count }, (_, i) => start + i * step);
}

export function createRig(b) {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.5, metalness: 0.7 });
  const xs = grid(b.minX, b.maxX, TRUSS_SPACING, 4);
  group.add(instanced(new THREE.BoxGeometry(0.35, 0.8, b.depth), steel, xs.map((x) => [x, TRUSS_Y, b.cz])));
  const zs = grid(b.minZ, b.maxZ, LIGHT_PANEL.spacingZ, 5);
  group.add(instanced(new THREE.BoxGeometry(b.width, 0.25, 0.25), steel, zs.map((z) => [b.cx, TRUSS_Y + 0.3, z])));

  // LED panels hang between trusses in a regular grid
  const lx = grid(b.minX, b.maxX, LIGHT_PANEL.spacingX, 6).map((x) => x + TRUSS_SPACING / 2);
  const spots = [];
  for (const x of lx) for (const z of zs) if (x < b.maxX - 3) spots.push([x, LIGHT_PANEL.y, z]);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: new THREE.Color(LIGHT_PANEL.color),
    emissiveIntensity: LIGHT_PANEL.intensity,
  });
  const panel = new THREE.BoxGeometry(LIGHT_PANEL.width, 0.08, LIGHT_PANEL.depth);
  group.add(instanced(panel, panelMat, spots));
  const housing = new THREE.BoxGeometry(LIGHT_PANEL.width + 0.2, 0.14, LIGHT_PANEL.depth + 0.2);
  group.add(instanced(housing, steel, spots.map(([x, y, z]) => [x, y + 0.1, z])));

  // Warm light pools on the floor under each panel (additive decals)
  const poolMat = new THREE.MeshBasicMaterial({
    map: blobTexture('rgba(255,255,255,1)'),
    color: new THREE.Color(0xfff1d6).multiplyScalar(0.07),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pool = new THREE.PlaneGeometry(14, 11).rotateX(-Math.PI / 2);
  group.add(instanced(pool, poolMat, spots.map(([x, , z]) => [x, 0.03, z])));
  return { group, lights: spots };
}
