// On-screen controls for touch screens: steer pads bottom-left, pedals + drift bottom-right,
// pause / camera up top.
// What is held is recomputed on every touch event from the browser's full list of fingers on the screen
// (TouchEvent.touches) and where each one is now (ui/touchHits.js). Nothing is remembered per finger, so
// a finger sliding between buttons moves the press with it, and a lost "finger up" (an edge swipe, palm
// rejection, a system gesture, an overlay under the finger — phones drop these) cannot leave a button
// stuck: the next touch anywhere carries the true list. Everything also lets go when the page is hidden.
// Browsers without touch events (a mouse, while testing) use pointer events the same way.

import { el } from './dom.js';
import { heldFrom } from './touchHits.js';
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
    this.points = []; // fingers on the screen: [[x, y]]
    this.el = el('div', 'touch');
    parent.appendChild(this.el);
    this.buttons = HELD.map(([name, cls, label]) => ({ name, node: this._button(cls, label) }));
    for (const [name, cls, label] of TAPS) this._button(cls, label).addEventListener('pointerdown', (e) => (e.preventDefault(), input.trigger(name)));

    if ('ontouchstart' in window) {
      const fromTouches = (e) => this._set(Array.from(e.touches, (t) => [t.clientX, t.clientY]));
      for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) window.addEventListener(type, fromTouches, { passive: true });
    } else {
      this._pointers(); // mouse / pen
    }
    const letGo = () => this.releaseAll();
    window.addEventListener('blur', letGo);
    window.addEventListener('pagehide', letGo);
    document.addEventListener('visibilitychange', () => document.hidden && letGo());
    document.body.classList.add('is-touch');
    input.touch = this;
  }

  // Every button lets go (the HUD hides, the page is backgrounded).
  releaseAll() {
    this._set([]);
  }

  _button(cls, label) {
    const node = el('button', `touch-btn ${cls}`, label);
    node.addEventListener('contextmenu', (e) => e.preventDefault());
    this.el.appendChild(node);
    return node;
  }

  // Pointer-event fallback: the same "where are the pointers now" model, keyed by pointer id.
  _pointers() {
    const at = new Map();
    const set = () => this._set([...at.values()]);
    this.el.addEventListener('pointerdown', (e) => (at.set(e.pointerId, [e.clientX, e.clientY]), set()));
    window.addEventListener('pointermove', (e) => at.has(e.pointerId) && (at.set(e.pointerId, [e.clientX, e.clientY]), set()));
    for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, (e) => at.delete(e.pointerId) && set());
  }

  _set(points) {
    this.points = points;
    const rects = this.buttons.map(({ name, node }) => {
      const r = node.getBoundingClientRect();
      return { name, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    });
    const down = heldFrom(points, rects, TOUCH.slop);
    for (const { name, node } of this.buttons) {
      this.held[name] = down.has(name);
      node.classList.toggle('is-down', this.held[name]);
    }
  }
}
