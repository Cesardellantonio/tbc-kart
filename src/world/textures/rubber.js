// Alpha texture for the rubbered-in racing line (white = most rubber). u runs along the track
// (canvas x), v across it (canvas y): a soft band, two slightly darker tyre tracks, long streaks.

import { makeCanvas, blotches, grain, toTexture } from './canvas.js';
import { seededRandom } from '../../core/math.js';

const W = 512;
const H = 128;
const TRACK_V = 0.3; // tyre tracks at ±0.3 of the band width from its middle
const gauss = (x, s) => Math.exp(-(x * x) / (2 * s * s));

export function rubberTexture() {
  const { canvas, ctx } = makeCanvas(W, H);
  const rnd = seededRandom(41);
  // Per-row streak strength, smoothed a little so streaks are a few pixels wide.
  const raw = Array.from({ length: H }, () => 0.55 + rnd() * 0.45);
  const streak = raw.map((_, y) => (raw[Math.max(0, y - 1)] + raw[y] * 2 + raw[Math.min(H - 1, y + 1)]) / 4);
  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    const edge = Math.sin(Math.PI * v) ** 1.8; // fades to nothing at both edges
    const tracks = gauss(v - 0.5 - TRACK_V, 0.085) + gauss(v - 0.5 + TRACK_V, 0.085);
    const a = Math.min(1, edge * (0.55 + 0.5 * tracks) * streak[y]);
    const c = Math.round(a * 255);
    ctx.fillStyle = `rgb(${c},${c},${c})`;
    ctx.fillRect(0, y, W, 1);
  }
  // Patchy wear along the lap: soft darker (less rubber) and lighter blotches, then fine grain.
  blotches(ctx, W, H, { count: 26, minR: 20, maxR: 70, alpha: 0.28, seed: 42 });
  grain(ctx, W, H, 30, 43);
  return toTexture(canvas, { colour: false });
}
