// Procedural surface textures: polished concrete floor, track asphalt, corrugated wall panels.

import { makeCanvas, blotches, speckle, grain, toTexture } from './canvas.js';

export function concreteTexture() {
  const S = 1024;
  const { canvas, ctx } = makeCanvas(S, S);
  ctx.fillStyle = '#74767b';
  ctx.fillRect(0, 0, S, S);
  blotches(ctx, S, S, { count: 70, minR: 60, maxR: 260, alpha: 0.07, seed: 11 });
  blotches(ctx, S, S, { count: 160, minR: 10, maxR: 60, alpha: 0.05, seed: 12 });
  speckle(ctx, S, S, { count: 7000, color: 'rgba(40,42,46,0.35)', minR: 0.5, maxR: 1.5, seed: 13 });
  speckle(ctx, S, S, { count: 2500, color: 'rgba(200,202,206,0.25)', minR: 0.5, maxR: 1.2, seed: 14 });
  grain(ctx, S, S, 14, 15);
  // Saw-cut joint between slabs (drawn on two edges → a grid once the texture repeats)
  ctx.fillStyle = 'rgba(30,31,34,0.85)';
  ctx.fillRect(0, 0, S, 3);
  ctx.fillRect(0, 0, 3, S);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, 3, S, 1);
  ctx.fillRect(3, 0, 1, S);
  return toTexture(canvas);
}

// u runs along the track (canvas x), v across it (canvas y).
export function asphaltTexture() {
  const W = 512;
  const H = 512;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = '#3d4047';
  ctx.fillRect(0, 0, W, H);
  blotches(ctx, W, H, { count: 40, minR: 30, maxR: 140, alpha: 0.06, seed: 21 });
  speckle(ctx, W, H, { count: 9000, color: 'rgba(120,124,132,0.35)', minR: 0.4, maxR: 1.1, seed: 22 });
  speckle(ctx, W, H, { count: 5000, color: 'rgba(15,16,18,0.4)', minR: 0.4, maxR: 1.2, seed: 23 });
  grain(ctx, W, H, 18, 24);
  // Faint general wear down the middle (the real racing line is world/RubberLine.js)
  const band = ctx.createLinearGradient(0, 0, 0, H);
  band.addColorStop(0.18, 'rgba(0,0,0,0)');
  band.addColorStop(0.5, 'rgba(0,0,0,0.08)');
  band.addColorStop(0.82, 'rgba(0,0,0,0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, W, H);
  return toTexture(canvas);
}

// One 4 m wide × 10 m tall wall section: kick plate, accent stripe, ribbed metal cladding.
export function wallTexture(accent = '#d7263d') {
  const W = 512;
  const H = 1280;
  const px = H / 10; // pixels per metre
  const { canvas, ctx } = makeCanvas(W, H);
  const ribs = 8;
  for (let i = 0; i < ribs; i++) {
    const x = (i * W) / ribs;
    const g = ctx.createLinearGradient(x, 0, x + W / ribs, 0);
    g.addColorStop(0, '#4a5059');
    g.addColorStop(0.45, '#6b727d');
    g.addColorStop(0.55, '#5a616b');
    g.addColorStop(1, '#434851');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, W / ribs, H);
  }
  blotches(ctx, W, H, { count: 30, minR: 40, maxR: 200, alpha: 0.08, seed: 31 });
  grain(ctx, W, H, 10, 32);
  ctx.fillStyle = '#16181c'; // kick plate: bottom 1.4 m
  ctx.fillRect(0, H - 1.4 * px, W, 1.4 * px);
  ctx.fillStyle = accent; // accent stripe
  ctx.fillRect(0, H - 1.85 * px, W, 0.45 * px);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(0, H - 1.95 * px, W, 0.06 * px);
  return toTexture(canvas);
}
