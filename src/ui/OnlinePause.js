// Esc during an online race: nobody else stops, so this is a small card over the running race (no
// blur, no PAUSED title), with RESUME and LEAVE RACE. Its buttons fire the same actions as the
// single-player pause card ('pause' toggles it, 'quit' leaves), so Esc / Q keep working the same.

import { el, showScreen } from './dom.js';

export class OnlinePause {
  constructor(onAction) {
    this.el = el(
      'div',
      'screen screen-online-pause',
      `<div class="op-card">
         <div class="title-kicker op-kicker">ONLINE RACE</div>
         <p>THE RACE GOES ON WITHOUT YOU</p>
         <div class="res-actions">
           <button class="btn btn-primary" data-act="pause">RESUME <kbd>ESC</kbd></button>
           <button class="btn" data-act="quit">LEAVE RACE <kbd>Q</kbd></button>
         </div>
       </div>`
    );
    document.body.appendChild(this.el);
    showScreen(this.el, false);
    for (const b of this.el.querySelectorAll('[data-act]')) {
      b.addEventListener('click', () => onAction(b.dataset.act));
    }
  }

  show(visible) {
    showScreen(this.el, visible);
  }
}
