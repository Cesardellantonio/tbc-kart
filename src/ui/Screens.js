// Full-screen overlays: the title card with track + mode select (attract mode plays behind it), the
// pause card and the results card, plus the online lobby and the online race's Esc card. Buttons
// fire the same actions as the keys, so touch works too.

import { el, refs, setText, showScreen } from './dom.js';
import { formatTime } from './format.js';
import { Results } from './Results.js';
import { Lobby } from './Lobby.js';
import { OnlinePause } from './OnlinePause.js';
import { Toasts } from './Toasts.js';
import { drawTrackMap } from './trackMap.js';
import { RIVALS, DIFFICULTY } from '../config/race.js';
import { NOTICE_TIME } from '../config/net.js';

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
  ['race', 'GRAND PRIX', (laps) => `${laps} LAPS · ${RIVALS.length} RIVALS · SLIPSTREAM & CONTACT`],
  ['timeattack', 'TIME ATTACK', () => 'SOLO HOT LAPS · RACE YOUR BEST-LAP GHOST'],
  ['online', 'ONLINE', () => 'RACE FRIENDS · ROOM CODE · UP TO 6 PLAYERS'],
];
const MAP = [168, 112]; // track picker thumbnail, CSS px

export class Screens {
  // onAction(name): fire an input action (start, quit, pause, reset, prevTrack, nextTrack) from a button.
  constructor(onAction) {
    this.mode = 'race';
    this.title = el(
      'div',
      'screen screen-title is-visible',
      `<div>
         <div class="title-kicker">INDOOR KART RACING</div>
         <h1 class="title-logo">TBC<span>KART</span></h1>
         <div class="title-meta" data-ref="meta"></div>
       </div>
       <div>
         <div class="title-track">
           <button class="tt-arrow" data-act="prevTrack" aria-label="Previous track">◀</button>
           <canvas class="tt-map" data-ref="map"></canvas>
           <div class="tt-info">
             <small data-ref="count"></small><b data-ref="name"></b>
             <span data-ref="facts"></span><em data-ref="blurb"></em>
           </div>
           <button class="tt-arrow" data-act="nextTrack" aria-label="Next track">▶</button>
         </div>
         <div class="title-modes">${MODES.map(([id, name]) => `<button class="mode" data-mode="${id}"><b>${name}</b><small data-sub="${id}"></small></button>`).join('')}</div>
         <div class="title-level"><span>RIVALS</span>${Object.entries(DIFFICULTY).map(([id, d]) => `<button data-level="${id}">${d.label}</button>`).join('')}<kbd>L</kbd></div>
         <div class="title-press"><span class="key-hint">PRESS <kbd>ENTER</kbd> TO RACE · <kbd>↑</kbd><kbd>↓</kbd> TRACK · <kbd>←</kbd><kbd>→</kbd> MODE</span><span class="tap-hint">PICK A TRACK · TAP A MODE TO RACE</span></div>
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
    showScreen(this.pause, false);
    this.results = new Results(onAction);
    this.lobby = new Lobby(offlineLobby(this)); // the online layer replaces these with lobby.bind()
    this.onlinePause = new OnlinePause(onAction);
    const layer = el('div', 'hud notice-layer'); // over every card, so it reads on the title too
    document.body.appendChild(layer);
    this.notices = new Toasts(layer);
    this.r = refs(this.title);
    this.modeButtons = [...this.title.querySelectorAll('[data-mode]')];
    for (const b of this.modeButtons) {
      b.addEventListener('click', () => {
        this.setMode(b.dataset.mode);
        onAction('start');
      });
    }
    for (const b of [...this.pause.querySelectorAll('[data-act]'), ...this.title.querySelectorAll('[data-act]')]) {
      b.addEventListener('click', () => onAction(b.dataset.act));
    }
    this.setMode('race');
  }

  // Title card for the selected track: thumbnail map, facts, race distance, saved best lap.
  setTrack(track, path, startIndex, position, count, best) {
    const r = this.r;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    r.map.width = MAP[0] * dpr;
    r.map.height = MAP[1] * dpr;
    const g = r.map.getContext('2d');
    g.scale(dpr, dpr);
    drawTrackMap(g, path, startIndex, MAP[0], MAP[1], 12, { band: 0.22, line: 0.9, minBand: 5 });
    setText(r.count, `TRACK ${position + 1} / ${count}`);
    setText(r.name, track.name.toUpperCase());
    setText(r.facts, `${track.location.toUpperCase()} · ${Math.round(path.length)} M · ${track.laps} LAPS`);
    setText(r.blurb, track.blurb);
    setText(r.meta, track.id === 'tbc' ? 'VANCOUVER HOME TRACK' : `INSPIRED BY ${track.inspiredBy.toUpperCase()}`);
    for (const [id, , sub] of MODES) setText(this.title.querySelector(`[data-sub="${id}"]`), sub(track.laps));
    this.setBest(best);
  }

  // Rival level buttons: onLevel(id) is called on a click; cycleLevel() steps through them (L key).
  bindLevels(level, onLevel) {
    this.levelButtons = [...this.title.querySelectorAll('[data-level]')];
    for (const b of this.levelButtons) b.addEventListener('click', () => onLevel(this.setLevel(b.dataset.level)));
    this.setLevel(level);
  }

  setLevel(level) {
    this.level = level;
    for (const b of this.levelButtons) b.classList.toggle('is-selected', b.dataset.level === level);
    return level;
  }

  cycleLevel() {
    const ids = Object.keys(DIFFICULTY);
    return this.setLevel(ids[(ids.indexOf(this.level) + 1) % ids.length]);
  }

  setMode(mode) {
    this.mode = mode;
    for (const b of this.modeButtons) b.classList.toggle('is-selected', b.dataset.mode === mode);
  }

  // step: +1 (→) or −1 (←) through the modes, wrapping around.
  cycleMode(step = 1) {
    const i = MODES.findIndex(([id]) => id === this.mode);
    this.setMode(MODES[(i + step + MODES.length) % MODES.length][0]);
  }

  // The ONLINE mode, chosen on the title card: the lobby replaces it (the attract race runs on
  // behind). code pre-fills the join field.
  openLobby(code) {
    this.showTitle(false);
    this.lobby.open(code);
  }

  closeLobby() {
    this.lobby.show(false);
    this.showTitle(true);
  }

  showTitle(visible) {
    showScreen(this.title, visible);
  }

  showPause(visible) {
    showScreen(this.pause, visible);
  }

  showOnlinePause(visible) {
    this.onlinePause.show(visible);
  }

  showResults(visible) {
    this.results.show(visible);
  }

  // A short online notice ("MARTA LEFT", "HOST LEFT") that shows over whatever is on screen.
  notify(text, sub = '') {
    this.notices.show(text, { sub, kind: 'info', time: NOTICE_TIME });
  }

  update(game) {
    if (game.session.state === 'finished') this.results.update(game.field);
  }

  setBest(best) {
    setText(this.r.best, best ? `BEST LAP  ${formatTime(best)}` : 'NO LAP TIME YET — SET THE BENCHMARK');
  }
}

// Lobby callbacks until the online layer (app/online.js) binds its own: BACK closes the card.
function offlineLobby(screens) {
  return {
    onBack: () => screens.closeLobby(),
    onLeave: () => screens.lobby.render({ phase: 'choose' }),
  };
}
