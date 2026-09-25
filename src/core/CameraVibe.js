// Continuous camera vibration: a fine engine buzz that grows with speed (chase views) and a
// rhythmic judder while the kart rides a kerb (every driving view). Small, and never accumulates.

import { VIBE } from '../config/camera.js';
import { clamp } from './math.js';

export class CameraVibe {
  constructor() {
    this._t = 0;
    this.offset = { x: 0, y: 0, z: 0 };
    this._aim = { x: 0, y: 0, z: 0 };
  }

  // view: 'chase' | 'far' | 'cockpit'; tel: kart telemetry; kerb: fx/KerbFeel (or null).
  // Returns this.offset (metres). See shake() to apply it.
  update(dt, view, tel, kerb) {
    this._t += dt;
    const o = this.offset;
    o.x = o.y = o.z = 0;
    if (dt <= 0) return o;
    const t = this._t;
    const cockpit = view === 'cockpit';
    const pace = clamp((tel.speed || 0) / 16, 0, 1);
    const buzz = (cockpit ? VIBE.engineCockpit : VIBE.engine) * (0.25 + 0.75 * pace);
    // Incommensurate high frequencies → a fine, non-repeating tremble at any frame rate.
    o.y += buzz * (0.6 * Math.sin(t * 157) + 0.4 * Math.sin(t * 241 + 1.3));
    o.x += buzz * 0.5 * Math.sin(t * 199 + 0.7);
    if (kerb && kerb.amount > 0.01) {
      const amp = (cockpit ? VIBE.kerbCockpit : VIBE.kerb) * kerb.amount * clamp((tel.speed || 0) / 8, 0.2, 1);
      o.y += amp * (0.7 * Math.sin(kerb.phase) + 0.3 * Math.sin(kerb.phase * 2.3 + 0.4));
      o.x += amp * 0.45 * kerb.tilt * Math.sin(kerb.phase * 0.5 + 1.7);
    }
    return o;
  }

  // Offsets the camera position (Vector3) and returns the aim point to use instead of `look`: moved
  // VIBE.aim times as far, so the view picks up a little angular judder too. `look` is not changed.
  shake(position, look, dt, view, tel, kerb) {
    const o = this.update(dt, view, tel, kerb);
    position.set(position.x + o.x, position.y + o.y, position.z + o.z);
    return Object.assign(this._aim, { x: look.x + o.x * VIBE.aim, y: look.y + o.y * VIBE.aim, z: look.z + o.z * VIBE.aim });
  }
}
