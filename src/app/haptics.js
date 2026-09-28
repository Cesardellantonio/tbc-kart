// Force feedback a browser can give: a gamepad's rumble motors (heavy motor = kerbs and hits, light
// motor = tyres at the limit and engine buzz at high revs) refreshed a few times a second, and a phone's
// vibration for barrier hits and kerb strikes. Only while you drive; silent in menus and replays.

import { HAPTICS } from '../config/input.js';
import { clamp } from '../core/math.js';

export class Haptics {
  constructor() {
    this._next = 0;
    this._buzzCooldown = 0;
    this._onKerb = false;
  }

  // game: the running game; driving: the player is in control this frame.
  update(game, dt, driving) {
    this._next -= dt;
    this._buzzCooldown -= dt;
    if (!driving) return;
    const t = game.kart.telemetry;
    const kerb = game.kerb.amount || 0;
    const impact = clamp((t.impact || 0) / HAPTICS.impactFull, 0, 1);
    const slide = clamp(((t.slip || 0) - HAPTICS.slideFrom) / HAPTICS.slideRange, 0, 1);
    const revs = clamp(((t.rpm || 0) - HAPTICS.rpmFrom) / (HAPTICS.rpmTo - HAPTICS.rpmFrom), 0, 1);

    const pad = game.input.pad;
    const motor = pad?.vibrationActuator;
    if (motor && this._next <= 0) {
      const strong = Math.max(kerb * HAPTICS.kerb, impact);
      const weak = Math.max(slide * HAPTICS.slide, revs * HAPTICS.engine * (t.throttle || 0));
      this._next = HAPTICS.period;
      if (strong > 0.02 || weak > 0.02) {
        motor.playEffect?.('dual-rumble', { startDelay: 0, duration: HAPTICS.period * 1000 + 30, strongMagnitude: strong, weakMagnitude: weak })?.catch?.(() => {});
      }
    }

    // Phones (where supported): a thud on a hit, a tick as the kart climbs a kerb
    if (!pad && navigator.vibrate && this._buzzCooldown <= 0) {
      if (impact > 0.2) {
        navigator.vibrate(Math.round(20 + 50 * impact));
        this._buzzCooldown = 0.25;
      } else if (kerb > 0.4 && !this._onKerb) {
        navigator.vibrate(12);
        this._buzzCooldown = 0.2;
      }
    }
    this._onKerb = kerb > 0.4;
  }
}
