// Player kart: physics state stepped in fixed substeps, barrier collisions, visual model.

import { stepKart } from '../physics/kartPhysics.js';
import { KartModel } from './KartModel.js';
import { FIXED_STEP, KART_RADIUS, WALL_RESTITUTION, WALL_SCRAPE } from '../config/physics.js';

const IDLE = { throttle: 0, brake: 0, steer: 0, handbrake: false };

export class Kart {
  constructor(collider) {
    this.collider = collider;
    this.model = new KartModel();
    this.state = { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, steer: 0 };
    this.telemetry = {};
    this.contact = { x: 0, z: 0, nx: 0, nz: 0 };
    this._resetTelemetry();
  }

  get object3d() {
    return this.model.root;
  }

  _resetTelemetry() {
    Object.assign(this.telemetry, {
      speed: 0, forwardSpeed: 0, slip: 0, sliding: false, longAccel: 0, latAccel: 0,
      impact: 0, throttle: 0, brake: 0, steer: 0,
    });
  }

  place(x, z, yaw) {
    this.state = { x, z, yaw, vx: 0, vz: 0, steer: 0 };
    this._resetTelemetry();
    this.model.update(this.state, this.telemetry, 0, true);
  }

  // Advance by dt in equal substeps no longer than FIXED_STEP.
  update(controls = IDLE, dt) {
    const steps = Math.max(1, Math.ceil(dt / FIXED_STEP - 1e-6));
    const h = dt / steps;
    let impact = 0;
    for (let k = 0; k < steps; k++) {
      const next = stepKart(this.state, controls, h);
      const hit = this.collider.resolve(next, KART_RADIUS, WALL_RESTITUTION, WALL_SCRAPE);
      if (hit > impact) {
        impact = hit;
        Object.assign(this.contact, this.collider.contact);
      }
      this.state = next;
    }
    const s = this.state;
    Object.assign(this.telemetry, {
      speed: Math.hypot(s.vx, s.vz),
      forwardSpeed: s.forwardSpeed,
      slip: s.slip,
      sliding: s.sliding,
      longAccel: s.longAccel,
      latAccel: s.latAccel,
      impact,
      throttle: controls.throttle,
      brake: controls.brake,
      steer: s.steer,
    });
    this.model.update(s, this.telemetry, dt);
  }
}
