// Turns kart telemetry into tyre marks, tyre smoke and barrier sparks.

import * as THREE from 'three';
import { Particles } from './Particles.js';
import { SkidMarks } from './SkidMarks.js';
import { forwardFromYaw, rightFromYaw, clamp } from '../core/math.js';
import { REAR_TRACK, WHEELBASE } from '../config/kart.js';

export class KartFx {
  constructor(scene) {
    this.skids = new SkidMarks();
    this.smoke = new Particles({ max: 260, color: new THREE.Color(0xc9ccd2), gravity: 0.4, drag: 1.6 });
    this.sparks = new Particles({
      max: 160,
      color: new THREE.Color(1, 0.55, 0.15).multiplyScalar(6),
      additive: true,
      gravity: -14,
      drag: 0.6,
    });
    scene.add(this.skids.mesh, this.smoke.points, this.sparks.points);
    this._smokeDebt = 0;
  }

  update(kart, dt, camera, viewportHeight) {
    const { state: s, telemetry: t } = kart;
    const f = forwardFromYaw(s.yaw);
    const r = rightFromYaw(s.yaw);
    const moving = t.speed > 2;
    const slide = moving ? clamp((t.slip - 1.8) / 3.5, 0, 1) : 0;
    const hardBrake = t.brake > 0 && t.forwardSpeed > 8 ? 0.3 : 0; // light marks, no smoke

    this._smokeDebt += slide > 0.12 ? slide * 26 * dt : 0; // puffs per wheel
    const puffs = Math.floor(this._smokeDebt);
    this._smokeDebt -= puffs;
    for (const side of [-1, 1]) {
      const wx = s.x + r.x * side * (REAR_TRACK / 2) - f.x * (WHEELBASE / 2);
      const wz = s.z + r.z * side * (REAR_TRACK / 2) - f.z * (WHEELBASE / 2);
      this.skids.add(side, wx, wz, Math.max(slide, hardBrake));
      for (let k = 0; k < puffs; k++) {
        const j = () => (Math.random() - 0.5) * 0.8;
        this.smoke.emit(wx, 0.12, wz, s.vx * 0.2 + j(), 0.45 + Math.random() * 0.35, s.vz * 0.2 + j(),
          0.8 + Math.random() * 0.5, 0.35, 1.5 + Math.random() * 0.6, 0.06 + 0.18 * slide);
      }
    }

    if (t.impact > 2.5) {
      const c = kart.contact;
      const n = Math.min(40, Math.round(t.impact * 4));
      for (let k = 0; k < n; k++) {
        const spread = () => (Math.random() - 0.5) * 5;
        this.sparks.emit(c.x, 0.35, c.z, c.nx * 3 + s.vx * 0.3 + spread(), 2 + Math.random() * 3,
          c.nz * 3 + s.vz * 0.3 + spread(), 0.3 + Math.random() * 0.35, 0.09, 0.03, 1);
      }
    }
    this.smoke.setScale(viewportHeight, camera.fov);
    this.sparks.setScale(viewportHeight, camera.fov);
    this.smoke.update(dt);
    this.sparks.update(dt);
  }

  reset() {
    this.skids.clear();
  }
}
