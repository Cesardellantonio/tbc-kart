// Graphics quality row on the title card (LOW … ULTRA, G key). The pipeline is built at start-up, so a
// change is saved and the page reloads with it (config/graphics.js reads it back).

import { el } from './dom.js';
import { TIERS, QUALITY_ID, GFX_KEY } from '../config/graphics.js';

export class GraphicsPicker {
  constructor(parent, before) {
    this.el = el('div', 'title-level title-gfx', `<span>GRAPHICS</span>${Object.entries(TIERS)
      .map(([id, t]) => `<button data-gfx="${id}" class="${id === QUALITY_ID ? 'is-selected' : ''}">${t.label}</button>`)
      .join('')}<kbd>G</kbd>`);
    parent.insertBefore(this.el, before);
    for (const b of this.el.querySelectorAll('[data-gfx]')) b.addEventListener('click', () => this.pick(b.dataset.gfx));
  }

  // Step to the next tier (G key).
  cycle() {
    const ids = Object.keys(TIERS);
    this.pick(ids[(ids.indexOf(QUALITY_ID) + 1) % ids.length]);
  }

  pick(id) {
    if (id === QUALITY_ID) return;
    try {
      localStorage.setItem(GFX_KEY, id);
    } catch {
      // storage unavailable: the URL below still carries it for this visit
    }
    const url = new URL(window.location.href);
    url.searchParams.set('gfx', id);
    window.location.replace(url.toString());
  }
}
