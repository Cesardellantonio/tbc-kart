// Turns kart telemetry into tyre marks, tyre smoke and barrier sparks — or, in NOVA, a hover kart's
// scattered field (ion motes where the classic kart would smoke; no tyre marks) and thruster trails.

import * as THREE from 'three';
import { Particles } from './Particles.js';
import { SkidMarks } from './SkidMarks.js';
import { forwardFromYaw, rightFromYaw, clamp } from '../core/math.js';
import { REAR_TRACK, WHEELBASE } from '../config/kart.js';
import { NOVA } from '../config/edition.js';
import { GLOW } from '../nova/hoverKart.js';

export class KartFx {
  constructor(scene) {
    this.skids = new SkidMarks();
    this.smoke = NOVA
      ? new Particles({ max: 260, color: new THREE.Color(GLOW).multiplyScalar(2.2), additive: true, gravity: -0.3, drag: 2.2 })
      : new Particles({ max: 260, color: new THREE.Color(0xc9ccd2), gravity: 0.4, drag: 1.6 });
    this.trail = NOVA ? new Particles({ max: 220, color: new THREE.Color(1, 0.55, 0.9).multiplyScalar(2.5), additive: true, drag: 3 }) : null;
    if (this.trail) scene.add(this.trail.points);
    this._trailDebt = 0;
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
    [this._vh, this._fov] = [viewportHeight, camera.fov];
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
      if (!NOVA) this.skids.add(side, wx, wz, Math.max(slide, hardBrake));
      for (let k = 0; k < puffs; k++) {
        const j = () => (Math.random() - 0.5) * 0.8;
        if (NOVA) { // ion motes knocked out of the hover field
          this.smoke.emit(wx, 0.2, wz, s.vx * 0.3 + j() * 3, 0.6 + Math.random(), s.vz * 0.3 + j() * 3, 0.35 + Math.random() * 0.3, 0.09, 0.02, 0.6);
          continue;
        }
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
    if (this.trail) this.thrust(s, t, f, r, dt);
    this.smoke.setScale(viewportHeight, camera.fov);
    this.sparks.setScale(viewportHeight, camera.fov);
    this.smoke.update(dt);
    this.sparks.update(dt);
  }

  // NOVA: short-lived glowing motes streaming from the twin thrusters, more with more throttle.
  thrust(s, t, f, r, dt) {
    this._trailDebt += (t.throttle || 0) * 34 * dt;
    const n = Math.floor(this._trailDebt);
    this._trailDebt -= n;
    for (let k = 0; k < n; k++) {
      const side = k % 2 ? 1 : -1;
      const x = s.x + r.x * side * 0.24 + f.x * -0.88;
      const z = s.z + r.z * side * 0.24 + f.z * -0.88;
      const j = () => (Math.random() - 0.5) * 0.3;
      this.trail.emit(x, 0.52, z, s.vx * 0.55 - f.x * 2 + j(), j(), s.vz * 0.55 - f.z * 2 + j(), 0.22 + Math.random() * 0.12, 0.13, 0.02, 0.5);
    }
    this.trail.setScale(this._vh ?? 800, this._fov ?? 60);
    this.trail.update(dt);
  }

  reset() {
    this.skids.clear();
  }
}
