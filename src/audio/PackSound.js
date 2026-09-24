// Rival engines: the two karts nearest the listener each get an engine voice, fading with distance.

import { EngineSound } from './EngineSound.js';

const HEAR = 34; // metres at which a rival engine fades out
const PITCHES = [1.08, 0.93];

export class PackSound {
  constructor(audio) {
    this.voices = PITCHES.map((p) => new EngineSound(audio, p));
  }

  // listener: {x, z}; karts: rival Kart objects on track (may be empty).
  update(listener, karts, dt, active) {
    const near = karts
      .map((k) => ({ k, d: Math.hypot(k.state.x - listener.x, k.state.z - listener.z) }))
      .sort((a, b) => a.d - b.d);
    this.voices.forEach((voice, i) => {
      const n = near[i];
      if (!n) return voice.update(0, 0, dt, false);
      const volume = Math.max(0, 1 - n.d / HEAR) ** 1.6 * 0.75;
      voice.update(n.k.telemetry.speed, n.k.telemetry.throttle, dt, active && volume > 0, volume);
    });
  }
}
