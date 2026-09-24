// HUD root: lap timing, speedometer, minimap, start lights and toasts, fed by race events.

import { el } from './dom.js';
import { LapPanel } from './LapPanel.js';
import { Speedo } from './Speedo.js';
import { Minimap } from './Minimap.js';
import { StartLights } from './StartLights.js';
import { Toasts } from './Toasts.js';
import { formatTime, formatDelta } from './format.js';

export class Hud {
  constructor(path, startIndex, bus) {
    this.root = el('div', 'hud is-hidden');
    document.body.appendChild(this.root);
    this.lap = new LapPanel(this.root);
    this.speedo = new Speedo(this.root);
    this.minimap = new Minimap(this.root, path, startIndex);
    this.lights = new StartLights(this.root);
    this.toasts = new Toasts(this.root);
    this.root.appendChild(
      el('div', 'hud-hint', '<kbd>SPACE</kbd> drift &nbsp; <kbd>C</kbd> camera &nbsp; <kbd>R</kbd> reset &nbsp; <kbd>ESC</kbd> pause'),
    );

    bus.on('go', () => this.toasts.show('GO!', { kind: 'go', time: 1.1 }));
    bus.on('lap', (e) => {
      const sub = e.isBest
        ? e.delta == null ? 'FIRST LAP ON THE BOARD' : `NEW BEST  ${formatDelta(e.delta)}`
        : `LAP ${e.lap}  ${formatDelta(e.delta)}`;
      this.toasts.show(formatTime(e.time), { sub, kind: e.isBest ? 'best' : '' });
    });
    bus.on('reset', () => this.toasts.show('KART RESET', { kind: 'info', time: 1.2 }));
    bus.on('camera', (view) => this.toasts.show(`CAMERA · ${view.toUpperCase()}`, { kind: 'info', time: 1.2 }));
    bus.on('mute', (muted) => this.toasts.show(muted ? 'SOUND OFF' : 'SOUND ON', { kind: 'info', time: 1.2 }));
  }

  setVisible(visible) {
    this.root.classList.toggle('is-hidden', !visible);
  }

  update(view, kart) {
    this.lap.update(view);
    this.speedo.update(kart.telemetry.speed);
    this.minimap.update(kart.state);
    this.lights.update(view);
  }
}
