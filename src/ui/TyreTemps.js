// Tyre temperature gauge beside the speedometer: front and rear axle, coloured by the grip window
// (config/physics.js) — blue while cold on the first lap, green in the window, orange to red when cooked.

import { el, setText } from './dom.js';
import { TYRE_OPTIMUM, TYRE_WINDOW } from '../config/physics.js';

const COLD = TYRE_OPTIMUM - TYRE_WINDOW * 0.6; // °C below which the tyres read as cold
const HOT = TYRE_OPTIMUM + TYRE_WINDOW * 0.6; // …above which they read as hot

const tone = (t) => (t < COLD ? 'is-cold' : t > HOT + TYRE_WINDOW ? 'is-cooked' : t > HOT ? 'is-hot' : 'is-good');

export class TyreTemps {
  constructor(parent) {
    this.el = el('div', 'hud-tyres', '<span>TYRES</span><i data-axle="f"><b></b><em>F</em></i><i data-axle="r"><b></b><em>R</em></i>');
    parent.appendChild(this.el);
    this.axles = [...this.el.querySelectorAll('i')];
    this._shown = ['', ''];
  }

  // temps: [front, rear] °C.
  update(temps) {
    if (!temps) return;
    this.axles.forEach((node, k) => {
      const t = Math.round(temps[k]);
      const key = `${t}`;
      if (key === this._shown[k]) return;
      this._shown[k] = key;
      node.className = tone(temps[k]);
      setText(node.firstChild, `${t}°`);
    });
  }
}
