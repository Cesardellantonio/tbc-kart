// Trauma-based camera shake: impacts add trauma, it decays, offset grows with trauma².

import { SHAKE_DECAY, SHAKE_AMPLITUDE } from '../config/camera.js';

export class CameraShake {
  constructor() {
    this.trauma = 0;
    this._time = 0;
  }

  add(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  // Adds a smooth pseudo-random offset to `position`.
  apply(position, dt) {
    this._time += dt;
    this.trauma = Math.max(0, this.trauma - SHAKE_DECAY * dt);
    const k = this.trauma * this.trauma * SHAKE_AMPLITUDE;
    if (k === 0) return;
    const t = this._time * 31;
    position.x += k * (Math.sin(t * 1.1) + 0.5 * Math.sin(t * 2.7));
    position.y += k * 0.6 * Math.sin(t * 1.7 + 1.3);
    position.z += k * (Math.sin(t * 1.3 + 2.1) + 0.5 * Math.sin(t * 2.3));
  }
}
