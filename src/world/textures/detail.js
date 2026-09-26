// Detail maps derived from the colour canvases (pure canvas work, done once per page): a tangent-space
// normal map from luminance as height (Sobel, wrapping so it tiles), and a roughness map remapped from
// luminance. They give asphalt its aggregate, the polished floor its patchy sheen, the walls their ribs.

import { makeCanvas } from './canvas.js';

const luminance = (src) => {
  const { width: w, height: h } = src;
  const data = src.getContext('2d').getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
  return { lum, w, h };
};

// strength: how steep the bumps are; blur: box-blur radius (px) of the height first (softer bumps).
export function normalFrom(src, strength = 2, blur = 1) {
  let { lum, w, h } = luminance(src);
  for (let pass = 0; pass < blur; pass++) {
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0;
        for (let d = -1; d <= 1; d++) s += lum[y * w + ((x + d + w) % w)] + lum[((y + d + h) % h) * w + x];
        out[y * w + x] = s / 6;
      }
    }
    lum = out;
  }
  const { canvas, ctx } = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  const at = (x, y) => lum[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Roughness (green channel, as three reads it) from luminance: dark → `dark`, bright → `bright`.
export function roughnessFrom(src, dark, bright) {
  const { lum, w, h } = luminance(src);
  const { canvas, ctx } = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const r = Math.round(255 * Math.min(1, Math.max(0, dark + (bright - dark) * lum[i])));
    img.data.set([r, r, r, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
