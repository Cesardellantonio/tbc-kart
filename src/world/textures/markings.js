// Small procedural textures: curb stripes, checker, number plate, soft blob, hazard stripes.

import * as THREE from 'three';
import { makeCanvas, toTexture } from './canvas.js';

// One red + one white stripe; u repeats along the curb, v runs across it.
export function curbTexture(red, white) {
  const { canvas, ctx } = makeCanvas(256, 64);
  ctx.fillStyle = red;
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = white;
  ctx.fillRect(128, 0, 128, 64);
  const bevel = ctx.createLinearGradient(0, 0, 0, 64); // fake raised profile
  bevel.addColorStop(0, 'rgba(0,0,0,0.35)');
  bevel.addColorStop(0.25, 'rgba(255,255,255,0.08)');
  bevel.addColorStop(0.75, 'rgba(0,0,0,0)');
  bevel.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = bevel;
  ctx.fillRect(0, 0, 256, 64);
  return toTexture(canvas);
}

export function checkerTexture(cols, rows, cell = 64) {
  const { canvas, ctx } = makeCanvas(cols * cell, rows * cell);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      ctx.fillStyle = (x + y) % 2 ? '#111214' : '#f1f1f1';
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  const tex = toTexture(canvas);
  tex.magFilter = THREE.NearestFilter; // keeps the squares crisp up close
  return tex;
}

export function numberPlateTexture(text) {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#f6f6f6';
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.font = '700 150px "Chakra Petch", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 138);
  return toTexture(canvas);
}

// Radial falloff used for the contact shadow and floor light pools.
export function blobTexture(inner = 'rgba(0,0,0,0.75)') {
  const { canvas, ctx } = makeCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return toTexture(canvas, { colour: false });
}

export function hazardTexture() {
  const { canvas, ctx } = makeCanvas(256, 64);
  ctx.fillStyle = '#16181c';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#f2c230';
  for (let x = -64; x < 256 + 64; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 64);
    ctx.lineTo(x + 32, 64);
    ctx.lineTo(x + 64, 0);
    ctx.lineTo(x + 32, 0);
    ctx.fill();
  }
  return toTexture(canvas);
}
