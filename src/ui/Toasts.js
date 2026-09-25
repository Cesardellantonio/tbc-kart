// Centre-screen announcements: GO!, lap times, new best lap, camera / sound changes.

import { el } from './dom.js';
import { TOAST_TIME } from '../config/race.js';

export class Toasts {
  constructor(parent) {
    this.el = el('div', 'hud-toasts');
    parent.appendChild(this.el);
    this._timers = [];
  }

  // kind: '' | 'go' | 'best' | 'info'
  show(text, { sub = '', kind = '', time = TOAST_TIME } = {}) {
    this._timers.forEach(clearTimeout);
    const toast = el('div', `toast${kind ? ` is-${kind}` : ''}`);
    toast.textContent = text;
    if (sub) toast.appendChild(el('small')).textContent = sub;
    this.el.replaceChildren(toast);
    this._timers = [
      setTimeout(() => toast.classList.add('is-out'), time * 1000),
      setTimeout(() => toast.remove(), time * 1000 + 500),
    ];
  }

  clear() {
    this._timers.forEach(clearTimeout);
    this._timers = [];
    this.el.replaceChildren();
  }
}
