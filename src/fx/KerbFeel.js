// Kerb contact for one kart: how much of it is up on a curb, the rib rate it is rattling at, and the
// visual ride (lift, rib-to-rib hop, tilt toward the kerb side). Audio reads amount / hz (true rib
// rate); the camera and the body hop read `rib` (core/FrameSines: the rib partials, kept below Nyquist).

import { wheelsOnCurb, wheelLayout } from '../track/curbTable.js';
import { KERB_RIDE, WHEELBASE, FRONT_TRACK, REAR_TRACK } from '../config/kart.js';
import { clamp } from '../core/math.js';
import { FrameSines } from '../core/FrameSines.js';

const WHEELS = wheelLayout(WHEELBASE, FRONT_TRACK, REAR_TRACK);

export class KerbFeel {
  constructor() {
    this.contact = { count: 0, left: 0, right: 0, lateral: 0 };
    this.rib = new FrameSines([1, 2.3, 0.5], [0, 0.4, 1.1]); // rib, overtone, rock
    this.reset();
  }

  reset() {
    this.amount = 0; // 0..1 smoothed contact (one side fully on the kerb ≈ 1)
    this.tilt = 0; // -1 (left wheels up) .. +1 (right wheels up)
    this.hz = 0;
  }

  get lateral() {
    return this.contact.lateral;
  }

  // curbs: track/curbTable.js table; index: kart's nearest sample. Call after kart.update.
  update(kart, path, curbs, index, dt) {
    const c = curbs ? wheelsOnCurb(curbs, path, kart.state, index, WHEELS, KERB_RIDE.tyreHalfWidth, this.contact) : this.contact;
    const speed = kart.telemetry.speed || 0;
    const target = speed > 0.5 && curbs ? clamp(c.count / 2, 0, 1) : 0;
    const rate = target > this.amount ? KERB_RIDE.attack : KERB_RIDE.release;
    const k = 1 - Math.exp(-rate * dt);
    this.amount += (target - this.amount) * k;
    const side = c.count ? (c.right - c.left) / c.count : this.tilt;
    this.tilt += (side - this.tilt) * k;
    this.hz = speed / KERB_RIDE.ridge;
    this.rib.update(this.hz, dt);
    this._ride(kart.model, speed);
  }

  // Added on top of KartModel's own pose, which it rewrites every frame.
  _ride(model, speed) {
    const a = this.amount;
    const pace = clamp(speed / 6, 0, 1);
    const rib = this.rib.value[0] * 0.5 + 0.5;
    model.root.position.y = a * (KERB_RIDE.lift + KERB_RIDE.hop * pace * rib);
    model.body.rotation.z += a * this.tilt * KERB_RIDE.roll * (0.75 + 0.25 * rib);
    model.body.rotation.x += a * KERB_RIDE.hop * pace * this.rib.value[2];
  }
}
