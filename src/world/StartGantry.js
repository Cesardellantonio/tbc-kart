// Start/finish gantry spanning the track, with five start lights driven by the race session.

import * as THREE from 'three';
import { startSignTexture } from './textures/signage.js';
import { BARRIER_GAP, GANTRY_HEIGHT } from '../config/track.js';

const RED = new THREE.Color(0xff1f2d);
const GREEN = new THREE.Color(0x2bff6a);
const OFF = new THREE.Color(0x000000);

export class StartGantry {
  constructor(path, index) {
    const H = GANTRY_HEIGHT;
    const span = path.halfWidth + BARRIER_GAP + 0.9;
    this.group = new THREE.Group();
    this.group.position.set(path.x[index], 0, path.z[index]);
    this.group.rotation.y = path.heading(index); // local -Z points down the track

    const steel = new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.45, metalness: 0.8 });
    const box = (w, h, d, x, y, z, mat = steel) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
      return m;
    };
    box(0.3, H + 0.4, 0.3, -span, (H + 0.4) / 2, 0);
    box(0.3, H + 0.4, 0.3, span, (H + 0.4) / 2, 0);
    box(span * 2 + 0.3, 0.45, 0.4, 0, H, 0);

    const signMat = new THREE.MeshStandardMaterial({ map: startSignTexture(), emissive: 0xffffff, roughness: 0.6 });
    signMat.emissiveMap = signMat.map;
    signMat.emissiveIntensity = 0.5;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(span * 1.6, (span * 1.6) / 6.4), signMat);
    sign.position.set(0, H + 0.75, 0.21);
    this.group.add(sign);

    box(2.4, 0.55, 0.25, 0, H - 0.55, 0.12); // light housing faces approaching karts (+Z)
    this.bulbs = [];
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, emissive: OFF, roughness: 0.3 });
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 20), mat);
      bulb.rotation.x = Math.PI / 2;
      bulb.position.set((i - 2) * 0.44, H - 0.55, 0.26);
      this.group.add(bulb);
      this.bulbs.push(mat);
    }
  }

  // count: red lights lit (0–5); mode: 'red' | 'go' | 'off'
  setLights(count, mode) {
    this.bulbs.forEach((mat, i) => {
      const on = mode === 'go' || (mode === 'red' && i < count);
      mat.emissive.copy(on ? (mode === 'go' ? GREEN : RED) : OFF);
      mat.emissiveIntensity = on ? 3.6 : 0;
    });
  }
}
