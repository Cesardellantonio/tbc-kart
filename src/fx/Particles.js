// Pooled point-sprite particles (tyre smoke, sparks) with per-particle size and alpha.

import * as THREE from 'three';
import { particleVertex, particleFragment } from './particleShader.js';

export class Particles {
  // color may exceed 1 (HDR) so sparks feed the bloom pass
  constructor({ max, color, additive = false, gravity = 0, drag = 0 }) {
    this.max = max;
    this.gravity = gravity;
    this.drag = drag;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.age = new Float32Array(max).fill(1);
    this.life = new Float32Array(max).fill(1);
    this.size = new Float32Array(max * 2); // start, end
    this.alpha0 = new Float32Array(max);
    this.aSize = new Float32Array(max);
    this.aAlpha = new Float32Array(max);
    this.cursor = 0;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(this.aSize, 1));
    geom.setAttribute('aAlpha', new THREE.BufferAttribute(this.aAlpha, 1));
    this.material = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: color }, uScale: { value: 600 } },
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geom, this.material);
    this.points.frustumCulled = false;
  }

  emit(x, y, z, vx, vy, vz, life, size0, size1, alpha) {
    const i = this.cursor;
    this.cursor = (i + 1) % this.max;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.size.set([size0, size1], i * 2);
    this.age[i] = 0;
    this.life[i] = life;
    this.alpha0[i] = alpha;
  }

  // Pixels per metre at distance 1 — follows the viewport height and FOV.
  setScale(viewportHeightPx, fovDeg) {
    this.material.uniforms.uScale.value = viewportHeightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }

  update(dt) {
    const keep = Math.exp(-this.drag * dt);
    for (let i = 0; i < this.max; i++) {
      if (this.age[i] >= this.life[i]) {
        this.aAlpha[i] = 0;
        continue;
      }
      this.age[i] += dt;
      const t = Math.min(1, this.age[i] / this.life[i]);
      const o = i * 3;
      this.vel[o + 1] += this.gravity * dt;
      for (let k = 0; k < 3; k++) {
        this.vel[o + k] *= keep;
        this.pos[o + k] += this.vel[o + k] * dt;
      }
      this.aSize[i] = this.size[i * 2] + (this.size[i * 2 + 1] - this.size[i * 2]) * t;
      this.aAlpha[i] = this.alpha0[i] * (1 - t) * Math.min(1, t * 8); // quick fade-in, slow fade-out
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = a.aSize.needsUpdate = a.aAlpha.needsUpdate = true;
  }
}
