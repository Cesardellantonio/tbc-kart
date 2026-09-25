// Assembles the kart (chassis, driver, wheels, contact shadow) and animates it from physics state.

import * as THREE from 'three';
import { kartMaterials } from './model/materials.js';
import { buildChassis } from './model/chassis.js';
import { buildWheels } from './model/wheels.js';
import { buildDriver } from './model/driver.js';
import { blobTexture } from '../world/textures/markings.js';
import {
  MAX_STEER_ANGLE, STEERING_WHEEL_TURN, BODY_ROLL, BODY_PITCH, BODY_MOTION_LIMIT, DRIVER_LEAN,
} from '../config/kart.js';
import { clamp, damp } from '../core/math.js';

export class KartModel {
  // livery: colour overrides (see config/kart.js LIVERY); ghost: translucent, casts no shadow.
  constructor({ livery, number, ghost = false } = {}) {
    const mats = kartMaterials(livery, ghost);
    this.root = new THREE.Group(); // follows position + heading
    this.body = new THREE.Group(); // rolls and pitches with load transfer; wheels stay planted
    this.root.add(this.body);

    const chassis = buildChassis(mats, number, ghost);
    this.steeringWheel = chassis.steeringWheel;
    this.driver = buildDriver(mats);
    this.body.add(chassis.group, this.driver.group);
    const { group, wheels } = buildWheels(mats);
    this.wheels = wheels;
    this.root.add(group);
    this.root.traverse((o) => {
      if (!o.isMesh) return;
      o.receiveShadow = !ghost;
      o.castShadow = !ghost && !o.userData.small; // visor, plate, steering wheel: too small to matter
    });
    this._roll = 0;
    this._pitch = 0;
    if (ghost) return; // no contact shadow under a ghost

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 2.6).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, toneMapped: false }),
    );
    shadow.position.y = 0.03;
    shadow.renderOrder = 2;
    this.root.add(shadow);
  }

  // In the cockpit view the camera sits inside the helmet — hide the head.
  setFirstPerson(on) {
    this.driver.head.visible = !on;
  }

  // telemetry: forwardSpeed, latAccel, longAccel. snap = skip smoothing (after a reset).
  update(state, tel, dt, snap = false) {
    this.root.position.set(state.x, 0, state.z);
    this.root.rotation.y = state.yaw;
    for (const w of this.wheels) {
      w.spin.rotation.x -= (tel.forwardSpeed * dt) / w.radius;
      if (w.front) w.steer.rotation.y = state.steer * MAX_STEER_ANGLE;
    }
    this.steeringWheel.rotation.z = state.steer * STEERING_WHEEL_TURN;

    const lim = BODY_MOTION_LIMIT;
    const roll = clamp(-tel.latAccel * BODY_ROLL, -lim, lim) || 0; // || 0 drops NaN
    const pitch = clamp(tel.longAccel * BODY_PITCH, -lim, lim) || 0;
    this._roll = snap ? roll : damp(this._roll, roll, 7, dt) || 0;
    this._pitch = snap ? pitch : damp(this._pitch, pitch, 7, dt) || 0;
    this.body.rotation.set(this._pitch, 0, this._roll);
    this.driver.head.rotation.z = -this._roll * (1 + DRIVER_LEAN) * 2;
  }
}
