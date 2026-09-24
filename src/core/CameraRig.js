// Owns the camera and picks who drives it: broadcast cams (title), follow views (racing) or a
// debug tool ('manual'). Blends between them with a short swoop and adds impact shake.

import * as THREE from 'three';
import { NEAR, FAR, FOV_BASE } from '../config/camera.js';
import { FollowCam } from './FollowCam.js';
import { BroadcastCam } from './BroadcastCam.js';
import { CameraShake } from './CameraShake.js';

const SWOOP_TIME = 1.3;
const ease = (t) => t * t * (3 - 2 * t);

export class CameraRig {
  constructor(aspect) {
    this.three = new THREE.PerspectiveCamera(FOV_BASE, aspect, NEAR, FAR);
    this.mode = 'broadcast'; // 'broadcast' | 'follow' | 'manual'
    this.followCam = new FollowCam();
    this.broadcastCam = new BroadcastCam();
    this.shaker = new CameraShake();
    this._out = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this._from = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this._look = new THREE.Vector3();
    this._swoop = 1;
  }

  get view() {
    return this.followCam.view;
  }

  set anchors(list) {
    this.broadcastCam.anchors = list;
  }

  cycleView() {
    return this.followCam.cycle();
  }

  // Switch to the driving view, swooping in from wherever the camera is now.
  follow(kart) {
    this._from.pos.copy(this.three.position);
    this._from.look.copy(this._look);
    this.followCam.reset(kart);
    this.mode = 'follow';
    this._swoop = 0;
  }

  broadcast() {
    this.broadcastCam.reset();
    this.mode = 'broadcast';
  }

  shake(amount) {
    this.shaker.add(amount);
  }

  setAspect(aspect) {
    this.three.aspect = aspect;
    this.three.updateProjectionMatrix();
  }

  update(kart, dt) {
    if (this.mode === 'manual') return; // a debug view owns the camera
    const out = this._out;
    const source = this.mode === 'broadcast' ? this.broadcastCam : this.followCam;
    const fov = source.update(kart, dt, out);
    this._swoop = Math.min(1, this._swoop + dt / SWOOP_TIME);
    const e = ease(this._swoop);
    const cam = this.three;
    cam.position.lerpVectors(this._from.pos, out.pos, e);
    this._look.lerpVectors(this._from.look, out.look, e);
    this.shaker.apply(cam.position, dt);
    cam.lookAt(this._look);
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }
}
