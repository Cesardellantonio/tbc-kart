// Timing panel: current lap number and time, live delta to best, last and best laps.

import { el, refs, setText } from './dom.js';
import { formatTime, formatDelta } from './format.js';

export class LapPanel {
  constructor(parent) {
    this.el = el(
      'div',
      'hud-panel hud-lap',
      `<div class="hud-label">LAP<b data-ref="lap">–</b></div>
       <div class="hud-time" data-ref="time">0:00.000</div>
       <div class="hud-delta" data-ref="delta"></div>
       <div class="hud-sectors" data-ref="sectors"><i></i><i></i><i></i></div>
       <div class="hud-rows">
         <span>LAST</span><b data-ref="last">-:--.---</b>
         <span>BEST</span><b data-ref="best" class="is-best">-:--.---</b>
       </div>`,
    );
    parent.appendChild(this.el);
    this.r = refs(this.el);
  }

  // A sector closed: colour its box ('purple' | 'green' | 'yellow') with the time or delta.
  setSector({ sector, colour, time, delta }) {
    const boxes = this.r.sectors.children;
    if (sector === 0) for (const b of boxes) (b.className = ''), (b.textContent = '');
    boxes[sector].className = `is-${colour}`;
    boxes[sector].textContent = delta == null ? time.toFixed(2) : `${delta <= 0 ? '−' : '+'}${Math.abs(delta).toFixed(2)}`;
  }

  clearSectors() {
    for (const b of this.r.sectors.children) (b.className = ''), (b.textContent = '');
  }

  update(view) {
    const r = this.r;
    if (view.mode === 'quali') {
      // Qualifying: the session clock instead of a race distance (the flag once it is out)
      const left = view.timeLeft ?? 0;
      const clock = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
      setText(r.lap, `${view.lap >= 1 ? view.lap : 'OUT'} · ${view.flagged ? 'FLAG ⚑' : clock}`);
    } else {
      const total = view.mode === 'race' || view.mode === 'champ' ? `/${view.totalLaps}` : '';
      setText(r.lap, `${view.lap >= 1 ? Math.min(view.lap, view.totalLaps ?? Infinity) : '–'}${total}`);
    }
    setText(r.time, formatTime(view.lapTime));
    setText(r.last, formatTime(view.last));
    setText(r.best, formatTime(view.best));
    setText(r.delta, formatDelta(view.delta));
    r.delta.className = `hud-delta ${view.delta == null ? '' : view.delta <= 0 ? 'is-faster' : 'is-slower'}`;
  }
}
