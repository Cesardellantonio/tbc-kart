// Tyre voices for the player's kart: squeal that grows with how hard the tyres work (lateral g and
// slip, not an on/off threshold), a low juddering scrub under hard braking, and a gritty scrape
// while grinding along a barrier.

import { TYRES as T } from '../config/audio.js';
import { clamp } from '../core/math.js';
import { gainNode, filterNode, noiseLoop, lfo, glide } from './nodes.js';

const ramp = (v, [lo, hi]) => clamp((v - lo) / (hi - lo), 0, 1);

function build(ctx, out, buffer) {
  const squeal = gainNode(ctx);
  const [bandA, bandB] = [filterNode(ctx, 'bandpass', T.squealHz[0], 9), filterNode(ctx, 'bandpass', T.squealHz[1], 7)];
  noiseLoop(ctx, buffer).connect(bandA).connect(squeal);
  noiseLoop(ctx, buffer).connect(bandB).connect(gainNode(ctx, 0.6)).connect(squeal);
  const warble = lfo(ctx, 'sine', 6.5, 35, bandA.frequency); // rubber stick-slip wobble
  warble.depth.connect(bandB.frequency);

  const brake = gainNode(ctx);
  const chop = gainNode(ctx, 0.55);
  noiseLoop(ctx, buffer).connect(filterNode(ctx, 'bandpass', T.brakeHz, 1.4)).connect(chop).connect(brake);
  const judder = lfo(ctx, 'square', T.judderHz, 0.45, chop.gain);

  const scrape = gainNode(ctx);
  const grit = gainNode(ctx, 0.6);
  noiseLoop(ctx, buffer).connect(filterNode(ctx, 'highpass', 1500, 0.7))
    .connect(filterNode(ctx, 'bandpass', T.scrapeHz, 0.8)).connect(grit).connect(scrape);
  const rasp = lfo(ctx, 'sawtooth', 27, 0.4, grit.gain);
  for (const g of [squeal, brake, scrape]) g.connect(out);
  return { ctx, squeal, bandA, bandB, brake, judder, scrape, rasp };
}

export class TyreSound {
  constructor(audio) {
    this.n = null;
    this._scrape = 0;
    audio.onReady((ctx, out) => (this.n = build(ctx, out, audio.noise())));
  }

  // tel: kart telemetry; wall: this frame's barrier impact (m/s, 0 = no contact).
  update(tel, dt, active = true, wall = 0) {
    this._scrape = wall > 0.02 ? T.scrapeHold : Math.max(0, this._scrape - dt);
    if (!this.n) return;
    const { ctx, squeal, bandA, bandB, brake, judder, scrape, rasp } = this.n;
    const speed = tel.speed || 0;
    const on = active ? clamp((speed - 2) / 3, 0, 1) : 0;

    const slipWork = ramp(tel.slip || 0, T.slip);
    const loadWork = ramp(Math.abs(tel.latAccel || 0), T.gripG);
    const work = clamp(slipWork + 0.55 * loadWork * loadWork, 0, 1);
    glide(squeal.gain, on * T.squealGain * work ** 1.3, ctx);
    glide(bandA.frequency, T.squealHz[0] * (1 + 0.12 * slipWork), ctx, 0.1);
    glide(bandB.frequency, T.squealHz[1] * (1 + 0.08 * slipWork), ctx, 0.1);

    const fwd = Math.abs(tel.forwardSpeed || 0);
    const decel = clamp(-(tel.longAccel || 0), 0, 30);
    const bite = (tel.brake || 0) > 0.05 && fwd > 3 ? ramp(decel, T.brakeDecel) * (tel.brake || 0) : 0;
    glide(brake.gain, on * T.brakeGain * bite * clamp(fwd / 8, 0, 1), ctx, 0.04);
    glide(judder.osc.frequency, T.judderHz * (0.7 + 0.3 * clamp(fwd / 14, 0, 1)), ctx, 0.1);

    const grind = this._scrape > 0 && active ? clamp(speed / 10, 0.2, 1) : 0;
    glide(scrape.gain, T.scrapeGain * grind, ctx, 0.03);
    glide(rasp.osc.frequency, 18 + Math.random() * 30, ctx, 0.02);
  }
}
