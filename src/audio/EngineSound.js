// One kart engine: the rpm model (audio/engineRpm) drives a synthesised voice (audio/engineVoice)
// — idle burble, clutch bite, revs rising with road speed, wheelspin flare — plus overrun pops.

import { ENGINE } from '../config/audio.js';
import { clamp, lerp } from '../core/math.js';
import { EngineRpm } from './engineRpm.js';
import { buildEngineVoice } from './engineVoice.js';
import { Backfire } from './Backfire.js';

export class EngineSound {
  // pitch: frequency multiplier so several engines don't phase into one tone.
  constructor(audio, pitch = 1) {
    this.n = null;
    this.pitch = pitch;
    this.model = new EngineRpm();
    this.pops = new Backfire(audio);
    this._wander = 0;
    audio.onReady((ctx, out) => (this.n = buildEngineVoice(ctx, out, audio.noise())));
  }

  get rpm() {
    return this.model.rpm;
  }

  // tel: kart telemetry (speed, forwardSpeed, slip, sliding); throttle 0..1; active=false fades the
  // engine out (paused / title before gesture); volume 0..1 scales the level (distant rival karts).
  update(tel, throttle, dt, active = true, volume = 1) {
    const rpm = this.model.step(tel, throttle, dt);
    if (this.model.liftOff && active) this.pops.trigger(this.model.liftOff);
    this.pops.update(dt, active ? volume : 0);
    if (!this.n) return;
    const { ctx, main, sub, noiseBand, drive, filter, amp, pulse, pulseDepth, wobble, wobbleDepth } = this.n;
    const t = ctx.currentTime;
    const rev = this.model.rev;
    const load = this.model.load;
    const idle = 1 - clamp(rev * 3, 0, 1); // 1 at idle, gone by a third of the range
    const hz = (rpm / 60) * ENGINE.hzPerRev * this.pitch;
    const glide = 0.03;
    main.frequency.setTargetAtTime(hz, t, glide);
    sub.frequency.setTargetAtTime(hz * 0.5, t, glide);
    pulse.frequency.setTargetAtTime(hz / 4, t, glide);
    noiseBand.frequency.setTargetAtTime(hz * 5.5, t, 0.05);
    this._wander = (this._wander + dt * (0.7 + Math.random())) % 1; // irregular idle beat
    wobble.frequency.setTargetAtTime(3 + 2.5 * this._wander, t, 0.2);
    wobbleDepth.gain.setTargetAtTime(ENGINE.idleWobble * idle, t, 0.1);
    const openness = 0.35 * rev + 0.65 * load;
    filter.frequency.setTargetAtTime(lerp(ENGINE.cutoffIdle, ENGINE.cutoffTop, clamp(openness, 0, 1)), t, 0.05);
    drive.gain.setTargetAtTime(0.7 + 1.8 * load * (0.4 + 0.6 * rev), t, 0.05);
    const level = active ? (ENGINE.idleGain + ENGINE.loadGain * openness) * volume : 0;
    amp.gain.setTargetAtTime(level, t, 0.08);
    pulseDepth.gain.setTargetAtTime(level * ENGINE.rumbleDepth * (1 + 0.8 * idle), t, 0.08);
  }
}
