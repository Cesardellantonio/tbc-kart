// HUD root: lap timing, standings, speedometer, minimap, start lights, toasts and touch controls,
// fed by race events.

import { el } from './dom.js';
import { LapPanel } from './LapPanel.js';
import { Speedo } from './Speedo.js';
import { Minimap } from './Minimap.js';
import { StartLights } from './StartLights.js';
import { Toasts } from './Toasts.js';
import { Standings } from './Standings.js';
import { TouchControls, isTouchDevice } from './TouchControls.js';
import { formatTime, formatDelta, ordinal } from './format.js';

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

export class Hud {
  constructor(bus, input) {
    this.root = el('div', 'hud is-hidden');
    document.body.appendChild(this.root);
    this.lap = new LapPanel(this.root);
    this.standings = new Standings(this.root);
    this.speedo = new Speedo(this.root);
    this.minimap = null; // built by setTrack
    this.lights = new StartLights(this.root);
    this.toasts = new Toasts(this.root);
    this.root.appendChild(
      el('div', 'hud-hint', '<kbd>SPACE</kbd> drift &nbsp; <kbd>C</kbd> camera &nbsp; <kbd>R</kbd> reset &nbsp; <kbd>ESC</kbd> pause'),
    );
    if (isTouchDevice()) this.touch = new TouchControls(this.root, input);
    this.mode = 'race';
    this.laps = 5;
    this.visible = false;
    this._dots = []; // rival dots for the minimap, reused frame to frame
    this._minimapShown = true; // false where the CSS hides the minimap (phones): skip drawing it

    bus.on('go', () => this.toasts.show('GO!', { kind: 'go', time: 1.1 }));
    bus.on('lap', (e) => {
      if (this.mode === 'race' && e.lap >= this.laps) return; // the results card takes over
      const sub = e.isBest
        ? e.delta == null ? 'FIRST LAP ON THE BOARD' : `NEW BEST  ${formatDelta(e.delta)}`
        : `LAP ${e.lap}  ${formatDelta(e.delta)}`;
      const final = this.mode === 'race' && e.lap === this.laps - 1;
      this.toasts.show(final ? 'FINAL LAP' : formatTime(e.time), {
        sub: final ? `${formatTime(e.time)}  ·  ${sub}` : sub,
        kind: final ? 'go' : e.isBest ? 'best' : '',
      });
    });
    bus.on('finish', () => this.toasts.show('CHEQUERED FLAG', { kind: 'go', time: 1.6 }));
    bus.on('overtake', (p) => this.toasts.show(`P${p}`, { sub: `UP TO ${ordinal(p)}`, kind: 'info', time: 1 }));
    bus.on('reset', () => this.toasts.show('KART RESET', { kind: 'info', time: 1.2 }));
    bus.on('camera', (view) => this.toasts.show(`CAMERA · ${view.toUpperCase()}`, { kind: 'info', time: 1.2 }));
    bus.on('mute', (muted) => this.toasts.show(muted ? 'SOUND OFF' : 'SOUND ON', { kind: 'info', time: 1.2 }));
  }

  setVisible(visible) {
    this.visible = visible;
    this.root.classList.toggle('is-hidden', !visible);
    if (visible) this.resize();
  }

  clearToasts() {
    this.toasts.clear();
  }

  // Layout changed (and on show): is the minimap on screen at this size? One reflow, not per frame.
  resize() {
    this._minimapShown = !!this.minimap && this.minimap.canvas.offsetParent !== null;
  }

  // New track: redraw the minimap and take its race distance.
  setTrack(path, startIndex, laps) {
    this.laps = laps;
    if (this.minimap) this.minimap.setPath(path, startIndex);
    else this.minimap = new Minimap(this.root, path, startIndex);
  }

  setMode(mode) {
    this.mode = mode;
    this.standings.setVisible(mode === 'race');
  }

  // Nothing to draw while the HUD is hidden (title card, results card).
  update(view, kart, game) {
    if (!this.visible) return;
    const race = this.mode === 'race';
    this.lap.update(view);
    this.speedo.update(kart.telemetry.speed, kart.draft);
    if (race) this.standings.update(game.field, game.session.clock);
    if (this._minimapShown) this.minimap.update(kart.state, this._rivalDots(race ? game.rivals : []));
    this.lights.update(view);
  }

  _rivalDots(rivals) {
    const dots = this._dots;
    dots.length = rivals.length;
    rivals.forEach((r, i) => {
      const d = (dots[i] ??= { x: 0, z: 0, body: -1, color: '' });
      if (d.body !== r.profile.body) [d.body, d.color] = [r.profile.body, hex(r.profile.body)];
      [d.x, d.z] = [r.kart.state.x, r.kart.state.z];
    });
    return dots;
  }
}
