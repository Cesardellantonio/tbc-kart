// Kerb rumble: low-passed noise chopped at the rib rate (speed / rib spacing) plus a low buzz at the
// same rate — the "brrrrr" of tyres hammering over a ribbed kerb.

import { KERB_RUMBLE as K } from '../config/audio.js';
import { clamp } from '../core/math.js';
import { gainNode, filterNode, noiseLoop, lfo, glide } from './nodes.js';

export class KerbRumble {
  constructor(audio) {
    this.n = null;
    audio.onReady((ctx, out) => {
      const level = gainNode(ctx);
      const chop = gainNode(ctx, 0.5);
      noiseLoop(ctx, audio.noise()).connect(filterNode(ctx, 'lowpass', K.lowpass, 1.2)).connect(chop).connect(level);
      const ribs = lfo(ctx, 'square', 30, 0.5, chop.gain);
      const buzz = new OscillatorNode(ctx, { type: 'triangle', frequency: 30 });
      buzz.connect(gainNode(ctx, K.buzz)).connect(level);
      buzz.start();
      level.connect(out);
      this.n = { ctx, level, ribs, buzz };
    });
  }

  // kerb: fx/KerbFeel (amount 0..1, hz rib rate).
  update(kerb, active = true) {
    if (!this.n) return;
    const { ctx, level, ribs, buzz } = this.n;
    const hz = clamp(kerb.hz, 6, 80);
    glide(ribs.osc.frequency, hz, ctx, 0.03);
    glide(buzz.frequency, hz * 1.5, ctx, 0.03);
    const pace = clamp(kerb.hz / 20, 0.25, 1); // slow over the kerb → softer thuds
    glide(level.gain, active ? K.gain * kerb.amount * pace : 0, ctx, 0.025);
  }
}
