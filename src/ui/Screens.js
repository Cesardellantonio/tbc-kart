// Full-screen overlays: the title card with mode select (attract mode plays behind it), the pause
// card and the results card. Buttons fire the same actions as the keys, so touch works too.

import { el, refs, setText } from './dom.js';
import { formatTime } from './format.js';
import { Results } from './Results.js';
import { RACE_LAPS, RIVALS } from '../config/race.js';

const CONTROLS = [
  ['<kbd>W</kbd><kbd>↑</kbd>', 'throttle'],
  ['<kbd>S</kbd><kbd>↓</kbd>', 'brake · reverse'],
  ['<kbd>A</kbd><kbd>D</kbd>', 'steer'],
  ['<kbd>SPACE</kbd>', 'handbrake drift'],
  ['<kbd>C</kbd>', 'camera'],
  ['<kbd>R</kbd>', 'reset kart'],
  ['<kbd>M</kbd>', 'sound'],
  ['<kbd>ESC</kbd>', 'pause'],
];
const MODES = [
  ['race', 'GRAND PRIX', `${RACE_LAPS} LAPS · ${RIVALS.length} RIVALS · SLIPSTREAM & CONTACT`],
  ['timeattack', 'TIME ATTACK', 'SOLO HOT LAPS · RACE YOUR BEST-LAP GHOST'],
];

export class Screens {
  // onAction(name): fire an input action (start, quit, pause, reset) from a button.
  constructor(trackLength, best, onAction) {
    this.mode = 'race';
    this.title = el(
      'div',
      'screen screen-title is-visible',
      `<div>
         <div class="title-kicker">INDOOR KART RACING</div>
         <h1 class="title-logo">TBC<span>KART</span></h1>
         <div class="title-meta">VANCOUVER LAYOUT · ${Math.round(trackLength)} M LAP</div>
       </div>
       <div>
         <div class="title-modes">${MODES.map(([id, name, sub]) => `<button class="mode" data-mode="${id}"><b>${name}</b><small>${sub}</small></button>`).join('')}</div>
         <div class="title-press"><span class="key-hint">PRESS <kbd>ENTER</kbd> TO RACE · <kbd>←</kbd><kbd>→</kbd> MODE</span><span class="tap-hint">TAP A MODE TO RACE</span></div>
         <div class="title-best" data-ref="best"></div>
         <div class="title-controls">${CONTROLS.map(([k, a]) => `<span>${k} ${a}</span>`).join('')}</div>
       </div>`,
    );
    this.pause = el(
      'div',
      'screen screen-pause',
      `<div><h2>PAUSED</h2>
         <div class="res-actions">
           <button class="btn btn-primary" data-act="pause">RESUME <kbd>ESC</kbd></button>
           <button class="btn" data-act="reset">RESTART <kbd>R</kbd></button>
           <button class="btn" data-act="quit">MENU <kbd>Q</kbd></button>
         </div>
         <p><kbd>C</kbd> camera &nbsp; <kbd>M</kbd> sound</p></div>`,
    );
    document.body.append(this.title, this.pause);
    this.results = new Results(onAction);
    this.r = refs(this.title);
    this.modeButtons = [...this.title.querySelectorAll('[data-mode]')];
    for (const b of this.modeButtons) {
      b.addEventListener('click', () => {
        this.setMode(b.dataset.mode);
        onAction('start');
      });
    }
    for (const b of this.pause.querySelectorAll('[data-act]')) b.addEventListener('click', () => onAction(b.dataset.act));
    this.setMode('race');
    this.setBest(best);
  }

  setMode(mode) {
    this.mode = mode;
    for (const b of this.modeButtons) b.classList.toggle('is-selected', b.dataset.mode === mode);
  }

  cycleMode() {
    this.setMode(this.mode === 'race' ? 'timeattack' : 'race');
  }

  showTitle(visible) {
    this.title.classList.toggle('is-visible', visible);
  }

  showPause(visible) {
    this.pause.classList.toggle('is-visible', visible);
  }

  showResults(visible) {
    this.results.show(visible);
  }

  update(game) {
    if (game.session.state === 'finished') this.results.update(game.field);
  }

  setBest(best) {
    setText(this.r.best, best ? `BEST LAP  ${formatTime(best)}` : 'NO LAP TIME YET — SET THE BENCHMARK');
  }
}
