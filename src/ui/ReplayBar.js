// Replay controls along the bottom: time and a seek bar, back / play-pause / forward, speed, camera,
// the driver being watched (◀ ▶, or the director's pick) and EXIT. Keys in the hints.

import { el, refs, setText } from './dom.js';

const clock = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

export class ReplayBar {
  constructor(onAction) {
    this.el = el(
      'div',
      'replay-bar',
      `<div class="rp-top"><b class="rp-tag">REPLAY</b><span data-ref="driver"></span><em data-ref="director">DIRECTOR</em><span class="rp-time" data-ref="time"></span></div>
       <div class="rp-track" data-ref="track"><i data-ref="fill"></i></div>
       <div class="rp-buttons">
         <button data-act="back" title="Back 5 s">« 5s <kbd>←</kbd></button>
         <button data-act="pause" data-ref="play">❚❚ <kbd>K</kbd></button>
         <button data-act="fwd" title="Forward 5 s">5s » <kbd>→</kbd></button>
         <button data-act="slower">− <kbd>[</kbd></button><span class="rp-speed" data-ref="speed">1×</span><button data-act="faster">+ <kbd>]</kbd></button>
         <button data-act="cam" data-ref="cam">TV <kbd>C</kbd></button>
         <button data-act="prev">◀ <kbd>↑</kbd></button><button data-act="next">▶ <kbd>↓</kbd></button>
         <button data-act="director">AUTO <kbd>A</kbd></button>
         <button class="rp-exit" data-act="exit">EXIT <kbd>ESC</kbd></button>
       </div>`,
    );
    this.el.hidden = true;
    document.body.appendChild(this.el);
    this.r = refs(this.el);
    for (const b of this.el.querySelectorAll('[data-act]')) b.addEventListener('click', () => onAction(b.dataset.act));
    this.r.track.addEventListener('pointerdown', (e) => {
      const box = this.r.track.getBoundingClientRect();
      onAction('seek', Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)));
    });
  }

  show(visible) {
    this.el.hidden = !visible;
  }

  update({ t, end, speed, paused, cam, driver, auto }) {
    setText(this.r.time, `${clock(t)} / ${clock(end)}`);
    this.r.fill.style.width = `${end ? (100 * t) / end : 0}%`;
    setText(this.r.speed, `${speed}×`);
    this.r.play.firstChild.textContent = paused ? '▶ ' : '❚❚ ';
    this.r.cam.firstChild.textContent = `${cam} `;
    setText(this.r.driver, driver.toUpperCase());
    this.r.director.hidden = !auto;
  }
}
