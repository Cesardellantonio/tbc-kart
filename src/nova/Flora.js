// NOVA life and rock, scattered with the planet's seed: bulb-trees (a bent stalk under a glowing
// cap, with bulbs hanging from its rim), crystal clusters, boulders, floating rock islands, and glowing
// bulbs lining the circuit. All instanced: one draw per kind whatever the count.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { NOVA_WORLD } from '../config/planets.js';

// A stalk bending sideways as it rises (unit height, base at 0).
function stalkGeometry() {
  const g = new THREE.CylinderGeometry(0.16, 0.34, 1, 8, 6, true).translate(0, 0.5, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setX(i, p.getX(i) + Math.sin(y * 2.2) * 0.22 * y);
  }
  g.computeVertexNormals();
  return g;
}

// Cap: a squashed dome with a scalloped rim (unit size, centred on the stalk's tip).
function capGeometry() {
  const g = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const a = Math.atan2(z, x);
    const wave = 1 + 0.08 * Math.sin(a * 7) * (1 - y);
    p.setXYZ(i, x * wave * 1.5, y * 0.75 - 0.25, z * wave * 1.5);
  }
  g.computeVertexNormals();
  return g;
}
const TIP = Math.sin(2.2) * 0.22; // the stalk's sideways bend at its top (unit stalk, before scaling)

function rockGeometry(noise, seed) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 1 + 0.28 * (noise(v.x * 1.7 + seed, v.z * 1.7 + v.y * 1.3) - 0.5) * 2;
    v.multiplyScalar(k);
    v.y *= 0.7;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}

function crystalGeometry() {
  const shard = (h, tx, tz, rot) =>
    new THREE.OctahedronGeometry(1, 0).scale(0.28, h, 0.28).translate(0, h * 0.7, 0).rotateZ(tx).rotateX(tz).rotateY(rot);
  return mergeGeometries([shard(1.6, 0, 0, 0), shard(1.1, 0.35, 0.1, 1.2), shard(0.9, -0.3, 0.25, 2.4), shard(0.7, 0.1, -0.4, 3.9)]);
}

function instanced(geometry, material, count, cast = true) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, count));
  mesh.count = 0;
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}

// planet; terrain: nova/Terrain.js; b: circuit bounds; random: seeded 0..1; noise; budget: tier share;
// night: glowing life. Returns a THREE.Group.
export function createFlora(planet, terrain, b, random, noise, budget) {
  const W = NOVA_WORLD;
  const d = planet.density;
  const group = new THREE.Group();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const at = new THREE.Vector3();
  const tint = new THREE.Color();
  const night = planet.night ? 1 : 0;
  const reach = Math.max(b.width, b.depth) / 2 + W.reach * 0.75;
  const spot = (minClear, maxClear, far = reach) => {
    for (let k = 0; k < 30; k++) {
      const a = random() * Math.PI * 2;
      const r = Math.sqrt(random()) * far;
      const [x, z] = [b.cx + Math.cos(a) * r, b.cz + Math.sin(a) * r];
      const c = terrain.clearance(x, z);
      if (c >= minClear && c <= maxClear) return [x, z, c];
    }
    return null;
  };
  const place = (mesh, x, y, z, sx, sy, sz, yaw, tiltX = 0, tiltZ = 0, color = null) => {
    q.setFromEuler(new THREE.Euler(tiltX, yaw, tiltZ));
    m4.compose(at.set(x, y, z), q, s.set(sx, sy, sz));
    mesh.setMatrixAt(mesh.count, m4);
    if (color) mesh.setColorAt(mesh.count, color);
    mesh.count++;
  };

  // Bulb-trees: clumped by a noise field, so there are groves and clearings.
  const trees = Math.round(W.trees * d.trees * budget);
  const stalkMat = new THREE.MeshStandardMaterial({ color: planet.flora[0], roughness: 0.7 });
  const capMat = new THREE.MeshStandardMaterial({
    color: planet.flora[1], roughness: 0.45, emissive: planet.flora[1], emissiveIntensity: 0.12 + night * 0.9,
  });
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: planet.flora[2], emissiveIntensity: 1.1 + night * 1.6 });
  const stalks = instanced(stalkGeometry(), stalkMat, trees);
  const caps = instanced(capGeometry(), capMat, trees);
  const bulbs = instanced(new THREE.SphereGeometry(1, 8, 6), bulbMat, trees * 3 + Math.round(W.glowBulbs * budget), false);
  for (let n = 0, tries = 0; n < trees && tries < trees * 6; tries++) {
    const p = spot(W.flat + 2, 400);
    if (!p) continue;
    const [x, z] = p;
    if (noise.fbm(x, z, 55, 3) < -0.05) continue; // clearings
    const h = 3 + random() * 7 * (0.6 + 0.4 * random());
    const w = h * (0.35 + random() * 0.25);
    const yaw = random() * Math.PI * 2;
    const y = terrain.heightAt(x, z) - 0.2;
    tint.set(planet.flora[1]).offsetHSL((random() - 0.5) * 0.06, 0, (random() - 0.5) * 0.12);
    place(stalks, x, y, z, w * 0.5, h, w * 0.5, yaw);
    const tipX = x + Math.cos(yaw) * TIP * w * 0.5;
    const tipZ = z - Math.sin(yaw) * TIP * w * 0.5;
    place(caps, tipX, y + h, tipZ, w, w * 0.8, w, yaw, 0, 0, tint);
    for (let k = 0; k < 3; k++) {
      const a = yaw + (k / 3) * Math.PI * 2 + random();
      const r = w * 1.3;
      place(bulbs, tipX + Math.cos(a) * r, y + h - 0.5 * w, tipZ + Math.sin(a) * r, 0.1 * w, 0.15 * w, 0.1 * w, 0);
    }
    n++;
  }
  // Glowing bulbs lining the circuit, just beyond the barriers
  const lining = Math.round(W.glowBulbs * budget);
  for (let n = 0, tries = 0; n < lining && tries < lining * 8; tries++) {
    const p = spot(0.6, 9, Math.max(b.width, b.depth) / 2 + 20);
    if (!p) continue;
    const [x, z] = p;
    const r = 0.03 + random() * 0.06;
    place(bulbs, x, r * 0.5, z, r, r * 1.4, r, 0);
    n++;
  }
  if (bulbs.count) bulbs.instanceMatrix.needsUpdate = true;
  group.add(stalks, caps, bulbs);

  // Crystal clusters
  const crystals = Math.round(W.crystals * d.crystals * budget);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: planet.crystal, roughness: 0.12, metalness: 0.15, emissive: planet.crystal, emissiveIntensity: 0.9 + night * 1.6,
    flatShading: true,
  });
  const shards = instanced(crystalGeometry(), crystalMat, crystals);
  for (let n = 0, tries = 0; n < crystals && tries < crystals * 6; tries++) {
    const p = spot(W.flat, 300);
    if (!p) continue;
    const [x, z, c] = p;
    const k = (0.6 + random() * 1.6) * (c > 60 ? 2.2 : 1);
    place(shards, x, terrain.heightAt(x, z) - 0.2, z, k, k, k, random() * 6.28, (random() - 0.5) * 0.4, (random() - 0.5) * 0.4);
    n++;
  }
  group.add(shards);

  // Boulders: small near the track, big further out
  const rocks = Math.round(W.rocks * d.rocks * budget);
  const rockMat = new THREE.MeshStandardMaterial({ color: planet.rock, roughness: 0.85, flatShading: true });
  const boulders = instanced(rockGeometry(noise, 3), rockMat, rocks);
  for (let n = 0, tries = 0; n < rocks && tries < rocks * 6; tries++) {
    const p = spot(W.flat - 2, 500);
    if (!p) continue;
    const [x, z, c] = p;
    const k = (0.4 + random() * 1.4) * (1 + Math.min(4, c / 40));
    tint.set(planet.rock).offsetHSL(0, 0, (random() - 0.5) * 0.1);
    place(boulders, x, terrain.heightAt(x, z) - k * 0.25, z, k * (0.8 + random() * 0.6), k, k * (0.8 + random() * 0.6), random() * 6.28, 0, 0, tint);
    n++;
  }
  group.add(boulders);

  // Floating rock islands, high above the far land
  const floaters = Math.round(W.floaters * d.floaters * Math.min(1, budget * 1.2));
  const islands = instanced(rockGeometry(noise, 11), rockMat, floaters, false);
  for (let n = 0; n < floaters; n++) {
    const a = random() * Math.PI * 2;
    const r = 70 + random() * 230;
    const [x, z] = [b.cx + Math.cos(a) * (r + b.width / 2), b.cz + Math.sin(a) * (r + b.depth / 2)];
    const k = 4 + random() * 14;
    tint.set(planet.rock).offsetHSL(0, 0, (random() - 0.5) * 0.1);
    place(islands, x, 25 + random() * 70 + terrain.heightAt(x, z) * 0.5, z, k * 1.4, k * 0.9, k * 1.2, random() * 6.28, 0, 0, tint);
  }
  group.add(islands);
  for (const m of group.children) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
  return group;
}
