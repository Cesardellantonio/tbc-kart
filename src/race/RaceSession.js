// Race flow: title → countdown → racing ⇄ paused. Drives the start lights and the lap timer.

import { LapTimer } from './LapTimer.js';
import { LIGHT_INTERVAL, LIGHTS_HOLD, GO_SHOW, LIGHT_COUNT } from '../config/race.js';

export class RaceSession {
  constructor(sampleCount, startIndex, bus, record) {
    this.bus = bus;
    this.timer = new LapTimer(sampleCount, startIndex);
    this.timer.best = record.best;
    this.timer.bestSplits = record.splits;
    this.state = 'title'; // 'title' | 'countdown' | 'racing' | 'paused'
    this.clock = 0; // seconds since GO
    this.lights = 0;
    this.lightsMode = 'off'; // 'off' | 'red' | 'go'
    [this._t, this._hold, this._goAt, this._resumeTo] = [0, 1, 0, null];
  }

  startCountdown() {
    this.state = 'countdown';
    this._t = 0;
    this.clock = 0;
    this.lights = 0;
    this.lightsMode = 'red';
    this._hold = LIGHTS_HOLD[0] + Math.random() * (LIGHTS_HOLD[1] - LIGHTS_HOLD[0]);
    this.timer.reset();
    this.bus.emit('countdown');
  }

  togglePause() {
    if (this.state === 'paused') {
      this.state = this._resumeTo;
      this.bus.emit('pause', false);
    } else if (this.state === 'racing' || this.state === 'countdown') {
      this._resumeTo = this.state;
      this.state = 'paused';
      this.bus.emit('pause', true);
    }
  }

  update(dt, trackIndex) {
    if (this.state === 'countdown') {
      this._t += dt;
      const lit = Math.min(LIGHT_COUNT, Math.floor(this._t / LIGHT_INTERVAL));
      if (lit > this.lights) {
        this.lights = lit;
        this.bus.emit('light', lit);
      }
      if (lit === LIGHT_COUNT && this._t >= LIGHT_COUNT * LIGHT_INTERVAL + this._hold) {
        this.state = 'racing';
        this.lightsMode = 'go';
        this._goAt = this._t;
        this.bus.emit('go');
      }
    } else if (this.state === 'racing') {
      this._t += dt;
      this.clock += dt;
      if (this.lightsMode === 'go' && this._t - this._goAt > GO_SHOW) this.lightsMode = 'off';
      const event = this.timer.update(trackIndex, this.clock);
      if (event) this.bus.emit('lap', event);
    }
  }

  // Snapshot for the HUD.
  get view() {
    const t = this.timer;
    return {
      state: this.state,
      lap: t.lap,
      lapTime: t.lapTime(this.clock),
      last: t.lastLap,
      best: t.best,
      delta: t.delta(this.clock),
      lights: this.lights,
      lightsMode: this.lightsMode,
    };
  }
}
