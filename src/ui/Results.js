// Chequered-flag card: your finishing position and the classification, filled in live as the
// rest of the field crosses the line.

import { el, refs, setText } from './dom.js';
import { formatTime, formatGap, ordinal } from './format.js';

const VERDICT = ['', 'VICTORY', 'SECOND PLACE', 'PODIUM', 'SOLID DRIVE', 'KEEP PUSHING', 'BACK OF THE FIELD'];

export class Results {
  constructor(onAction) {
    this.el = el(
      'div',
      'screen screen-results',
      `<div class="res-card">
         <div class="title-kicker">CHEQUERED FLAG</div>
         <h2 data-ref="place">–</h2>
         <div class="res-verdict" data-ref="verdict"></div>
         <table><thead><tr><th>POS</th><th>DRIVER</th><th>TIME</th><th>BEST LAP</th></tr></thead>
           <tbody data-ref="rows"></tbody></table>
         <div class="res-actions">
           <button class="btn btn-primary" data-act="start">RACE AGAIN <kbd>ENTER</kbd></button>
           <button class="btn" data-act="nextTrack">NEXT TRACK <kbd>N</kbd></button>
           <button class="btn" data-act="quit">MENU <kbd>ESC</kbd></button>
         </div>
       </div>`,
    );
    document.body.appendChild(this.el);
    this.r = refs(this.el);
    for (const b of this.el.querySelectorAll('[data-act]')) b.addEventListener('click', () => onAction(b.dataset.act));
    this._key = '';
  }

  show(visible) {
    this.el.classList.toggle('is-visible', visible);
    this._key = '';
  }

  update(field) {
    const me = field.player;
    const place = field.position(me);
    const key = field.order.map((e) => `${e.code}${e.finishTime}`).join();
    if (key === this._key) return;
    this._key = key;
    setText(this.r.place, ordinal(place));
    this.r.place.className = place <= 3 ? `is-p${place}` : '';
    setText(this.r.verdict, VERDICT[place] ?? '');
    const lead = field.order[0];
    this.r.rows.replaceChildren(
      ...field.order.map((e, i) => {
        const tr = el('tr', e.isPlayer ? 'is-player' : '');
        const time = e.finishTime === null ? 'RUNNING' : i === 0 ? formatTime(e.finishTime) : formatGap(e.finishTime - lead.finishTime);
        tr.innerHTML = `<td>${i + 1}</td><td><em></em></td><td>${time}</td><td>${formatTime(e.bestLap)}</td>`;
        const name = tr.children[1];
        name.firstChild.style.background = `#${e.color.toString(16).padStart(6, '0')}`;
        name.append(e.name);
        return tr;
      }),
    );
  }
}
