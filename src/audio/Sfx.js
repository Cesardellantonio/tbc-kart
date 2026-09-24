// Effects: looping tyre screech, barrier impacts, start-light beeps and lap chimes.

import { SCREECH, IMPACT, BEEP, CHIME } from '../config/audio.js';
import { clamp } from '../core/math.js';

export class Sfx {
  constructor(audio) {
    this.audio = audio;
    this.screechGain = null;
    audio.onReady((ctx, out) => {
      const src = new AudioBufferSourceNode(ctx, { buffer: audio.noise(), loop: true });
      const band = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: SCREECH.freq, Q: 1.4 });
      this.screechGain = new GainNode(ctx, { gain: 0 });
      src.connect(band).connect(this.screechGain).connect(out);
      src.start();
    });
  }

  // Continuous: slip in m/s sideways.
  screech(slip, active = true) {
    if (!this.screechGain) return;
    const amount = active ? clamp((slip - SCREECH.threshold) / (SCREECH.full - SCREECH.threshold), 0, 1) : 0;
    this.screechGain.gain.setTargetAtTime(amount * SCREECH.gain, this.audio.ctx.currentTime, 0.06);
  }

  // Envelope helper: node → gain with attack/decay → master.
  _env(node, peak, attack, decay, start) {
    const { ctx, master } = this.audio;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(peak, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
    node.connect(g).connect(master);
    return start + attack + decay;
  }

  impact(speed) {
    const { ctx } = this.audio;
    if (!ctx || speed < IMPACT.minSpeed) return;
    const t = ctx.currentTime;
    const level = clamp(speed / 9, 0.15, 1) * IMPACT.gain;
    const noise = Object.assign(ctx.createBufferSource(), { buffer: this.audio.noise() });
    const low = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 1100 });
    noise.connect(low);
    noise.start(t, Math.random());
    noise.stop(this._env(low, level, 0.004, 0.22, t));
    const thump = Object.assign(ctx.createOscillator(), { type: 'sine' });
    thump.frequency.setValueAtTime(95, t);
    thump.frequency.exponentialRampToValueAtTime(42, t + 0.25);
    thump.start(t);
    thump.stop(this._env(thump, level * 0.9, 0.004, 0.28, t));
  }

  beep(kind) {
    const { ctx } = this.audio;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = Object.assign(ctx.createOscillator(), { type: 'square' });
    osc.frequency.value = kind === 'go' ? BEEP.go : BEEP.red;
    osc.start(t);
    osc.stop(this._env(osc, BEEP.gain * 0.5, 0.005, kind === 'go' ? 0.6 : 0.2, t));
  }

  chime(best = false) {
    const { ctx } = this.audio;
    if (!ctx) return;
    (best ? CHIME.best : CHIME.lap).forEach((hz, i) => {
      const t = ctx.currentTime + i * 0.09;
      const osc = Object.assign(ctx.createOscillator(), { type: 'triangle' });
      osc.frequency.value = hz;
      osc.start(t);
      osc.stop(this._env(osc, CHIME.gain, 0.01, 0.35, t));
    });
  }
}
