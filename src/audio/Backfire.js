// Overrun crackle: after a lift-off at high revs, a short irregular burst of exhaust pops
// (band-passed noise crack + a low thump), each quieter than the last.

import { BACKFIRE } from '../config/audio.js';

export class Backfire {
  constructor(audio, out = null) {
    this.audio = audio;
    this.out = out; // defaults to the master bus
    this._left = 0;
    this._next = 0;
    this._level = 0;
  }

  // strength 0..1 (how high the revs were when the driver lifted)
  trigger(strength) {
    const [lo, hi] = BACKFIRE.pops;
    this._left = Math.round(lo + (hi - lo) * strength * (0.6 + Math.random() * 0.4));
    this._level = strength;
    this._next = 0.04 + Math.random() * 0.06;
  }

  // volume 0..1 scales the pops (distance, pause); 0 cancels the burst.
  update(dt, volume = 1) {
    if (!this._left || !this.audio.ctx) return;
    if (volume <= 0) return void (this._left = 0);
    this._next -= dt;
    if (this._next > 0) return;
    this._pop(this._level * volume * (0.45 + Math.random() * 0.55));
    this._level *= 0.85;
    this._left--;
    this._next = 0.025 + Math.random() * (BACKFIRE.window / 4);
  }

  _pop(level) {
    const { ctx, master } = this.audio;
    const t = ctx.currentTime;
    const out = this.out ?? master;
    const env = (node, peak, decay) => {
      const g = new GainNode(ctx, { gain: 0 });
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.002 + decay);
      node.connect(g).connect(out);
      return t + 0.01 + decay;
    };
    const noise = new AudioBufferSourceNode(ctx, { buffer: this.audio.noise() });
    const band = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 700 + Math.random() * 1100, Q: 1.3 });
    noise.connect(band);
    noise.start(t, Math.random() * 1.5);
    noise.stop(env(band, level * BACKFIRE.gain * 1.6, 0.025 + Math.random() * 0.035));
    const thump = new OscillatorNode(ctx, { type: 'triangle', frequency: 150 });
    thump.frequency.exponentialRampToValueAtTime(55, t + 0.06);
    thump.start(t);
    thump.stop(env(thump, level * BACKFIRE.gain, 0.06));
  }
}
