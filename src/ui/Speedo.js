// Speedometer: big digital km/h readout inside a 240° arc gauge.

import { el, refs, setText } from './dom.js';

const MAX_KMH = 70;
// Arc from 150° to 390° (clockwise through the top) on a 200×200 viewBox, radius 84.
const ARC = 'M 27.25 142 A 84 84 0 1 1 172.75 142';

export class Speedo {
  constructor(parent) {
    this.el = el(
      'div',
      'hud-speedo',
      `<svg viewBox="0 0 200 180">
         <defs><linearGradient id="speedGrad" x1="0" x2="1">
           <stop offset="0" stop-color="#ffc21a"/><stop offset="1" stop-color="#ff3b4e"/>
         </linearGradient></defs>
         <path class="arc-bg" d="${ARC}" fill="none" stroke-width="10" stroke-linecap="round"/>
         <path class="arc-fg" data-ref="arc" d="${ARC}" fill="none" stroke="url(#speedGrad)"
               stroke-width="10" stroke-linecap="round" pathLength="100" stroke-dasharray="100"
               stroke-dashoffset="100"/>
       </svg>
       <div class="speed-num" data-ref="num">0</div>
       <div class="speed-unit">KM/H</div>
       <div class="speed-draft">SLIPSTREAM</div>`,
    );
    parent.appendChild(this.el);
    this.r = refs(this.el);
    this._shown = -1;
  }

  // draft 0..1: slipstream strength, lights the SLIPSTREAM tag.
  update(speedMs, draft = 0) {
    const drafting = draft > 0.15;
    if (drafting !== this._drafting) {
      this._drafting = drafting;
      this.el.classList.toggle('is-drafting', drafting);
    }
    const kmh = Math.round(speedMs * 3.6);
    if (kmh === this._shown) return;
    this._shown = kmh;
    setText(this.r.num, String(kmh));
    this.r.arc.setAttribute('stroke-dashoffset', String(100 - Math.min(100, (kmh / MAX_KMH) * 100)));
  }
}
