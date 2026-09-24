// Canvas helpers for procedural textures: tileable blotches, speckle, grain, THREE wrapping.

import * as THREE from 'three';
import { seededRandom } from '../../core/math.js';

export function makeCanvas(width, height) {
  const canvas = Object.assign(document.createElement('canvas'), { width, height });
  return { canvas, ctx: canvas.getContext('2d') };
}

// Draws `fn(x, y)` at every wrapped copy of (x, y) that could touch the canvas → seamless tiling.
function wrapped(w, h, x, y, r, fn) {
  for (const px of [x - w, x, x + w]) {
    for (const py of [y - h, y, y + h]) {
      if (px + r > 0 && px - r < w && py + r > 0 && py - r < h) fn(px, py);
    }
  }
}

// Soft light/dark patches that break up flat colour (tileable).
export function blotches(ctx, w, h, { count, minR, maxR, alpha, seed }) {
  const rnd = seededRandom(seed);
  for (let i = 0; i < count; i++) {
    const r = minR + rnd() * (maxR - minR);
    const light = rnd() > 0.5;
    const a = alpha * (0.4 + rnd() * 0.6);
    wrapped(w, h, rnd() * w, rnd() * h, r, (x, y) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, light ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    });
  }
}

// Small aggregate dots (stones in concrete / asphalt).
export function speckle(ctx, w, h, { count, color, minR, maxR, seed }) {
  const rnd = seededRandom(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, minR + rnd() * (maxR - minR), 0, Math.PI * 2);
    ctx.fill();
  }
}

// Per-pixel grey grain.
export function grain(ctx, w, h, amount, seed) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const rnd = seededRandom(seed);
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount;
    [d[i], d[i + 1], d[i + 2]] = [d[i] + n, d[i + 1] + n, d[i + 2] + n]; // Uint8Clamped clamps
  }
  ctx.putImageData(img, 0, 0);
}

export function toTexture(canvas, { repeat = [1, 1], colour = true, anisotropy = 8 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  if (colour) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = anisotropy;
  return tex;
}

// Texture from a canvas drawn by `draw`, redrawn once the web font has loaded
// (canvas text can't wait for CSS fonts, so the first pass uses a fallback font).
export function textTexture(canvas, draw, font = '700 64px "Chakra Petch"') {
  draw();
  const texture = toTexture(canvas);
  document.fonts?.load?.(font).then(() => {
    draw();
    texture.needsUpdate = true;
  });
  return texture;
}
