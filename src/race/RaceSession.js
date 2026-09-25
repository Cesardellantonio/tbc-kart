// Race flow: title → countdown → racing ⇄ paused → finished (Grand Prix). Drives the start lights
// and the player's lap timer. mode: 'race' (Grand Prix vs rivals) | 'timeattack' (alone + ghost) |
// 'online' (the countdown and race clock follow the room's shared clock, see follow()).

import { LapTimer } from './LapTimer.js';
import { LIGHT_INTERVAL, LIGHTS_HOLD, GO_SHOW, LIGHT_COUNT } from '../config/race.js';

// How long all five reds stay lit before GO: random, so nobody can time the start.
export const randomHold = (random = Math.random) => LIGHTS_HOLD[0] + random() * (LIGHTS_HOLD[1] - LIGHTS_HOLD[0]);

export class RaceSession {
  // laps: Grand Prix race distance on this track.
  constructor(sampleCount, startIndex, bus, record, laps) {
    this.laps = laps;
    this.bus = bus;
    this.timer = new LapTimer(sampleCount, startIndex);
    this.timer.best = record.best;
    this.timer.bestSplits = record.splits;
    this.state = 'title'; // 'title' | 'countdown' | 'racing' | 'paused' | 'finished'
    this.mode = 'race';
    this.clock = 0; // seconds since GO
    this.lights = 0;
    this.lightsMode = 'off'; // 'off' | 'red' | 'go'
    [this._t, this._hold, this._goAt, this._resumeTo] = [0, 1, 0, null];
    this.elapsed = null; // online: () => shared-clock seconds since the countdown began
  }

  // hold: given online, so every peer's lights go out together.
  startCountdown(mode = this.mode, hold = randomHold()) {
    this.mode = mode;
    this.state = 'countdown';
    this._t = 0;
    this.clock = 0;
    this.lights = 0;
    this.lightsMode = 'red';
    this._hold = hold;
    this.timer.reset();
    this.bus.emit('countdown');
  }

  toTitle() {
    this.state = 'title';
    this.lightsMode = 'off';
    this.lights = 0;
  }

  // Chequered flag for the player: the clock keeps running so rivals can still finish.
  finish() {
    this.state = 'finished';
    this.bus.emit('finish');
  }

  // Online: time comes from elapsed() (seconds since the countdown began on the host's clock; negative
  // until then) instead of summed frame times, so GO and every flag land at the same host time on
  // every peer however its frames ran. null goes back to frame time.
  follow(elapsed) {
    this.elapsed = elapsed;
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
    if (this.elapsed) dt = Math.max(0, this.elapsed() - this._t);
    if (this.state === 'countdown') {
      this._t += dt;
      const lit = Math.min(LIGHT_COUNT, Math.floor(this._t / LIGHT_INTERVAL));
      if (lit > this.lights) {
        this.lights = lit;
        this.bus.emit('light', lit);
      }
      const goAt = LIGHT_COUNT * LIGHT_INTERVAL + this._hold;
      if (lit === LIGHT_COUNT && this._t >= goAt) {
        this.state = 'racing';
        this.lightsMode = 'go';
        this._goAt = this._t;
        if (this.elapsed) this.clock = this._t - goAt; // the shared GO, not this frame's, is time zero
        this.bus.emit('go');
      }
    } else if (this.state === 'racing') {
      this._t += dt;
      this.clock += dt;
      if (this.lightsMode === 'go' && this._t - this._goAt > GO_SHOW) this.lightsMode = 'off';
      const event = this.timer.update(trackIndex, this.clock);
      if (event) this.bus.emit('lap', event);
    } else if (this.state === 'finished') {
      this._t += dt;
      this.clock += dt;
    }
  }

  // Snapshot for the HUD.
  get view() {
    const t = this.timer;
    return {
      state: this.state,
      mode: this.mode,
      totalLaps: this.laps,
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
