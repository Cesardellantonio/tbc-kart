// The karts other people drive in this online race (other humans, and on a client the host's AI too),
// by roster id. Models are kept from race to race while the same driver keeps the same look, and
// disposed once nobody needs them; tyre-smoke / skid-mark effects are lent from a small reusable set.

import { KartFx } from '../fx/KartFx.js';
import { RemoteKart, lookKey } from './RemoteKart.js';

export class RemotePool {
  constructor(scene) {
    this.scene = scene;
    this.karts = new Map(); // roster id → RemoteKart
    this.spareFx = [];
  }

  // entries: the roster entries driven elsewhere; spots: id → grid spot { x, z, yaw, i }.
  setRoster(entries, spots) {
    const wanted = new Map(entries.map((e) => [e.id, e]));
    for (const [id, rk] of this.karts) {
      const entry = wanted.get(id);
      if (!entry || lookKey(entry) !== rk.key) this.remove(id);
    }
    for (const entry of entries) {
      if (!this.karts.has(entry.id)) {
        const fx = this.spareFx.pop() ?? new KartFx(this.scene);
        this.karts.set(entry.id, new RemoteKart(this.scene, entry, fx));
      }
      this.karts.get(entry.id).place(spots.get(entry.id));
    }
  }

  get list() {
    return [...this.karts.values()];
  }

  get(id) {
    return this.karts.get(id);
  }

  // states: NetRace.remoteStates() — each kart at its render time. A kart not heard from yet stays on
  // its grid spot. fx needs the camera (particle size).
  draw(states, dt, camera, viewportHeight) {
    for (const [id, rk] of this.karts) {
      const st = states.get(id);
      if (st) rk.draw(st, dt);
      rk.fx.update(rk.kart, dt, camera, viewportHeight);
    }
  }

  remove(id) {
    const rk = this.karts.get(id);
    if (!rk) return;
    this.karts.delete(id);
    rk.dispose(this.scene);
    rk.fx.reset();
    this.spareFx.push(rk.fx);
  }

  clear() {
    for (const id of [...this.karts.keys()]) this.remove(id);
  }
}
