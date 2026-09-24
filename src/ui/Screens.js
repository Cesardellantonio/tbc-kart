// Full-screen overlays: the title card (attract mode plays behind it) and the pause card.

import { el, refs, setText } from './dom.js';
import { formatTime } from './format.js';

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

export class Screens {
  constructor(trackLength, best) {
    this.title = el(
      'div',
      'screen screen-title is-visible',
      `<div>
         <div class="title-kicker">INDOOR KART RACING</div>
         <h1 class="title-logo">TBC<span>KART</span></h1>
         <div class="title-meta">VANCOUVER LAYOUT · ${Math.round(trackLength)} M LAP · TIME ATTACK</div>
       </div>
       <div>
         <div class="title-press">PRESS <kbd>ENTER</kbd> TO RACE</div>
         <div class="title-best" data-ref="best"></div>
         <div class="title-controls">${CONTROLS.map(([k, a]) => `<span>${k} ${a}</span>`).join('')}</div>
       </div>`,
    );
    this.pause = el(
      'div',
      'screen screen-pause',
      `<div><h2>PAUSED</h2>
         <p><kbd>ESC</kbd> resume &nbsp; <kbd>R</kbd> restart &nbsp; <kbd>C</kbd> camera &nbsp; <kbd>M</kbd> sound</p></div>`,
    );
    document.body.append(this.title, this.pause);
    this.r = refs(this.title);
    this.setBest(best);
  }

  showTitle(visible) {
    this.title.classList.toggle('is-visible', visible);
  }

  showPause(visible) {
    this.pause.classList.toggle('is-visible', visible);
  }

  setBest(best) {
    setText(this.r.best, best ? `BEST LAP  ${formatTime(best)}` : 'NO LAP TIME YET — SET THE BENCHMARK');
  }
}
