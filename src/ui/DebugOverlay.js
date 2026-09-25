// Developer overlay (` or F3): frame time, renderer stats, kart telemetry; stats.js panel in dev.

import { el } from './dom.js';

export class DebugOverlay {
  constructor() {
    this.el = el('pre', 'debug');
    document.body.appendChild(this.el);
    this.visible = false;
    this._fps = 60;
    this._stats = null;
  }

  async toggle() {
    this.visible = !this.visible;
    this.el.classList.toggle('is-visible', this.visible);
    if (this.visible && import.meta.env.DEV && !this._stats) {
      const Stats = (await import('stats.js')).default;
      this._stats = new Stats();
      Object.assign(this._stats.dom.style, { left: 'auto', right: '8px', top: 'auto', bottom: '210px' });
      document.body.appendChild(this._stats.dom);
    }
    if (this._stats) this._stats.dom.style.display = this.visible ? 'block' : 'none';
  }

  update(dt, game) {
    this._stats?.update();
    if (!this.visible) return;
    this._fps = 0.92 * this._fps + 0.08 * (1 / Math.max(dt, 1 / 240));
    const t = game.kart.telemetry;
    const s = game.kart.state;
    const info = game.renderer.three.info.render;
    this.el.textContent = [
      `fps      ${this._fps.toFixed(0)}   calls ${info.calls}   tris ${info.triangles}`,
      `state    ${game.session.state}   camera ${game.camera.mode}/${game.camera.view}`,
      `speed    ${(t.speed * 3.6).toFixed(1)} km/h   fwd ${t.forwardSpeed.toFixed(2)} m/s`,
      `slip     ${t.slip.toFixed(2)} m/s   β ${((t.slipAngle * 180) / Math.PI).toFixed(0)}°   drift ${t.drift.toFixed(2)}   ${t.sliding ? 'SLIDING' : ''}`,
      `accel    long ${t.longAccel.toFixed(1)}   lat ${t.latAccel.toFixed(1)} m/s²`,
      `pos      ${s.x.toFixed(1)}, ${s.z.toFixed(1)}   track #${game.trackIndex}`,
    ].join('\n');
  }
}
