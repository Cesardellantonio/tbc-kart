// Rival driver: pure-pursuit along a racing line, speed from a braking plan along that line, pulls
// out to pass slower karts, backs off when boxed in, and asks for a reset when stuck against a wall.

import { AUTOPILOT, AI } from '../config/race.js';
import { clamp, damp } from '../core/math.js';
import { speedControl } from './speedControl.js';
import { drivingPlan, plannedSpeed } from './speedPlan.js';
import { passing, nextInside } from './passing.js';
import { preferredOffset } from './racingLine.js';
import { pursuitSteer } from './pursuit.js';

const IDLE = { throttle: 0, brake: 0, steer: 0, handbrake: false };

export class AiDriver {
  // profile: { skill, line, react } (see config/race.js RIVALS)
  constructor(path, line, profile, trackPace = 1) {
    this.profile = profile;
    this.setTrack(path, line, trackPace);
  }

  // path: TrackPath; line: racing-line offsets for it (race/racingLine.js); trackPace: the circuit's
  // skill multiplier (config/race.js TRACK_PACE), so skill 1 is equally quick on every circuit.
  setTrack(path, line, trackPace = 1) {
    Object.assign(this, { path, line, trackPace, plan: path && drivingPlan(path, line) });
    this.reset();
  }

  // random: source for the start reaction and the race-day form (seedable in the simulator).
  reset(random = Math.random) {
    this.index = -1;
    this.pass = 0; // current sideways offset for traffic (m)
    this.passMemo = { target: -1, side: 0, out: 0, wait: 0 };
    this.stuck = 0;
    this.wait = this.profile.react + random() * 0.12; // reaction time after the lights
    this.form = 1 + (random() - 0.5) * AI.formSpread; // good days and bad days
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

    // Traffic: pull out beside a slower kart ahead (race/passing.js); follow it if there's no room.
    const { pass, speedCap } = passing(this.passMemo, traffic, myLat, speed, dt, nextInside(p, this.index));
    this.pass = damp(this.pass, pass, AI.offsetRate, dt);

    // Aim at the racing line plus my own preferred offset — faded out in corners, so it only changes
    // where I sit on the straights and pace comes from skill alone — plus any pass offset.
    const look = Math.round((AUTOPILOT.lookAhead + speed * AUTOPILOT.lookSpeed) / p.spacing);
    const t = p.wrap(this.index + look);
    const own = preferredOffset(p, this.index, look, this.profile.line);
    const lat = clamp(this.line[t] + own + this.pass, -p.halfWidth + 0.85, p.halfWidth - 0.85);
    const aim = p.offset(t, lat);

    const attack = Math.abs(this.pass) > 1 ? 1 + AI.attack : 1; // alongside a kart: brake later
    const planned = plannedSpeed(this.plan, p, this.index, speed, {
      skill: skill * attack * this.trackPace, // corners and braking; the straights stay flat out
      ahead: AUTOPILOT.planAhead,
      maxSpeed: AUTOPILOT.maxSpeed * skill,
    });
    const want = Math.min(planned, speedCap);
    const steer = pursuitSteer(state, aim, speed);

    this.stuck = speed < 1 ? this.stuck + dt : 0;
    return {
      ...speedControl(speed, want, steer, state.slipAngle),
      steer,
      handbrake: false,
      reset: this.stuck > AI.stuckTime,
    };
  }
}
