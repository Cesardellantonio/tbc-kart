// Chequered-flag card: your finishing position and the classification, filled in live as the
// rest of the field crosses the line. Online (setOnline), the host picks what happens next for
// everyone, and the other players wait for that choice. In a championship: after qualifying, the grid
// by best lap (on to the race); after the race, the points each place scores (on to the standings).

import { el, refs, setText, showScreen } from './dom.js';
import { formatTime, formatGap, ordinal } from './format.js';
import { pointsFor } from '../race/championship.js';

const VERDICT = ['', 'VICTORY', 'SECOND PLACE', 'PODIUM', 'SOLID DRIVE', 'KEEP PUSHING', 'BACK OF THE FIELD'];

export class Results {
  constructor(onAction) {
    this.el = el(
      'div',
      'screen screen-results',
      `<div class="res-card">
         <div class="title-kicker" data-ref="kicker">CHEQUERED FLAG</div>
         <h2 data-ref="place">–</h2>
         <div class="res-verdict" data-ref="verdict"></div>
         <table><thead><tr data-ref="head"></tr></thead>
           <tbody data-ref="rows"></tbody></table>
         <div class="res-actions" data-ref="quali" hidden>
           <button class="btn btn-primary" data-act="raceAgain">START THE RACE <kbd>ENTER</kbd></button>
           <button class="btn" data-act="quit">MENU <kbd>ESC</kbd></button>
         </div>
         <div class="res-actions" data-ref="champ" hidden>
           <button class="btn btn-primary" data-act="raceAgain">STANDINGS <kbd>ENTER</kbd></button>
           <button class="btn" data-act="quit">MENU <kbd>ESC</kbd></button>
         </div>
         <div class="res-actions" data-ref="solo">
           <button class="btn btn-primary" data-act="raceAgain">RACE AGAIN <kbd>ENTER</kbd></button>
           <button class="btn" data-act="nextRace">NEXT TRACK <kbd>N</kbd></button>
           <button class="btn" data-act="quit">MENU <kbd>ESC</kbd></button>
         </div>
         <div class="res-actions res-online" data-ref="online" hidden>
           <button class="btn btn-primary host-only" data-act="raceAgain">RACE AGAIN <kbd>ENTER</kbd></button>
           <button class="btn host-only" data-act="nextRace">NEXT TRACK <kbd>N</kbd></button>
           <div class="res-wait client-only">WAITING FOR THE HOST</div>
           <button class="btn" data-act="quit">LEAVE <kbd>ESC</kbd></button>
         </div>
       </div>`,
    );
    document.body.appendChild(this.el);
    this.r = refs(this.el);
    this.el.inert = true;
    for (const b of this.el.querySelectorAll('[data-act]')) b.addEventListener('click', () => onAction(b.dataset.act));
    this._key = '';
  }

  // role: null (single player, the default) | 'host' | 'client'.
  setOnline(role) {
    this.role = role;
    this.r.solo.hidden = !!role;
    this.r.online.hidden = !role;
    this.r.quali.hidden = this.r.champ.hidden = true;
    this.el.firstElementChild.classList.toggle('is-host', role === 'host');
  }

  show(visible) {
    showScreen(this.el, visible);
    this._key = '';
  }

  // mode: the session's ('race', 'quali', 'champ', 'online', …).
  update(field, mode = 'race') {
    const me = field.player;
    const place = field.position(me);
    const key = field.order.map((e) => `${e.code}${e.finishTime}${e.dnf}${e.bestLap}`).join() + field.final + mode;
    if (key === this._key) return;
    this._key = key;
    if (!this.role) {
      this.r.solo.hidden = mode === 'quali' || mode === 'champ';
      this.r.quali.hidden = mode !== 'quali';
      this.r.champ.hidden = mode !== 'champ';
    }
    const head = mode === 'quali' ? ['POS', 'DRIVER', 'BEST LAP', 'GAP'] : ['POS', 'DRIVER', 'TIME', 'BEST LAP', ...(mode === 'champ' ? ['PTS'] : [])];
    this.r.head.innerHTML = head.map((h) => `<th>${h}</th>`).join('');
    setText(this.r.kicker, mode === 'quali' ? 'QUALIFYING' : 'CHEQUERED FLAG');
    if (mode === 'quali') return this._grid(field, place);
    // Online the host's choice waits for the final classification (field.final), so nobody is cut off
    for (const b of this.r.online.querySelectorAll('.host-only')) b.disabled = !field.final;
    setText(this.r.place, ordinal(place));
    this.r.place.className = place <= 3 ? `is-p${place}` : '';
    setText(this.r.verdict, VERDICT[place] ?? '');
    const lead = field.order[0];
    let fastest = null;
    for (const e of field.order) if (e.bestLap != null && (fastest === null || e.bestLap < fastest.bestLap)) fastest = e;
    this.r.rows.replaceChildren(
      ...field.order.map((e, i) => {
        const tr = el('tr', e.isPlayer ? 'is-player' : '');
        // Left the race: DNF. Still lapping when the classification closed: classified laps down, as in real
        // racing. Still lapping before that: running.
        const down = Math.max(1, field.laps - (e.lapsDone ?? 0));
        const running = field.final ? `+${down} LAP${down > 1 ? 'S' : ''}` : 'RUNNING';
        const time = e.dnf ? 'DNF' : e.finishTime === null ? running : i === 0 ? formatTime(e.finishTime) : formatGap(e.finishTime - lead.finishTime);
        const pts = mode === 'champ' ? `<td>${pointsFor(i + 1, e === fastest) || '–'}</td>` : '';
        tr.innerHTML = `<td>${i + 1}</td><td><em></em></td><td>${time}</td><td>${formatTime(e.bestLap)}</td>${pts}`;
        const name = tr.children[1];
        name.firstChild.style.background = `#${e.color.toString(16).padStart(6, '0')}`;
        name.append(e.name);
        return tr;
      }),
    );
  }

  // Qualifying: the grid by best lap, gaps to pole.
  _grid(field, place) {
    const me = field.player;
    setText(this.r.place, me.bestLap == null ? 'NO TIME' : `P${place}`);
    this.r.place.className = place <= 3 && me.bestLap != null ? `is-p${place}` : '';
    setText(this.r.verdict, me.bestLap == null ? 'YOU START FROM THE BACK' : place === 1 ? 'POLE POSITION' : `${ordinal(place)} ON THE GRID`);
    const pole = field.order[0];
    this.r.rows.replaceChildren(
      ...field.order.map((e, i) => {
        const tr = el('tr', e.isPlayer ? 'is-player' : '');
        const gap = e.bestLap == null ? 'NO TIME' : i === 0 ? '–' : formatGap(e.bestLap - pole.bestLap);
        tr.innerHTML = `<td>${i + 1}</td><td><em></em></td><td>${formatTime(e.bestLap)}</td><td>${gap}</td>`;
        tr.children[1].firstChild.style.background = `#${e.color.toString(16).padStart(6, '0')}`;
        tr.children[1].append(e.name);
        return tr;
      }),
    );
  }
}
