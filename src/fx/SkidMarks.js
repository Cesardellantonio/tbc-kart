// Tyre marks: a ring buffer of dark translucent quads laid behind sliding or braking wheels.

import * as THREE from 'three';

const MIN_STEP = 0.2; // metres between mark segments
const Y = 0.028;

export class SkidMarks {
  constructor(maxQuads = 2400, width = 0.2) {
    this.max = maxQuads;
    this.halfWidth = width / 2;
    this.pos = new Float32Array(maxQuads * 12);
    this.col = new Float32Array(maxQuads * 16);
    const index = new Uint32Array(maxQuads * 6);
    for (let q = 0; q < maxQuads; q++) index.set([q * 4, q * 4 + 1, q * 4 + 2, q * 4 + 1, q * 4 + 3, q * 4 + 2], q * 6);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geom.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    geom.setIndex(new THREE.BufferAttribute(index, 1));
    this.mesh = new THREE.Mesh(
      geom,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.cursor = 0;
    this.last = new Map();
  }

  // strength 0..1 darkens the mark; 0 lifts the "pen" for that wheel.
  add(wheel, x, z, strength) {
    const last = this.last.get(wheel);
    if (strength <= 0) return void this.last.delete(wheel);
    if (!last) return void this.last.set(wheel, { x, z, s: strength });
    const dx = x - last.x;
    const dz = z - last.z;
    const len = Math.hypot(dx, dz);
    if (len < MIN_STEP) return;
    if (len > 2.5) return void this.last.set(wheel, { x, z, s: strength }); // teleport / reset
    const nx = (-dz / len) * this.halfWidth;
    const nz = (dx / len) * this.halfWidth;
    const q = this.cursor;
    this.cursor = (q + 1) % this.max;
    this.pos.set(
      [last.x + nx, Y, last.z + nz, last.x - nx, Y, last.z - nz, x + nx, Y, z + nz, x - nx, Y, z - nz],
      q * 12,
    );
    const a0 = 0.5 * last.s;
    const a1 = 0.5 * strength;
    this.col.set([0.02, 0.02, 0.02, a0, 0.02, 0.02, 0.02, a0, 0.02, 0.02, 0.02, a1, 0.02, 0.02, 0.02, a1], q * 16);
    const { position, color } = this.mesh.geometry.attributes;
    position.addUpdateRange(q * 12, 12);
    color.addUpdateRange(q * 16, 16);
    position.needsUpdate = color.needsUpdate = true;
    this.last.set(wheel, { x, z, s: strength });
  }

  clear() {
    this.pos.fill(0);
    this.col.fill(0);
    this.last.clear();
    const { position, color } = this.mesh.geometry.attributes;
    position.needsUpdate = color.needsUpdate = true;
  }
}
