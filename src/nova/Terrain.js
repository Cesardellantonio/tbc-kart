// NOVA ground: one big height-field around the circuit. Flat where the karts race (and a little
// beyond the barriers), rolling hills further out, ridged mountains on the horizon; coloured from the
// planet's palette by height and patches, with a darker landing-pad apron along the track.

import * as THREE from 'three';
import { NOVA_WORLD } from '../config/planets.js';
import { BARRIER_GAP, BARRIER_THICKNESS } from '../config/track.js';
import { smoothstep } from '../core/math.js';
import { trackDistance } from './trackDistance.js';

// planet; path: TrackPath; b: circuit bounds; noise: nova/noise.js valueNoise; segments per side.
// Returns { mesh, heightAt(x, z), clearance(x, z) — m beyond the barriers (< 0 on track) }.
export function createTerrain(planet, path, b, noise, segments = NOVA_WORLD.segments) {
  const W = NOVA_WORLD;
  const margin = 70;
  const area = { minX: b.minX - margin, minZ: b.minZ - margin, width: b.width + 2 * margin, depth: b.depth + 2 * margin };
  const dist = trackDistance(path, area, W.cell);
  const edge = path.halfWidth + BARRIER_GAP + BARRIER_THICKNESS;
  const clearance = (x, z) => dist(x, z) - edge;
  const heightAt = (x, z) => {
    const c = clearance(x, z);
    if (c < W.flat) return -0.01;
    const m = smoothstep(W.flat, W.flat + W.rise, c);
    const hills = (noise.fbm(x, z, 70, 4) * 0.5 + 0.35) * W.hills * m;
    const range = noise.ridge(x + 500, z - 300, 160, 5) * planet.peaks * smoothstep(60, 260, c);
    return hills + range - 0.01;
  };

  const size = Math.max(b.width, b.depth) + 2 * W.reach;
  const geo = new THREE.PlaneGeometry(size, size, segments, segments).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const [flat, high, patch, apron] = [...planet.ground, planet.apron].map((c) => new THREE.Color(c));
  const col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + b.cx;
    const z = pos.getZ(i) + b.cz;
    const y = heightAt(x, z);
    pos.setXYZ(i, x, y, z);
    const t = smoothstep(0, planet.peaks * 0.7, y);
    col.copy(flat).lerp(high, t);
    col.lerp(patch, smoothstep(0.15, 0.55, noise.fbm(x, z, 24, 3)) * 0.6 * (1 - t));
    col.multiplyScalar(0.85 + 0.3 * noise(x * 0.35, z * 0.35)); // speckle
    col.lerp(apron, 1 - smoothstep(1.5, W.flat + 3, clearance(x, z)));
    col.toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }));
  mesh.receiveShadow = true;
  mesh.userData.terrain = true;
  return { mesh, heightAt, clearance };
}
