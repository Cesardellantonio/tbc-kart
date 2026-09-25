// Owns the camera and picks who drives it: broadcast cams (title), follow views (racing) or a debug
// tool ('manual'). Blends between them with a short swoop; adds impact shake, vibration and head roll.

import * as THREE from 'three';
import { NEAR, FAR, FOV_BASE } from '../config/camera.js';
import { FollowCam } from './FollowCam.js';
import { BroadcastCam } from './BroadcastCam.js';
import { CameraShake } from './CameraShake.js';
import { CameraVibe } from './CameraVibe.js';

const SWOOP_TIME = 1.3;
const ease = (t) => t * t * (3 - 2 * t);

export class CameraRig {
  constructor(aspect) {
    this.three = new THREE.PerspectiveCamera(FOV_BASE, aspect, NEAR, FAR);
    this.mode = 'broadcast'; // 'broadcast' | 'follow' | 'manual'
    this.followCam = new FollowCam();
    this.broadcastCam = new BroadcastCam();
    this.shaker = new CameraShake();
    this.vibe = new CameraVibe();
    this._out = { pos: new THREE.Vector3(), look: new THREE.Vector3(), roll: 0 };
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

  // Trackside TV cameras. With a kart, cut straight to its camera instead of blending: after a track
  // change the current pose belongs to the old hall, and the next swoop must not start from there.
  broadcast(kart = null) {
    this.broadcastCam.reset();
    this.mode = 'broadcast';
    if (!kart) return;
    this._swoop = 1;
    this.update(kart, 0);
  }

  shake(amount) {
    this.shaker.add(amount);
  }

  setAspect(aspect) {
    this.three.aspect = aspect;
    this.three.updateProjectionMatrix();
  }

  update(kart, dt, kerb = null) { // kerb: fx/KerbFeel of the followed kart (kerb judder)
    if (this.mode === 'manual') return; // a debug view owns the camera
    const out = Object.assign(this._out, { roll: 0 });
    const source = this.mode === 'broadcast' ? this.broadcastCam : this.followCam;
    const fov = source.update(kart, dt, out);
    this._swoop = Math.min(1, this._swoop + dt / SWOOP_TIME);
    const e = ease(this._swoop);
    const cam = this.three;
    cam.position.lerpVectors(this._from.pos, out.pos, e);
    this._look.lerpVectors(this._from.look, out.look, e);
    this.shaker.apply(cam.position, dt);
    const aim = this.mode === 'follow' ? this.vibe.shake(cam.position, this._look, dt, this.view, kart.telemetry, kerb) : this._look;
    cam.lookAt(aim.x, aim.y, aim.z);
    if (out.roll) cam.rotateZ(out.roll * e);
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }
}
