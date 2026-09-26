// A kart (player or rival): physics state stepped in fixed substeps, barrier collisions, visual model.

import { advanceKart } from '../physics/advanceKart.js';
import { KartModel } from './KartModel.js';

const IDLE = { throttle: 0, brake: 0, steer: 0, handbrake: false };

export class Kart {
  // look: { livery, number } for the model (defaults to the player's yellow #07).
  constructor(collider, look = {}) {
    this.collider = collider;
    this.model = new KartModel(look);
    this.draft = 0; // 0..1 slipstream from a kart ahead, set each frame by kartContacts
    this.surface = null; // track/surfaceGrip for the current track (set with the collider)
    this.grip = [1, 1, 1, 1]; // surface grip under each tyre this frame
    this._surfaceIndex = -1;
    this.state = { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, steer: 0, yawRate: 0 };
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
      yawRate: 0, slipAngle: 0, drift: 0, impact: 0, throttle: 0, brake: 0, steer: 0,
      rpm: 1700, clutch: 1, wheelSpeed: 0, wheelSpin: 0, tyreTemp: [22, 22], loads: [0, 0, 0, 0],
    });
  }

  // Another livery / number (online, the room hands you yours): a new model where the old one was.
  // Returns the old model's root for the caller to dispose.
  setLook(look = {}) {
    const old = this.model.root;
    this.model = new KartModel(look);
    old.parent?.add(this.model.root);
    old.parent?.remove(old);
    this.model.update(this.state, this.telemetry, 0, true);
    return old;
  }

  place(x, z, yaw) {
    this.state = { x, z, yaw, vx: 0, vz: 0, steer: 0, yawRate: 0 }; // engine idling, tyres at hall temperature
    this.draft = 0;
    this._surfaceIndex = -1;
    this._resetTelemetry();
    this.model.update(this.state, this.telemetry, 0, true);
  }

  // Advance by dt (fixed substeps + barrier collisions, see physics/advanceKart).
  update(controls = IDLE, dt) {
    if (this.surface) {
      const { x, z } = this.state;
      this._surfaceIndex = this.surface.path.nearest(x, z, this._surfaceIndex);
      this.surface.wheels(this.state, this._surfaceIndex, this.grip);
    }
    const input = { ...controls, draft: this.draft, grip: this.grip };
    const { state, impact, contact } = advanceKart(this.state, input, dt, this.collider);
    this.surface?.addDistance(Math.hypot(state.vx, state.vz) * dt);
    if (contact) Object.assign(this.contact, contact);
    this.state = state;
    const s = state;
    Object.assign(this.telemetry, {
      speed: Math.hypot(s.vx, s.vz),
      forwardSpeed: s.forwardSpeed,
      slip: s.slip,
      sliding: s.sliding,
      longAccel: s.longAccel,
      latAccel: s.latAccel,
      yawRate: s.yawRate,
      slipAngle: s.slipAngle,
      drift: s.drift,
      rpm: s.rpm, // engine
      clutch: s.clutch,
      wheelSpeed: s.omega, // rear axle, rad/s (spins up / locks)
      wheelSpin: s.wheelSpin,
      tyreTemp: [s.tempF, s.tempR], // °C, front and rear axle
      loads: s.loads,
      impact,
      throttle: controls.throttle,
      brake: controls.brake,
      steer: s.steer,
    });
    this.model.update(s, this.telemetry, dt);
  }
}
