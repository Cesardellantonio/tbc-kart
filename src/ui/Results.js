// Chequered-flag card: your finishing position and the classification, filled in live as the
// rest of the field crosses the line. Online (setOnline), the host picks what happens next for
// everyone, and the other players wait for that choice.

import { el, refs, setText, showScreen } from './dom.js';
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
    this.el.firstElementChild.classList.toggle('is-host', role === 'host');
  }

  show(visible) {
    showScreen(this.el, visible);
    this._key = '';
  }

  update(field) {
    const me = field.player;
    const place = field.position(me);
    const key = field.order.map((e) => `${e.code}${e.finishTime}${e.dnf}`).join() + field.final;
    if (key === this._key) return;
    this._key = key;
    // Online the host's choice waits for the final classification (field.final), so nobody is cut off
    for (const b of this.r.online.querySelectorAll('.host-only')) b.disabled = !field.final;
    setText(this.r.place, ordinal(place));
    this.r.place.className = place <= 3 ? `is-p${place}` : '';
    setText(this.r.verdict, VERDICT[place] ?? '');
    const lead = field.order[0];
    this.r.rows.replaceChildren(
      ...field.order.map((e, i) => {
        const tr = el('tr', e.isPlayer ? 'is-player' : '');
        // Left the race: DNF. Still lapping when the classification closed: classified laps down, as in real
        // racing. Still lapping before that: running.
        const down = Math.max(1, field.laps - (e.lapsDone ?? 0));
        const running = field.final ? `+${down} LAP${down > 1 ? 'S' : ''}` : 'RUNNING';
        const time = e.dnf ? 'DNF' : e.finishTime === null ? running : i === 0 ? formatTime(e.finishTime) : formatGap(e.finishTime - lead.finishTime);
        tr.innerHTML = `<td>${i + 1}</td><td><em></em></td><td>${time}</td><td>${formatTime(e.bestLap)}</td>`;
        const name = tr.children[1];
        name.firstChild.style.background = `#${e.color.toString(16).padStart(6, '0')}`;
        name.append(e.name);
        return tr;
      }),
    );
  }
}
