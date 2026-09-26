// Procedural surface textures: polished concrete floor, track asphalt, corrugated wall panels.

import { makeCanvas, blotches, speckle, grain, toTexture } from './canvas.js';
import { normalFrom, roughnessFrom } from './detail.js';

// None of these depend on the track, so each canvas is drawn once per page and wrapped in a fresh
// texture per track load (a track change disposes its textures, and callers set repeat/anisotropy).
const drawn = new Map();
const canvasOf = (key, draw) => {
  if (!drawn.has(key)) drawn.set(key, draw());
  return drawn.get(key);
};
const cached = (key, draw) => toTexture(canvasOf(key, draw));
// Linear (non-colour) detail maps derived from a colour canvas, also drawn once per page.
const detail = (key, draw) => toTexture(canvasOf(key, draw), { colour: false });

export const concreteTexture = () => cached('concrete', drawConcrete);
export const asphaltTexture = () => cached('asphalt', drawAsphalt);
export const wallTexture = (accent = '#d7263d') => cached(`wall${accent}`, () => drawWall(accent));

// Normal + roughness maps for the same surfaces (high tiers): tile with the colour maps.
export const concreteDetail = () => ({
  normalMap: detail('concreteN', () => normalFrom(canvasOf('concrete', drawConcrete), 1.6, 2)),
  roughnessMap: detail('concreteR', () => roughnessFrom(canvasOf('concrete', drawConcrete), 0.62, 0.22)), // polished where worn light
});
export const asphaltDetail = () => ({
  normalMap: detail('asphaltN', () => normalFrom(canvasOf('asphalt', drawAsphalt), 3.2, 1)), // aggregate stones stand proud
  roughnessMap: detail('asphaltR', () => roughnessFrom(canvasOf('asphalt', drawAsphalt), 0.97, 0.72)),
});
export const wallDetail = (accent = '#d7263d') => ({
  normalMap: detail(`wallN${accent}`, () => normalFrom(canvasOf(`wall${accent}`, () => drawWall(accent)), 5, 2)),
});
export const barrierTexture = () => cached('barrier', drawBarrierScuffs);
export const barrierDetail = () => ({
  roughnessMap: detail('barrierR', () => roughnessFrom(canvasOf('barrier', drawBarrierScuffs), 0.75, 0.4)),
});

// Moulded barrier plastic, white (the instance colour tints it): tyre rubber smeared along the lower
// half where karts lean on it, a few scratches.
function drawBarrierScuffs() {
  const W = 512;
  const H = 256;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  blotches(ctx, W, H, { count: 30, minR: 20, maxR: 90, alpha: 0.05, seed: 41 });
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Grime where karts rub: a darker band near the base, broken up into soft blotches.
  const base = ctx.createLinearGradient(0, H * 0.5, 0, H);
  base.addColorStop(0, 'rgba(30,30,32,0)');
  base.addColorStop(1, 'rgba(30,30,32,0.16)');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  ctx.filter = 'blur(10px)';
  for (let k = 0; k < 14; k++) {
    ctx.fillStyle = `rgba(25,25,28,${0.04 + rnd() * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(rnd() * W, H * (0.62 + rnd() * 0.3), 30 + rnd() * 90, 6 + rnd() * 12, (rnd() - 0.5) * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.filter = 'none';
  grain(ctx, W, H, 8, 42);
  return canvas;
}

function drawConcrete() {
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
  return canvas;
}

// u runs along the track (canvas x), v across it (canvas y).
function drawAsphalt() {
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
  return canvas;
}

// One 4 m wide × 10 m tall wall section: kick plate, accent stripe, ribbed metal cladding.
function drawWall(accent) {
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
  return canvas;
}
