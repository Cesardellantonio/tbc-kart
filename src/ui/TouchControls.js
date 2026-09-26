// On-screen controls for touch screens: steer pads bottom-left, pedals + drift bottom-right,
// pause / camera up top.
// Every finger is tracked on the whole window and mapped to the button under it on each move, so a thumb
// can slide from ◀ to ▶ (or GAS to BRAKE) and the controls follow it; lifting it anywhere — even over an
// overlay that appeared under it — releases what it held, and everything lets go when the page is
// hidden (app switch, notification, lock screen). Holding a button with pointer capture used to keep it
// pressed until that exact finger's "up" reached it, which a slide, an overlay or iOS often swallowed.

import { el } from './dom.js';
import { TOUCH } from '../config/input.js';

const HELD = [
  ['left', 'touch-left', '◀'],
  ['right', 'touch-right', '▶'],
  ['brake', 'touch-brake', 'BRAKE'],
  ['handbrake', 'touch-drift', 'DRIFT'],
  ['throttle', 'touch-gas', 'GAS'],
];
const TAPS = [
  ['pause', 'touch-pause', 'Ⅱ'],
  ['camera', 'touch-camera', 'CAM'],
];

export const isTouchDevice = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);

export class TouchControls {
  constructor(parent, input) {
    this.held = Object.fromEntries(HELD.map(([name]) => [name, false]));
    this.fingers = new Map(); // pointerId → name of the held button under it (or null: off every button)
    this.el = el('div', 'touch');
    parent.appendChild(this.el);
    this.buttons = HELD.map(([name, cls, label]) => ({ name, node: this._button(cls, label) }));
    for (const [name, cls, label] of TAPS) this._button(cls, label).addEventListener('pointerdown', (e) => (e.preventDefault(), input.trigger(name)));

    this.el.addEventListener('pointerdown', (e) => this._down(e));
    window.addEventListener('pointermove', (e) => this._move(e), { passive: true });
    for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, (e) => this._up(e));
    const letGo = () => this.releaseAll();
    window.addEventListener('blur', letGo);
    window.addEventListener('pagehide', letGo);
    document.addEventListener('visibilitychange', () => document.hidden && letGo());
    document.body.classList.add('is-touch');
    input.touch = this;
  }

  // Every button lets go (the HUD hides, the page is backgrounded).
  releaseAll() {
    this.fingers.clear();
    this._sync();
  }

  _button(cls, label) {
    const node = el('button', `touch-btn ${cls}`, label);
    node.addEventListener('contextmenu', (e) => e.preventDefault());
    this.el.appendChild(node);
    return node;
  }

  // The held button at a screen point: inside one (grown by TOUCH.slop px), the nearest centre wins.
  _hit(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const { name, node } of this.buttons) {
      const r = node.getBoundingClientRect();
      const s = TOUCH.slop;
      if (!r.width || x < r.left - s || x > r.right + s || y < r.top - s || y > r.bottom + s) continue;
      const d = (x - (r.left + r.right) / 2) ** 2 + (y - (r.top + r.bottom) / 2) ** 2;
      if (d < bestD) [best, bestD] = [name, d];
    }
    return best;
  }

  _down(e) {
    const name = this._hit(e.clientX, e.clientY);
    if (!name) return; // a tap button, or between buttons
    e.preventDefault();
    this.fingers.set(e.pointerId, name);
    this._sync();
  }

  _move(e) {
    if (!this.fingers.has(e.pointerId)) return;
    const name = this._hit(e.clientX, e.clientY);
    if (name === this.fingers.get(e.pointerId)) return;
    this.fingers.set(e.pointerId, name);
    this._sync();
  }

  _up(e) {
    if (this.fingers.delete(e.pointerId)) this._sync();
  }

  _sync() {
    const down = new Set(this.fingers.values());
    for (const { name, node } of this.buttons) {
      this.held[name] = down.has(name);
      node.classList.toggle('is-down', this.held[name]);
    }
  }
}
