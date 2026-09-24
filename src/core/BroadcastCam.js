// Title-screen "TV coverage": hard cuts between trackside cameras, smooth pan, auto-zoom on the kart.

import * as THREE from 'three';
import { broadcastTarget, broadcastFov } from './cameraModes.js';

export class BroadcastCam {
  constructor() {
    this.anchors = [];
    this._anchor = -1;
    this._target = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this._look = new THREE.Vector3();
  }

  reset() {
    this._anchor = -1;
  }

  // Writes out.pos, out.look and returns the FOV to use.
  update(kart, dt, out) {
    const previous = this._anchor;
    this._anchor = broadcastTarget(this.anchors, kart.state, this._anchor, this._target);
    if (this._anchor !== previous) this._look.copy(this._target.look); // cut: no pan across
    else this._look.lerp(this._target.look, 1 - Math.exp(-8 * dt));
    out.pos.copy(this._target.pos);
    out.look.copy(this._look);
    return broadcastFov(out.pos.distanceTo(out.look));
  }
}
