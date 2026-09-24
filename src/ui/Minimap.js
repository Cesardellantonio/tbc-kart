// Top-down track map (pre-rendered once) with the kart's live position and heading.

import { el } from './dom.js';
import { forwardFromYaw } from '../core/math.js';

const W = 240;
const H = 172;
const PAD = 16;

export class Minimap {
  constructor(parent, path, startIndex) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas = el('canvas', 'hud-panel hud-minimap');
    this.canvas.width = W * dpr;
    this.canvas.height = H * dpr;
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);

    const xs = Array.from(path.x);
    const zs = Array.from(path.z);
    const [minX, maxX, minZ, maxZ] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    const scale = Math.min((W - 2 * PAD) / (maxX - minX), (H - 2 * PAD) / (maxZ - minZ));
    const ox = (W - (maxX - minX) * scale) / 2;
    const oy = (H - (maxZ - minZ) * scale) / 2;
    this.map = (x, z) => [ox + (x - minX) * scale, oy + (z - minZ) * scale];

    this.bg = document.createElement('canvas');
    this.bg.width = this.canvas.width;
    this.bg.height = this.canvas.height;
    const g = this.bg.getContext('2d');
    g.scale(dpr, dpr);
    g.lineJoin = g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i < path.count; i += 2) g.lineTo(...this.map(path.x[i], path.z[i]));
    g.closePath();
    g.strokeStyle = 'rgba(255,255,255,0.16)';
    g.lineWidth = Math.max(4, path.halfWidth * 2 * scale);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = 1.4;
    g.stroke();
    const [sx, sy] = this.map(path.x[startIndex], path.z[startIndex]);
    g.fillStyle = '#ffffff';
    g.fillRect(sx - 1.5, sy - 5, 3, 10);
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
