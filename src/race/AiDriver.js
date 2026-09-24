// Rival driver: pure-pursuit along a racing line, corner speed from curvature, pulls out to pass
// slower karts, backs off when boxed in, and asks for a reset when stuck against a wall.

import { AUTOPILOT, AI } from '../config/race.js';
import { clamp, damp, wrapAngle, yawFromDirection } from '../core/math.js';

const IDLE = { throttle: 0, brake: 0, steer: 0, handbrake: false };

export class AiDriver {
  // profile: { skill, line, react } (see config/race.js RIVALS)
  constructor(path, line, profile) {
    this.profile = profile;
    this.setTrack(path, line);
  }

  // path: TrackPath; line: racing-line offsets for it (race/racingLine.js).
  setTrack(path, line) {
    Object.assign(this, { path, line });
    this.reset();
  }

  reset() {
    this.index = -1;
    this.pass = 0; // current sideways offset for traffic (m)
    this.stuck = 0;
    this.wait = this.profile.react + Math.random() * 0.12; // reaction time after the lights
    this.form = 1 + (Math.random() - 0.5) * AI.formSpread; // good days and bad days
  }

  // traffic: [{ ahead (m along the track), lateral (m), speed }] for the other karts.
  // pace: skill multiplier for this frame (pack pull); go: false holds the kart on the grid.
  controls(state, speed, traffic, pace, dt, go = true) {
    if (!go) return IDLE;
    if ((this.wait -= dt) > 0) return IDLE;
    const p = this.path;
    this.index = p.nearest(state.x, state.z, this.index);
    const myLat = p.lateral(state.x, state.z, this.index);
    const skill = this.profile.skill * pace * this.form;

    // Traffic: pull out beside the closest slower kart ahead; follow it if there's no room.
    let passWant = 0;
    let speedCap = Infinity;
    for (const o of traffic) {
      if (o.ahead <= 0.5 || o.ahead > AI.sightAhead || Math.abs(o.lateral - myLat) > 1.6) continue;
      if (o.speed < speed + 1.5) passWant = o.lateral > myLat ? -AI.passOffset : AI.passOffset;
      if (o.ahead < 3.4 && Math.abs(o.lateral - myLat) < 1.3) speedCap = Math.min(speedCap, o.speed - 0.4);
    }
    this.pass = damp(this.pass, passWant, AI.offsetRate, dt);

    const look = Math.round((AUTOPILOT.lookAhead + speed * 0.3) / p.spacing);
    const t = p.wrap(this.index + look);
    const lat = clamp(this.line[t] + this.profile.line + this.pass, -p.halfWidth + 0.85, p.halfWidth - 0.85);
    const aim = p.offset(t, lat);
    const error = wrapAngle(yawFromDirection(aim.x - state.x, aim.z - state.z) - state.yaw);

    let k = 0;
    const span = Math.round((8 + speed * 1.4) / p.spacing);
    for (let d = 0; d < span; d += 3) k = Math.max(k, Math.abs(p.curvature[p.wrap(this.index + d)]));
    const corner = Math.sqrt((AUTOPILOT.latAccel * skill) / Math.max(k, 1e-4));
    const want = Math.min(clamp(corner, AUTOPILOT.minSpeed, AUTOPILOT.maxSpeed * skill), speedCap);

    this.stuck = speed < 1 ? this.stuck + dt : 0;
    return {
      throttle: speed < want ? 1 : 0,
      brake: speed > want + 1.2 ? 1 : 0,
      steer: clamp(error * 2.4, -1, 1),
      handbrake: false,
      reset: this.stuck > AI.stuckTime,
    };
  }
}
