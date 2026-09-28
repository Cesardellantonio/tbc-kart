// Championship standings card, after each round: the table with this round's points, and the way on
// (the next round, or a new season once the last one is run).

import { el, refs, setText, showScreen } from './dom.js';
import { standings, seasonDone } from '../race/championship.js';
import { ordinal } from './format.js';

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

export class SeasonCard {
  constructor(onAction) {
    this.el = el(
      'div',
      'screen screen-results screen-season',
      `<div class="res-card">
         <div class="title-kicker" data-ref="kicker">CHAMPIONSHIP</div>
         <h2 data-ref="place">–</h2>
         <div class="res-verdict" data-ref="verdict"></div>
         <table><thead><tr><th>POS</th><th>DRIVER</th><th>ROUND</th><th>PTS</th><th>WINS</th></tr></thead>
           <tbody data-ref="rows"></tbody></table>
         <div class="res-actions">
           <button class="btn btn-primary" data-act="raceAgain" data-ref="next">NEXT ROUND <kbd>ENTER</kbd></button>
           <button class="btn" data-act="nextRace" data-ref="fresh">NEW SEASON <kbd>N</kbd></button>
           <button class="btn" data-act="quit">MENU <kbd>ESC</kbd></button>
         </div>
       </div>`,
    );
    document.body.appendChild(this.el);
    this.r = refs(this.el);
    this.el.inert = true;
    this.visible = false;
    for (const b of this.el.querySelectorAll('[data-act]')) b.addEventListener('click', () => onAction(b.dataset.act));
  }

  // season (race/championship.js), scored: { code: points } this round, names: circuit names by round.
  show(visible, season = null, scored = {}, names = []) {
    this.visible = visible;
    showScreen(this.el, visible);
    if (!visible || !season) return;
    const done = seasonDone(season);
    const table = standings(season);
    const place = table.findIndex((d) => d.code === 'YOU') + 1;
    const leader = table[0];
    const me = table[place - 1];
    setText(this.r.kicker, done ? 'CHAMPIONSHIP · FINAL STANDINGS' : `CHAMPIONSHIP · AFTER ROUND ${season.round} / ${season.rounds.length}`);
    setText(this.r.place, done && place === 1 ? 'CHAMPION' : ordinal(place));
    this.r.place.className = place <= 3 ? `is-p${place}` : '';
    const behind = leader.points - me.points;
    setText(
      this.r.verdict,
      place === 1
        ? done ? 'YOU ARE THE CHAMPION' : `LEADING BY ${me.points - (table[1]?.points ?? 0)} PTS`
        : `${behind} PTS BEHIND ${leader.name.toUpperCase()}`,
    );
    setText(this.r.next, '');
    this.r.next.append(done ? 'NEW SEASON ' : `NEXT · ${(names[season.round] ?? '').toUpperCase()} `, Object.assign(document.createElement('kbd'), { textContent: 'ENTER' }));
    this.r.fresh.hidden = done;
    this.r.rows.replaceChildren(
      ...table.map((d, i) => {
        const tr = el('tr', d.code === 'YOU' ? 'is-player' : '');
        const got = scored[d.code];
        tr.innerHTML = `<td>${i + 1}</td><td><em></em></td><td>${got ? `+${got}` : '–'}</td><td><b>${d.points}</b></td><td>${d.wins}</td>`;
        tr.children[1].firstChild.style.background = hex(d.color);
        tr.children[1].append(d.name);
        return tr;
      }),
    );
  }
}
