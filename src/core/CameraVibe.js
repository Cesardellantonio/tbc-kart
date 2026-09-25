// Continuous camera vibration: a fine engine buzz that grows with speed (a tremble near flat out) and a
// rhythmic judder while the kart rides a kerb (every driving view). Small, and never accumulates.

import { VIBE, SPEED_FULL } from '../config/camera.js';
import { clamp } from './math.js';
import { FrameSines } from './FrameSines.js';

const BUZZ_HZ = 157 / (2 * Math.PI); // engine tremble fundamental (25 Hz); partials at 25, 38 and 32 Hz

export class CameraVibe {
  constructor() {
    this._buzz = new FrameSines([1, 241 / 157, 199 / 157], [0, 1.3, 0.7], VIBE.buzzCeil);
    this.offset = { x: 0, y: 0, z: 0 };
    this._aim = { x: 0, y: 0, z: 0 };
  }

  // view: 'chase' | 'far' | 'cockpit'; tel: kart telemetry; kerb: fx/KerbFeel (or null).
  // Returns this.offset (metres). See shake() to apply it.
  update(dt, view, tel, kerb) {
    const o = this.offset;
    o.x = o.y = o.z = 0;
    if (dt <= 0) return o;
    const cockpit = view === 'cockpit';
    const pace = clamp((tel.speed || 0) / SPEED_FULL, 0, 1);
    const buzz = (cockpit ? VIBE.engineCockpit : VIBE.engine) * (0.25 + 0.75 * pace) + (cockpit ? VIBE.speedCockpit : VIBE.speed) * pace ** 3;
    // Incommensurate high frequencies → a fine, non-repeating tremble (capped below Nyquist at low fps).
    const [b0, b1, b2] = this._buzz.update(BUZZ_HZ, dt);
    o.y += buzz * (0.6 * b0 + 0.4 * b1);
    o.x += buzz * 0.5 * b2;
    if (kerb && kerb.amount > 0.01) {
      const amp = (cockpit ? VIBE.kerbCockpit : VIBE.kerb) * kerb.amount * clamp((tel.speed || 0) / 8, 0.2, 1);
      const [rib, over, rock] = kerb.rib.value; // band-limited to the frame rate, so it can't alias
      o.y += amp * (0.7 * rib + 0.3 * over);
      o.x += amp * 0.45 * kerb.tilt * rock;
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
