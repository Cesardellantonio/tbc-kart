// Engine speed of a rental kart (pure): one fixed ratio behind a centrifugal clutch. Stopped it idles;
// on the throttle it revs to the bite point and hangs there, slipping, while the kart gathers speed;
// once road speed catches up the clutch locks and revs follow the rear axle. Wheelspin flares it.

import { ENGINE, BACKFIRE } from '../config/audio.js';
import { clamp, damp } from '../core/math.js';

export class EngineRpm {
  constructor(cfg = ENGINE) {
    this.cfg = cfg;
    this.rpm = cfg.idleRpm;
    this.load = 0; // smoothed throttle
    this.liftOff = 0; // > 0 on the frame the driver lifts at high revs (strength 0..1)
    this._peakThrottle = 0;
  }

  // Revs the rear axle would force through the clutch at this road speed.
  roadRpm(speed) {
    return (Math.abs(speed) / this.cfg.topSpeed) * this.cfg.maxRpm;
  }

  // tel: kart telemetry ({forwardSpeed | speed, slip, sliding}); throttle 0..1. Returns rpm.
  step(tel, throttle, dt) {
    if (Number.isFinite(tel.rpm)) {
      // The v5 physics runs a real engine (torque curve, centrifugal clutch, axle spin): just follow it.
      this.rpm = damp(this.rpm, tel.rpm, 30, dt);
      this.load = damp(this.load, throttle, 9, dt);
      this._detectLift(throttle, dt);
      return this.rpm;
    }
    const c = this.cfg;
    const road = this.roadRpm(tel.forwardSpeed ?? tel.speed ?? 0);
    const spin = throttle * clamp(((tel.slip || 0) - 1.2) / 4, 0, 1) * (tel.sliding ? 1 : 0.6) * c.slipFlare;
    let target;
    let rate;
    if (road >= c.lockRpm) {
      [target, rate] = [road + spin, 22]; // locked: tied to the axle
    } else if (throttle > 0.05) {
      const free = c.idleRpm + throttle * (c.maxRpm - c.idleRpm);
      const hang = c.biteRpm + (c.lockRpm - c.biteRpm) * Math.max(road / c.lockRpm, throttle * 0.5);
      [target, rate] = [Math.min(free, Math.max(hang, road)) + spin, c.revRate];
    } else {
      const engaged = road > c.dropRpm; // overrun: engine braking until the clutch lets go
      [target, rate] = [engaged ? road : c.idleRpm, engaged ? 18 : 3.5];
    }
    this.rpm = damp(this.rpm, Math.min(target, c.maxRpm * 1.04), rate, dt);
    this.load = damp(this.load, throttle, 9, dt);
    this._detectLift(throttle, dt);
    return this.rpm;
  }

  // Share of the rev range, 0 at idle, 1 at the governor.
  get rev() {
    const c = this.cfg;
    return clamp((this.rpm - c.idleRpm) / (c.maxRpm - c.idleRpm), 0, 1.1);
  }

  _detectLift(throttle, dt) {
    this._peakThrottle = Math.max(throttle, this._peakThrottle - dt * 2); // recent throttle, ~0.5 s memory
    const high = this.rpm / this.cfg.maxRpm;
    this.liftOff = 0;
    if (this._peakThrottle - throttle >= BACKFIRE.lift && throttle < 0.2 && high >= BACKFIRE.minRpm) {
      this.liftOff = clamp((high - BACKFIRE.minRpm) / (1 - BACKFIRE.minRpm), 0.3, 1);
      this._peakThrottle = throttle; // one burst per lift
    }
  }

  reset() {
    this.rpm = this.cfg.idleRpm;
    this.load = this._peakThrottle = this.liftOff = 0;
  }
}
