// Timing tower (Grand Prix): your position, then every driver in running order with the gap to
// the leader. Rows are rebuilt only when the order changes; gaps update in place.

import { el, setText } from './dom.js';
import { formatGap } from './format.js';

export class Standings {
  constructor(parent) {
    this.el = el('div', 'hud-panel hud-standings', '<div class="st-pos"><b>–</b><span>/ –</span></div><ol></ol>');
    parent.appendChild(this.el);
    [this.pos, this.of] = this.el.querySelector('.st-pos').children;
    this.list = this.el.querySelector('ol');
    this._key = '';
    this._rows = [];
  }

  setVisible(visible) {
    this.el.hidden = !visible;
  }

  update(field, clock) {
    const order = field.order;
    const key = order.map((e) => e.code).join();
    if (key !== this._key) {
      this._key = key;
      this._rows = order.map((e, i) => {
        const li = el('li', e.isPlayer ? 'is-player' : '');
        li.innerHTML = `<i>${i + 1}</i><em></em><span></span><b></b>`;
        li.children[1].style.background = `#${e.color.toString(16).padStart(6, '0')}`;
        li.children[2].textContent = e.code;
        return li;
      });
      this.list.replaceChildren(...this._rows);
    }
    order.forEach((e, i) => {
      const gap = i === 0 ? (e.finishTime !== null ? 'FINISH' : `LAP ${Math.min(field.laps, Math.max(1, e.timer.lap))}`) : formatGap(field.gap(e, clock));
      setText(this._rows[i].children[3], e.finishTime !== null && i > 0 ? `${gap} ⚑` : gap);
    });
    setText(this.pos, `P${field.position(field.player)}`);
    setText(this.of, `/ ${order.length}`);
  }
}
