// Grip of the track surface under each tyre (pure), like a racing sim's "real road": rubber laid down on
// the racing line grips best, dust and marbles off-line grip least, painted kerbs are slippery, and the
// whole hall rubbers in as karts lap it. Built once per track; queried once per kart per frame.

import { SURFACE } from '../config/track.js';
import { smoothstep } from '../core/math.js';

// Wheel offsets in the kart frame [forward, right] in the order the physics uses (FL, FR, RL, RR).
const WHEELS = [
  [0.52, -0.5],
  [0.52, 0.5],
  [-0.52, -0.56],
  [-0.52, 0.56],
];

export class SurfaceGrip {
  // path: TrackPath; line: racing-line offsets (m, + = right); curbs: track/curbTable.
  constructor(path, line, curbs) {
    Object.assign(this, { path, line, curbs });
    this.rubber = SURFACE.rubberStart;
  }

  // Karts lap the track: rubber builds up (distance in metres, all karts together).
  addDistance(metres) {
    this.rubber = Math.min(1, this.rubber + metres / (this.path.length * SURFACE.rubberLaps));
  }

  // Multiplier for one point at lateral offset `lat` (m right of the centreline) near sample i.
  at(i, lat) {
    const S = SURFACE;
    const d = Math.abs(lat - this.line[i]);
    const base = S.green + (1 - S.green) * this.rubber;
    const line = S.lineGain * this.rubber * Math.exp(-((d / S.lineWidth) ** 2));
    const dust = S.dust * smoothstep(S.dustFrom, S.dustFull, d);
    const side = this.curbs.side[i];
    const kerb = side && lat * side >= this.curbs.inner[i] && lat * side <= this.curbs.outer[i] + 0.1 ? S.kerb : 1;
    return base * (1 + line - dust) * kerb;
  }

  // Writes out[0..3] for a kart at state {x, z, yaw}; index: nearest sample to the kart. Returns out.
  wheels(state, index, out) {
    const p = this.path;
    const [fx, fz] = [-Math.sin(state.yaw), -Math.cos(state.yaw)];
    for (let k = 0; k < 4; k++) {
      const [along, across] = WHEELS[k];
      const wx = state.x + fx * along - fz * across;
      const wz = state.z + fz * along + fx * across;
      const ahead = (wx - p.x[index]) * p.tx[index] + (wz - p.z[index]) * p.tz[index];
      const j = p.wrap(index + Math.round(ahead / p.spacing));
      out[k] = this.at(j, p.lateral(wx, wz, j));
    }
    return out;
  }
}
