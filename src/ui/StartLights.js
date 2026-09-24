// HUD mirror of the gantry's five start lights (red one by one, then out / green on GO).

import { el } from './dom.js';

export class StartLights {
  constructor(parent) {
    this.el = el('div', 'hud-lights', '<i></i>'.repeat(5));
    parent.appendChild(this.el);
    this.dots = [...this.el.children];
    this._key = '';
  }

  update(view) {
    const key = `${view.state}|${view.lights}|${view.lightsMode}`;
    if (key === this._key) return;
    this._key = key;
    const counting = view.lightsMode === 'red' && view.state !== 'title';
    this.el.classList.toggle('is-visible', counting || view.lightsMode === 'go');
    this.dots.forEach((dot, i) => {
      dot.className = view.lightsMode === 'go' ? 'is-go' : counting && i < view.lights ? 'is-red' : '';
    });
  }
}
