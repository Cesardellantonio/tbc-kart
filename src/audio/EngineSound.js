// Kart engine voice: saw + square + sub through a resonant low-pass, with a firing "rumble" LFO.

import { ENGINE } from '../config/audio.js';
import { clamp, damp, lerp } from '../core/math.js';

export class EngineSound {
  constructor(audio) {
    this.n = null;
    this._throttle = 0;
    audio.onReady((ctx, out) => this._build(ctx, out));
  }

  _build(ctx, out) {
    const osc = (type) => Object.assign(ctx.createOscillator(), { type });
    const mix = (v) => {
      const g = ctx.createGain();
      g.gain.value = v;
      return g;
    };
    const saw = osc('sawtooth');
    const square = osc('square');
    const sub = osc('sine');
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 3;
    const amp = mix(0);
    const lfo = osc('sine');
    const lfoDepth = mix(0);
    saw.connect(mix(0.45)).connect(filter);
    square.connect(mix(0.18)).connect(filter);
    sub.connect(mix(0.7)).connect(filter);
    filter.connect(amp).connect(out);
    lfo.connect(lfoDepth).connect(amp.gain);
    for (const o of [saw, square, sub, lfo]) o.start();
    this.n = { ctx, saw, square, sub, filter, amp, lfo, lfoDepth };
  }

  // speed m/s, throttle 0..1, active=false fades the engine out (paused / title before gesture)
  update(speed, throttle, dt, active = true) {
    if (!this.n) return;
    const { ctx, saw, square, sub, filter, amp, lfo, lfoDepth } = this.n;
    const t = ctx.currentTime;
    this._throttle = damp(this._throttle, throttle, 9, dt);
    const load = clamp(speed / 16, 0, 1);
    const rev = clamp(0.1 + 0.85 * load + 0.25 * this._throttle * (1 - load), 0, 1.05);
    const hz = lerp(ENGINE.idleHz, ENGINE.topHz, rev);
    saw.frequency.setTargetAtTime(hz, t, 0.04);
    square.frequency.setTargetAtTime(hz * 0.502, t, 0.04);
    sub.frequency.setTargetAtTime(hz * 0.5, t, 0.04);
    lfo.frequency.setTargetAtTime(hz / 4, t, 0.04);
    const openness = 0.35 * rev + 0.65 * this._throttle;
    filter.frequency.setTargetAtTime(lerp(ENGINE.cutoffIdle, ENGINE.cutoffTop, openness), t, 0.05);
    const level = active ? ENGINE.idleGain + ENGINE.throttleGain * openness : 0;
    amp.gain.setTargetAtTime(level, t, 0.08);
    lfoDepth.gain.setTargetAtTime(level * ENGINE.rumbleDepth, t, 0.08);
  }
}
