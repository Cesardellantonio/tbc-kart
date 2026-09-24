// Text-based textures: wall banners, the start/finish sign and the painted infield logo.

import { makeCanvas, textTexture } from './canvas.js';

const FONT = '"Chakra Petch", "Arial Narrow", Impact, sans-serif';
const HAIR_SPACE = String.fromCharCode(8202);

function checkerStrip(ctx, x, y, w, h, cell) {
  for (let i = 0; i * cell < w; i++) {
    for (let j = 0; j * cell < h; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#101114' : '#f2f2f2';
      ctx.fillRect(x + i * cell, y + j * cell, cell, cell);
    }
  }
}

export function bannerTexture({ title, sub, color }) {
  const { canvas, ctx } = makeCanvas(1024, 256);
  return textTexture(canvas, () => {
    const bg = ctx.createLinearGradient(0, 0, 0, 256);
    bg.addColorStop(0, '#1c1f26');
    bg.addColorStop(1, '#0f1115');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = color; // slanted accent block
    ctx.beginPath();
    [[0, 0], [70, 0], [30, 256], [0, 256]].forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `italic 700 118px ${FONT}`;
    ctx.fillText(title, 96, 150);
    ctx.fillStyle = color;
    ctx.font = `600 44px ${FONT}`;
    ctx.fillText(sub.split('').join(HAIR_SPACE), 100, 212);
    checkerStrip(ctx, 896, 0, 128, 256, 32);
  });
}

export function startSignTexture() {
  const { canvas, ctx } = makeCanvas(1024, 160);
  return textTexture(canvas, () => {
    ctx.fillStyle = '#0f1115';
    ctx.fillRect(0, 0, 1024, 160);
    checkerStrip(ctx, 0, 0, 160, 160, 40);
    checkerStrip(ctx, 864, 0, 160, 160, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = `italic 700 92px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START · FINISH', 512, 84);
  });
}

// White paint on transparent: a giant logo on the infield concrete.
export function floorLogoTexture() {
  const { canvas, ctx } = makeCanvas(2048, 512);
  return textTexture(
    canvas,
    () => {
      ctx.clearRect(0, 0, 2048, 512);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `italic 700 330px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TBC KART', 1024, 230);
      ctx.fillStyle = 'rgba(230,57,70,0.95)';
      ctx.fillRect(250, 430, 1548, 26);
    },
    '700 200px "Chakra Petch"',
  );
}
