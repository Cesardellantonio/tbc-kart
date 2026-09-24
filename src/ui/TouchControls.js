// On-screen controls for touch screens: steer pads bottom-left, pedals + drift bottom-right,
// pause / camera up top. Multi-touch: each button tracks its own pointers.

import { el } from './dom.js';

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
    this.held = { left: false, right: false, brake: false, handbrake: false, throttle: false };
    this.el = el('div', 'touch');
    parent.appendChild(this.el);
    for (const [name, cls, label] of HELD) this._held(name, cls, label);
    for (const [name, cls, label] of TAPS) {
      const b = el('button', `touch-btn ${cls}`, label);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        input.trigger(name);
      });
      this.el.appendChild(b);
    }
    document.body.classList.add('is-touch');
    input.touch = this;
  }

  _held(name, cls, label) {
    const b = el('button', `touch-btn ${cls}`, label);
    const pointers = new Set();
    const sync = () => {
      this.held[name] = pointers.size > 0;
      b.classList.toggle('is-down', this.held[name]);
    };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.setPointerCapture?.(e.pointerId);
      pointers.add(e.pointerId);
      sync();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      b.addEventListener(type, (e) => {
        pointers.delete(e.pointerId);
        sync();
      });
    }
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    this.el.appendChild(b);
  }
}
