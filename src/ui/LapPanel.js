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
       <div class="hud-rows">
         <span>LAST</span><b data-ref="last">-:--.---</b>
         <span>BEST</span><b data-ref="best" class="is-best">-:--.---</b>
       </div>`,
    );
    parent.appendChild(this.el);
    this.r = refs(this.el);
  }

  update(view) {
    const r = this.r;
    const total = view.mode === 'race' ? `/${view.totalLaps}` : '';
    setText(r.lap, `${view.lap >= 1 ? Math.min(view.lap, view.totalLaps ?? Infinity) : '–'}${total}`);
    setText(r.time, formatTime(view.lapTime));
    setText(r.last, formatTime(view.last));
    setText(r.best, formatTime(view.best));
    setText(r.delta, formatDelta(view.delta));
    r.delta.className = `hud-delta ${view.delta == null ? '' : view.delta <= 0 ? 'is-faster' : 'is-slower'}`;
  }
}
