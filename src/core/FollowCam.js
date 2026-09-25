// Driving views (chase / far / cockpit): trails the kart with damped yaw, position and FOV.

import * as THREE from 'three';
import { FOV_BASE, FOV_DAMP, FOV_SURGE_DAMP, VIEW_ORDER, POSITION_DAMP, YAW_DAMP, VIEWS } from '../config/camera.js';
import { damp, dampAngle } from './math.js';
import { followFov, trailYaw, followTarget } from './cameraModes.js';
import { HeadMotion } from './HeadMotion.js';

export class FollowCam {
  constructor() {
    this.view = 'chase';
    this._yaw = 0;
    this._fov = FOV_BASE;
    this._surge = 0; // m/s², slow average of the longitudinal acceleration (the FOV kick)
    this._target = { pos: new THREE.Vector3(), look: new THREE.Vector3(), roll: 0 };
    this.head = new HeadMotion(); // cockpit only
    this._pos = new THREE.Vector3();
  }

  cycle() {
    this.view = VIEW_ORDER[(VIEW_ORDER.indexOf(this.view) + 1) % VIEW_ORDER.length];
    return this.view;
  }

  // Jump straight to the resting position behind a (stationary) kart.
  reset(kart) {
    this._yaw = kart.state.yaw;
    followTarget(kart.state, 0, this._yaw, this.view, this._target);
    this._pos.copy(this._target.pos);
    this._surge = 0;
    this.head.reset();
  }

  // Writes out.pos, out.look, out.roll and returns the FOV to use.
  update(kart, dt, out) {
    const { state, telemetry } = kart;
    const cockpit = this.view === 'cockpit';
    this._yaw = cockpit ? state.yaw : dampAngle(this._yaw, trailYaw(state, telemetry.speed), YAW_DAMP, dt);
    followTarget(state, telemetry.speed, this._yaw, this.view, this._target);
    this._target.roll = 0;
    if (cockpit) {
      const v = VIEWS.cockpit;
      this.head.apply(state, telemetry, dt, v.lookAhead, v.lookHeight, this._target);
      this._pos.copy(this._target.pos);
    } else {
      const p = this._pos;
      const t = this._target.pos;
      p.set(damp(p.x, t.x, POSITION_DAMP, dt), damp(p.y, t.y, POSITION_DAMP, dt), damp(p.z, t.z, POSITION_DAMP, dt));
    }
    out.pos.copy(this._pos);
    out.look.copy(this._target.look);
    out.roll = this._target.roll;
    this._surge = damp(this._surge, telemetry.longAccel || 0, FOV_SURGE_DAMP, dt);
    this._fov = damp(this._fov, followFov(telemetry.speed, this._surge), FOV_DAMP, dt);
    return this._fov;
  }
}
