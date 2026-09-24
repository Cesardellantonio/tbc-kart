// Top-down track map (pre-rendered once) with the kart's live position and heading.

import { el } from './dom.js';
import { forwardFromYaw } from '../core/math.js';
import { drawTrackMap } from './trackMap.js';

const W = 240;
const H = 172;
const PAD = 16;

export class Minimap {
  constructor(parent, path, startIndex) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas = el('canvas', 'hud-panel hud-minimap');
    this.canvas.width = W * this.dpr;
    this.canvas.height = H * this.dpr;
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(this.dpr, this.dpr);
    this.bg = document.createElement('canvas');
    this.setPath(path, startIndex);
  }

  // Pre-render the track outline once per track.
  setPath(path, startIndex) {
    this.bg.width = this.canvas.width;
    this.bg.height = this.canvas.height;
    const g = this.bg.getContext('2d');
    g.scale(this.dpr, this.dpr);
    this.map = drawTrackMap(g, path, startIndex, W, H, PAD);
  }

  // others: [{ x, z, color }] rival karts, drawn as dots under your arrow.
  update(state, others = []) {
    const c = this.ctx;
    c.clearRect(0, 0, W, H);
    c.drawImage(this.bg, 0, 0, W, H);
    for (const o of others) {
      const [ox, oy] = this.map(o.x, o.z);
      c.fillStyle = o.color;
      c.beginPath();
      c.arc(ox, oy, 3.6, 0, Math.PI * 2);
      c.fill();
    }
    const [x, y] = this.map(state.x, state.z);
    const f = forwardFromYaw(state.yaw);
    const a = Math.atan2(f.z, f.x);
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.shadowColor = 'rgba(255,194,26,0.9)';
    c.shadowBlur = 10;
    c.fillStyle = '#ffc21a';
    c.beginPath();
    c.moveTo(7, 0);
    c.lineTo(-5, 4.5);
    c.lineTo(-3, 0);
    c.lineTo(-5, -4.5);
    c.closePath();
    c.fill();
    c.restore();
  }
}
