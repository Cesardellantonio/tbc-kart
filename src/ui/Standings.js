// Timing tower (Grand Prix): your position, then every driver in running order with the gap to
// the leader. Rows are rebuilt only when the order changes; gaps update in place.

import { el, setText } from './dom.js';
import { formatGap, formatTime } from './format.js';

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
    const order = this._visible(field.order);
    const rank = (e) => field.order.indexOf(e); // 0-based place in the whole field
    const key = order.map((e) => `${e.code}${rank(e)}`).join();
    if (key !== this._key) {
      this._key = key;
      this._rows = order.map((e) => {
        const li = el('li', e.isPlayer ? 'is-player' : '');
        li.innerHTML = `<i>${rank(e) + 1}</i><em></em><span></span><b></b>`;
        li.children[1].style.background = `#${e.color.toString(16).padStart(6, '0')}`;
        li.children[2].textContent = e.code;
        return li;
      });
      this.list.replaceChildren(...this._rows);
    }
    order.forEach((e, row) => {
      const i = rank(e);
      if (field.timed) { // qualifying: best laps, gaps to the fastest
        setText(this._rows[row].children[3], e.bestLap === null ? 'NO TIME' : i === 0 ? formatTime(e.bestLap) : formatGap(field.gap(e, clock)));
        return;
      }
      const gap = i === 0 ? (e.finishTime !== null ? 'FINISH' : `LAP ${Math.min(field.laps, Math.max(1, e.timer.lap))}`) : formatGap(field.gap(e, clock));
      setText(this._rows[row].children[3], e.finishTime !== null && i > 0 ? `${gap} ⚑` : gap);
    });
    setText(this.pos, `P${field.position(field.player)}`);
    setText(this.of, `/ ${field.order.length}`);
  }

  // Short screens (a phone on its side) show the leader and the drivers around you: all twelve would
  // run down into the touch pads.
  _visible(order) {
    const max = typeof window !== 'undefined' && window.innerHeight < 520 ? 6 : order.length;
    if (order.length <= max) return order;
    const me = Math.max(0, order.findIndex((e) => e.isPlayer));
    const from = Math.min(Math.max(1, me - Math.floor((max - 1) / 2)), order.length - (max - 1));
    return [order[0], ...order.slice(from, from + max - 1)];
  }
}
