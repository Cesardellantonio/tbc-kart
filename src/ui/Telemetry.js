// Live telemetry, as sim-racing overlays show it (T key): the last seconds of throttle, brake, steering
// and speed as traces; a g-g diagram (lateral × longitudinal g) with a fading trail; and the four
// contact patches — bar height = the load each carries, colour = its axle's tyre temperature.

import { el } from './dom.js';
import { TELEMETRY } from '../config/input.js';

const G = 9.81;
const W = 424;
const H = 132;
const TRACE = 230; // px of trace
const SAMPLES = Math.round(TELEMETRY.seconds * 60);

// Tyre temperature → colour: cold blue, working green, hot red (°C window as config/physics.js).
function tempColour(t) {
  const [cold, ideal, hot] = TELEMETRY.temps;
  if (t < ideal) {
    const u = Math.max(0, Math.min(1, (t - cold) / (ideal - cold)));
    return `rgb(${Math.round(60 + 20 * u)},${Math.round(140 + 80 * u)},${Math.round(255 - 170 * u)})`;
  }
  const u = Math.max(0, Math.min(1, (t - ideal) / (hot - ideal)));
  return `rgb(${Math.round(80 + 175 * u)},${Math.round(220 - 160 * u)},${Math.round(85 - 30 * u)})`;
}

export class Telemetry {
  constructor(parent) {
    this.el = el('div', 'hud-panel hud-telemetry');
    this.canvas = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    [this.canvas.width, this.canvas.height] = [W * dpr, H * dpr];
    this.canvas.style.width = `${W}px`;
    this.canvas.style.height = `${H}px`;
    this.g = this.canvas.getContext('2d');
    this.g.scale(dpr, dpr);
    this.el.appendChild(this.canvas);
    parent.appendChild(this.el);
    this.buf = { thr: new Float32Array(SAMPLES), brk: new Float32Array(SAMPLES), str: new Float32Array(SAMPLES), spd: new Float32Array(SAMPLES), lat: new Float32Array(SAMPLES), lon: new Float32Array(SAMPLES) };
    this.head = 0;
    this.visible = false;
    this.el.hidden = true;
  }

  setVisible(on) {
    this.visible = on;
    this.el.hidden = !on;
  }

  // Sample every frame (cheap) so the traces are full the moment the panel opens; draw only when shown.
  update(t) {
    const b = this.buf;
    const i = this.head;
    b.thr[i] = t.throttle || 0;
    b.brk[i] = t.brake || 0;
    b.str[i] = t.steer || 0;
    b.spd[i] = t.speed || 0;
    b.lat[i] = (t.latAccel || 0) / G;
    b.lon[i] = (t.longAccel || 0) / G;
    this.head = (i + 1) % SAMPLES;
    if (this.visible) this._draw(t);
  }

  _draw(t) {
    const g = this.g;
    const b = this.buf;
    g.clearRect(0, 0, W, H);
    // Traces
    const top = 10;
    const h = H - 26;
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    g.lineWidth = 1;
    for (const f of [0, 0.5, 1]) {
      g.beginPath();
      g.moveTo(0, top + h * f);
      g.lineTo(TRACE, top + h * f);
      g.stroke();
    }
    const line = (arr, colour, map, width = 1.6) => {
      g.strokeStyle = colour;
      g.lineWidth = width;
      g.beginPath();
      for (let k = 0; k < SAMPLES; k++) {
        const v = arr[(this.head + k) % SAMPLES];
        const x = (k / (SAMPLES - 1)) * TRACE;
        const y = top + h * (1 - map(v));
        if (k) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
    };
    line(b.spd, 'rgba(160,190,255,0.55)', (v) => Math.min(1, v / TELEMETRY.speedFull), 1.2);
    line(b.str, 'rgba(255,255,255,0.85)', (v) => 0.5 + v * 0.5);
    line(b.brk, '#ff4d5e', (v) => v);
    line(b.thr, '#2bd97c', (v) => v);
    g.font = '600 10px Chakra Petch, sans-serif';
    g.fillStyle = 'rgba(200,210,230,0.75)';
    g.fillText(`THR ${Math.round((t.throttle || 0) * 100)}  BRK ${Math.round((t.brake || 0) * 100)}  STR ${Math.round((t.steer || 0) * 100)}`, 0, H - 4);

    // g-g diagram
    const cx = TRACE + 64;
    const cy = 48;
    const R = 38;
    const scale = R / TELEMETRY.gFull;
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    for (const f of [0.5, 1]) {
      g.beginPath();
      g.arc(cx, cy, R * f, 0, Math.PI * 2);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(cx - R, cy);
    g.lineTo(cx + R, cy);
    g.moveTo(cx, cy - R);
    g.lineTo(cx, cy + R);
    g.stroke();
    for (let k = SAMPLES - 60; k < SAMPLES; k++) {
      const j = (this.head + k) % SAMPLES;
      const a = (k - (SAMPLES - 60)) / 60;
      g.fillStyle = `rgba(255,194,26,${0.08 + 0.4 * a})`;
      g.fillRect(cx - b.lat[j] * scale - 1, cy - b.lon[j] * scale - 1, 2, 2);
    }
    const [lx, ly] = [cx - ((t.latAccel || 0) / G) * scale, cy - ((t.longAccel || 0) / G) * scale];
    g.fillStyle = '#ffc21a';
    g.beginPath();
    g.arc(lx, ly, 3.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(200,210,230,0.75)';
    g.fillText(`${(Math.hypot(t.latAccel || 0, t.longAccel || 0) / G).toFixed(2)} g`, cx - 16, cy + R + 12);

    // Contact patches, laid out as the kart (fronts on top): bar = load share (a quarter each at rest,
    // so the box is half full), colour = that axle's tyre temperature
    const loads = t.loads || [0, 0, 0, 0];
    const total = loads.reduce((a, v) => a + Math.max(0, v), 0) || 1;
    const temps = t.tyreTemp || [22, 22];
    const [bw, bh, x0, y0] = [22, 44, W - 64, 12];
    loads.forEach((load, i) => {
      const x = x0 + (i % 2) * (bw + 12);
      const y = y0 + (i < 2 ? 0 : bh + 18);
      const fill = Math.min(1, (Math.max(0, load) / total) * 2) * bh;
      g.fillStyle = 'rgba(255,255,255,0.07)';
      g.fillRect(x, y, bw, bh);
      g.fillStyle = tempColour(temps[i < 2 ? 0 : 1]);
      g.fillRect(x, y + bh - fill, bw, fill);
    });
    g.fillStyle = 'rgba(200,210,230,0.75)';
    g.fillText(`${Math.round(temps[0])}°`, x0 + 10, y0 + bh + 12);
    g.fillText(`${Math.round(temps[1])}°`, x0 + 10, y0 + 2 * bh + 30);
  }
}
