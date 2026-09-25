// Rival engines: the two karts nearest the listener each get an engine voice, fading with distance.
// Every rival keeps its own rpm model, stepped each frame whether voiced or not, and a voice stays
// with its kart while that kart is still among the nearest, so voices never trade karts mid-sound
// (which fed one kart's revs into another's model: pitch sweeps and false overrun pops).

import { EngineSound } from './EngineSound.js';
import { EngineRpm } from './engineRpm.js';
import { PACK } from '../config/audio.js';

const SILENT = { speed: 0, forwardSpeed: 0, slip: 0, sliding: false };

export class PackSound {
  constructor(audio) {
    this.voices = PACK.pitches.map((p) => new EngineSound(audio, p));
    this.bound = this.voices.map(() => null); // kart each voice is following
    this._models = new WeakMap();
  }

  model(kart) {
    return this._track(kart).rpm;
  }

  _track(kart) {
    let t = this._models.get(kart);
    if (!t) this._models.set(kart, (t = { rpm: new EngineRpm(), x: kart.state.x, z: kart.state.z }));
    return t;
  }

  // Step a kart's own rpm model; a kart that jumped (placed on the grid, reset onto the track)
  // starts again from idle rather than carrying the revs it had somewhere else.
  _step(k, dt) {
    const t = this._track(k);
    if (Math.hypot(k.state.x - t.x, k.state.z - t.z) > PACK.teleport) t.rpm.reset();
    [t.x, t.z] = [k.state.x, k.state.z];
    t.rpm.step(k.telemetry, k.telemetry.throttle, dt);
  }

  // listener: {x, z}; karts: rival Kart objects on track (may be empty).
  update(listener, karts, dt, active) {
    const near = karts.map((k) => {
      this._step(k, dt);
      const d = Math.hypot(k.state.x - listener.x, k.state.z - listener.z);
      return { k, d, rank: d - (this.bound.includes(k) ? PACK.hold : 0) }; // incumbents hold on a little
    });
    const chosen = near.sort((a, b) => a.rank - b.rank).slice(0, this.voices.length);
    const keep = this.bound.map((k) => chosen.find((n) => n.k === k) ?? null);
    const free = chosen.filter((n) => !keep.includes(n));
    this.voices.forEach((voice, i) => {
      const n = keep[i] ?? free.shift();
      const jump = (n?.k ?? null) !== this.bound[i];
      this.bound[i] = n?.k ?? null;
      if (!n) return voice.update(SILENT, 0, dt, false);
      const volume = Math.max(0, 1 - n.d / PACK.hear) ** 1.6 * 0.75;
      voice.render(this.model(n.k), dt, active && volume > 0, volume, jump);
    });
  }
}
